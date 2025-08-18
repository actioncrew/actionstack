import {
  createReplaySubject,
  createSubject,
  defer,
  first,
  switchMap,
  takeUntil
} from '@actioncrew/streamix';
import {
  ActionCreator,
  FeatureModule,
  isAction,
  Store,
  Streams,
} from '../lib';

function createModule<
  State,
  ActionTypes extends string,
  Actions extends Record<string, ActionCreator<ActionTypes> | ((...args: any[]) => any)>,
  Selectors extends Record<string, (...args: any[]) => (state: State) => any>,
  Dependencies extends Record<string, any> = {}
>(config: {
  slice: string;
  initialState: State;
  actions?: Actions;
  selectors?: Selectors;
  dependencies?: Dependencies;
}) {
  const { slice } = config;
  const pathParts = slice.split('/');

  // Helper to select nested slice
  function selectSlice(rootState: any) {
    return pathParts.reduce((s, key) => (s ? s[key] : undefined), rootState);
  }

  let loaded = false;
  let configured = false;
  const loaded$ = createReplaySubject<void>();
  const destroyed$ = createSubject<void>();

  const processedActions = processActions(config.actions ?? {}, slice, config.dependencies);
  const processedSelectors = processSelectors(config.selectors ?? {}, selectSlice);
  let store: Store<State> | undefined;

  const module = {
    slice,
    initialState: config.initialState,
    actions: {} as Actions, // Will be populated in configure()
    selectors: processedSelectors,
    dependencies: config.dependencies,
    data$: {} as Streams<Selectors>,
    loaded$,
    destroyed$,

    init(storeInstance: Store<State>) {
      storeInstance.loadModule(this);
      return this;
    },

    configure(storeInstance: Store<State>) {
      if (configured) return this;
      configured = true;
      store = storeInstance;
      return this;
    },

    destroy(clearState: boolean = true) {
      if (loaded) {
        loaded = false;
        configured = false;
        destroyed$.next();
        store?.unloadModule(this, clearState);
        store = undefined;
      }
      return this;
    }
  };

  // Initialize data$ streams first
  initializeDataStreams(store, module, processedSelectors, loaded$, destroyed$);

  // Initialize dispatchable actions
  initializeActions(store, module, processedActions, slice);
  
  return module as FeatureModule<State, ActionTypes, Actions, Selectors, Dependencies>;
}

// Helper functions to break down the logic

function processActions<Actions extends Record<string, any>>(
  actions: Actions,
  slice: string,
  dependencies: Record<string, any> = {}
): Actions {
  const processed = {} as Actions;

  for (const [name, action] of Object.entries(actions)) {
    if (isActionCreator(action)) {
      const namespacedType = `${slice}/${action.type}`;
      const namespacedAction = (...args: any[]) => {
        const act = action(...args);
        return {
          ...act,
          type: namespacedType,
        };
      };

      Object.assign(namespacedAction, action, {
        type: namespacedType,
        toString: () => namespacedType,
      });

      (processed as any)[name] = namespacedAction;
    } else {
      let thunkWithType = (...args: any[]) => {
      const thunk = action(...args);
      return Object.assign(
        async (dispatch: any, getState: any, deps: any) => {
          return thunk(dispatch, getState, {
            ...deps,
            ...dependencies,
          });
        },
        {
          type: `${slice}/${name}`,
          isThunk: true,
          toString: () => `${slice}/${name}`,
          match: (action: any) => isAction(action) && action.type === `${slice}/${name}`
        }
      );
    };

    thunkWithType = Object.assign(thunkWithType, {
      type: `${slice}/${action.type}`,
      isThunk: true,
      toString: () => `${slice}/${action.type}`,
      match: (action: any) => isAction(action) && action.type === `${slice}/${name}`,
      triggers: action.triggers?.map((t: string) =>
        t.includes('/') ? t : `${slice}/${t}`
      )
    });

      (processed as any)[name] = thunkWithType;
    }
  }

  return processed;
}

function processSelectors<
  State,
  Selectors extends Record<string, (...args: any[]) => (state: State) => any>
>(
  selectors: Selectors,
  selectSlice: (rootState: any) => State
): Selectors {
  const processed = {} as Selectors;

  for (const [name, selectorFactory] of Object.entries(selectors)) {
    (processed as any)[name] = (...args: any[]) => {
      const baseSelector = selectorFactory(...args);
      return (rootState: any) => {
        const sliceState = selectSlice(rootState);
        return baseSelector(sliceState);
      };
    };
  }

  return processed;
}

function initializeDataStreams<
  State,
  Selectors extends Record<string, (...args: any[]) => (state: State) => any>
>(
  store: Store<any>,
  moduleInstance: any,
  processedSelectors: Selectors,
  loaded$: any,
  destroyed$: any
) {
  // Create the data$ functions that return deferred streams
  for (const key in processedSelectors) {
    const factory = processedSelectors[key];
    (moduleInstance.data$ as any)[key] = (...args: any[]) => {
      return loaded$.pipe(
        first(), // wait until load completes
        switchMap(() => defer(() => {
          const selectorFn = factory(...args);
          return store.select(selectorFn);
        })),
        takeUntil(destroyed$) // stop emitting if module is destroyed
      );
    };
  }
}

function initializeActions<Actions extends Record<string, any>>(
  store: Store<any>,
  moduleInstance: any,
  processedActions: Actions,
  slice: string
) {
  for (const key in processedActions) {
    const actionCreator = processedActions[key];

    (moduleInstance.actions as any)[key] = (...args: any[]) => {
      if (!store) {
        throw new Error(
          `Module "${slice}" actions cannot be dispatched before registration. ` +
          `Call module.init(store) first.`
        );
      }

      const actionToDispatch = actionCreator(...args);
      store.dispatch(actionToDispatch);
      return actionToDispatch;
    };

    // Preserve metadata from original function (e.g. type)
    Object.defineProperties(
      (moduleInstance.actions as any)[key],
      Object.getOwnPropertyDescriptors(actionCreator)
    );
  }
}

function isActionCreator(obj: any): obj is ActionCreator {
  return obj && typeof obj.type === 'string' && obj?.isThunk !== true;
}

export { createModule };
