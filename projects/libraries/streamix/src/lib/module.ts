import {
  createReplaySubject,
  createSubject,
  defer,
  first,
  switchMap,
  takeUntil,
  Stream,
} from '@actioncrew/streamix';
import {
  ActionCreator,
  FeatureModule,
  featureSelector,
  Store,
  Streams,
} from '../lib';

export function createModule<
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

  // State management
  let loaded = false;
  let store: Store<State> | undefined;
  const loaded$ = createReplaySubject<void>();
  const destroyed$ = createSubject<void>();

  // Process actions once at creation time
  const processedActions = processActions(config.actions ?? {}, slice);
  const processedSelectors = processSelectors(config.selectors ?? {}, selectSlice);

  // Create module interface first (without circular references)
  const moduleInterface = {
    slice,
    initialState: config.initialState,
    dependencies: config.dependencies,
    loaded$,
    destroyed$,
    // These will be populated during init
    actions: {} as Actions,
    selectors: processedSelectors,
    data$: {} as Streams<Selectors>,
  };

  // Add methods that don't reference the module itself
  const moduleWithMethods = {
    ...moduleInterface,

    init(storeInstance: Store<State>) {
      if (loaded) {
        return moduleWithMethods; // Already initialized
      }

      loaded = true;
      store = storeInstance;

      // Load the module into the store
      store.loadModule(moduleWithMethods);

      // Initialize data streams
      initializeDataStreams(moduleWithMethods, store, loaded$, destroyed$);

      // Initialize dispatchable actions
      initializeDispatchableActions(moduleWithMethods, processedActions, store, slice);

      // Signal that module is loaded
      loaded$.next();
      loaded$.complete();

      return moduleWithMethods;
    },

    destroy(clearState: boolean = true) {
      if (!loaded) {
        return moduleWithMethods; // Already destroyed
      }

      loaded = false;
      destroyed$.next();
      destroyed$.complete();

      if (store) {
        store.unloadModule(moduleWithMethods, clearState);
        store = undefined;
      }

      return moduleWithMethods;
    },
  };

  return moduleWithMethods as FeatureModule<State, ActionTypes, Actions, Selectors, Dependencies>;
}

// Helper functions to break down the logic

function processActions<Actions extends Record<string, any>>(
  actions: Actions,
  slice: string
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
      const thunkWithType = (...args: any[]) => {
        const thunk = action(...args);
        return Object.assign(
          async (dispatch: any, getState: any, deps: any) => {
            return thunk(dispatch, getState, {
              ...deps,
              // Note: dependencies should be passed from module context
            });
          },
          { type: `${slice}/${thunk.type}` }
        );
      };
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
  moduleInstance: any,
  store: Store<State>,
  loaded$: Stream<void>,
  destroyed$: Stream<void>
) {
  // Create lazy stream factories
  const streamFactories = {} as any;

  for (const key in moduleInstance.selectors) {
    const selector = moduleInstance.selectors[key];
    streamFactories[key] = (...args: any[]) => {
      const selectorFn = selector(...args);
      return store.select(selectorFn);
    };
  }

  // Create deferred streams that wait for module to be loaded
  for (const key in streamFactories) {
    moduleInstance.data$[key] = (...args: any[]) =>
      defer(() =>
        loaded$.pipe(
          first(),
          switchMap(() => {
            const factory = streamFactories[key];
            return factory(...args);
          }),
          takeUntil(destroyed$)
        )
      );
  }
}

function initializeDispatchableActions<
  State,
  Actions extends Record<string, any>
>(
  moduleInstance: any,
  processedActions: Actions,
  store: Store<State>,
  slice: string
) {
  for (const key in processedActions) {
    const actionCreator = processedActions[key];

    moduleInstance.actions[key] = (...args: any[]) => {
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

    // Copy properties from original action creator
    Object.defineProperties(
      moduleInstance.actions[key],
      Object.getOwnPropertyDescriptors(actionCreator)
    );
  }
}

function isActionCreator(obj: any): obj is ActionCreator {
  return obj && typeof obj.type === 'string' && obj?.isThunk !== true;
}
