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

  let loaded = false;
  const loaded$ = createReplaySubject<void>();
  const destroyed$ = createSubject<void>();

  // Handle actions
  const processedActions = {} as Actions;
  const dispatchableActions = {} as Actions;

  for (const [name, action] of Object.entries(config.actions ?? {})) {
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

      (processedActions as any)[name] = namespacedAction;
    } else {
      const thunkWithType = (...args: any[]) => {
        const thunk = action(...args);
        return Object.assign(
          async (dispatch: any, getState: any, deps: any) => {
            return thunk(dispatch, getState, {
              ...deps,
              ...config.dependencies,
            });
          },
          { type: `${slice}/${thunk.type}` }
        );
      };
      (processedActions as any)[name] = thunkWithType;
    }
  }

  // Wrap selectors with feature scope
  const processedSelectors = {} as Selectors;
  for (const [name, selectorFactory] of Object.entries(config.selectors ?? {})) {
    (processedSelectors as any)[name] = (...args: any[]) => {
      const baseSelector = selectorFactory(...args);
      return (rootState: any) => {
        const sliceState = selectSlice(rootState);
        return baseSelector(sliceState);
      };
    };
  }

  let store: Store<State> | undefined;

  const module = {
    slice,
    initialState: config.initialState,
    actions: dispatchableActions,
    selectors: processedSelectors,
    dependencies: config.dependencies,
    data$: {} as Streams<Selectors>,
    loaded$,
    destroyed$,
    init(storeInstance: Store<State>) {
      if (!loaded) {
        loaded = true;
        store = storeInstance;
        store.loadModule(module);

        // Lazily construct data$ streams
        const streams = {} as Streams<Selectors>;
        for (const key in module.selectors) {
          const sel = module.selectors[key];
          (streams as any)[key] = (...args: any[]) => {
            const selectorFn = sel(...args);
            return store!.select(selectorFn);
          };
        }

        for (const key in streams) {
          (module.data$ as any)[key] = (...args: any[]) =>
            defer(() =>
              loaded$.pipe(
                first(),
                switchMap(() => {
                  const fn = streams[key];
                  return fn(...args as Parameters<Selectors[keyof Selectors]>);
                }),
                takeUntil(destroyed$)
              )
            );
        }

        // Wrap dispatchable actions
        for (const key in processedActions) {
          const fn = (processedActions as any)[key];
          (dispatchableActions as any)[key] = (...args: any[]) => {
            if (!store) {
              throw new Error(
                `Module "${slice}" actions cannot be dispatched before registration. ` +
                `Call module.init(store) first.`
              );
            }
            const actionToDispatch = fn(...args);
            store.dispatch(actionToDispatch);
            return actionToDispatch;
          };
          Object.defineProperties((dispatchableActions as any)[key], Object.getOwnPropertyDescriptors(fn));
        }
      }

      return module;
    },
    destroy(clearState: boolean = true) {
      if (loaded) {
        loaded = false;
        store?.unloadModule(module, clearState);
      }
      return module;
    },
  };

  return module as FeatureModule<State, ActionTypes, Actions, Selectors, Dependencies>;
}

function isActionCreator(obj: any): obj is ActionCreator {
  return obj && typeof obj.type === 'string' && obj?.isThunk !== true;
}
