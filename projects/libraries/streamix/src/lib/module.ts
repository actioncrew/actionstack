import { createReplaySubject, createSubject, defer, first, Operator, pipeStream, Stream, switchMap, takeUntil } from '@actioncrew/streamix';
import { ActionCreator, FeatureModule, featureSelector, Store, Streams } from '../lib';

/**
 * Creates a feature module that encapsulates state, actions, selectors, and dependencies
 * in a modular, namespaced format for integration with an Actionstack-style store.
 *
 * This function supports both synchronous and asynchronous (thunk) actions,
 * and binds typed selectors to a store dynamically. Selectors and actions are namespaced
 * under the given `slice` name. It also manages module lifecycle with `.init()` and `.destroy()`.
 *
 * @template State - The shape of the module’s state.
 * @template ActionTypes - Union of string literals representing valid action types.
 * @template Actions - A mapping of action creator functions, including thunks.
 * @template Selectors - A mapping of selector factory functions.
 * @template Dependencies - Optional object of injected dependencies available to thunks.
 *
 * @param config - Configuration object for defining the module.
 * @param config.slice - Unique namespace identifier for this module's state and actions.
 * @param config.initialState - The initial state for this module.
 * @param config.actions - An object mapping action names to action creators or thunk creators.
 * @param config.selectors - An object mapping selector names to selector factory functions.
 * @param config.dependencies - Optional dependencies available to asynchronous actions (thunks).
 *
 * @returns A `FeatureModule` object with:
 * - `slice`: the namespace for the module
 * - `actions`: namespaced and dispatch-ready action/thunk creators
 * - `selectors`: selectors scoped to the module's state slice
 * - `data$`: reactive stream-based access to selectors (lazy-initialized after `init`)
 * - `init(store)`: registers the module with the store
 * - `destroy(clearState?)`: unregisters the module and optionally clears its state
 * - `loaded$`: stream that emits when the module is loaded
 * - `destroyed$`: stream that completes when the module is destroyed
 */
export function createModule<
  State,
  ActionTypes extends string,
  Actions extends Record<string, ActionCreator<ActionTypes> | ((...args: any[]) => any)>,
  Selectors extends Record<string, (...args: any[]) => (state: State) => any>,
  Dependencies extends Record<string, any> = {}
>(config: {
  slice: string;
  initialState: State;
  actions: Actions;
  selectors: Selectors;
  dependencies?: Dependencies;
}) {
  const { slice } = config;

  let loaded = false;
  const loaded$ = createReplaySubject<void>();
  const destroyed$ = createSubject<void>();

  const processedActions = Object.fromEntries(
    Object.entries(config.actions).map(([name, action]) => {
      if (isActionCreator(action)) {
        // Standard action creator
        const namespacedType = `${slice}/${action.type}`;

        const namespacedAction = (...args: any[]) => {
          const act = action(...args);
          return {
            ...act,
            type: namespacedType,
          };
        };

        // Preserve metadata and override type and toString
        Object.assign(namespacedAction, action, {
          type: namespacedType,
          toString: () => namespacedType,
        });

        return [name, namespacedAction];
      } else {
        // Thunk action
        const thunkWithType = (...args: any[]) => {
          const thunk = action(...args);
          return Object.assign(
            async (dispatch: any, getState: any, deps: any) => {
              return thunk(dispatch, getState, {
                ...deps,
                ...config.dependencies
              });
            },
            { type: `${slice}/${thunk.type}` }
          );
        };
        return [name, thunkWithType];
      }
    }
  )) as Actions;

  // 2. Create selectors with feature scope

 // Create a feature selector for the module slice
  const feature = featureSelector(slice);

  // Patch selectors to inject slice
  const processedSelectors = Object.fromEntries(
    Object.entries(config.selectors).map(([name, selector]) => {
      const wrapped = (...args: any[]) => {
        const original = selector(...args); // (state) => value
        return (globalState: any) => {
          const sliceState = feature(globalState);
          return original(sliceState);
        };
      };
      return [name, wrapped];
    })
  ) as Selectors;

  let internalStreams: Streams<Selectors> = {} as any;

  // Bind selectors to store:
  function bindSelectorsToStore(
    store: { select: <R>(selector: (state: any) => R | Promise<R>) => Stream<R> },
    module: FeatureModule<State, ActionTypes, Actions, Selectors, Dependencies>
  ): void {
    const streams = {} as Streams<Selectors>;

    for (const key in module.selectors) {
      const sel = module.selectors[key];
      streams[key] = ((...args: Parameters<typeof sel>) => {
        const selectorFn = sel(...args);
        return store.select(selectorFn);
      }) as Streams<Selectors>[typeof key];
    }

    internalStreams = streams;
  }

  let store: Store<State> | undefined;

  let module = {
    slice,
    initialState: config.initialState,
    actions: processedActions,
    selectors: processedSelectors,
    dependencies: config.dependencies,
    get data$() {
      return new Proxy({} as Streams<Selectors>, {
        get(_, key: string) {
          return (...args: any[]) => {
            return defer(() => loaded$.pipe(
              first(),
              switchMap(() => {
                const fn = internalStreams[key as keyof Selectors];
                return fn(...args as Parameters<Selectors[keyof Selectors]>);
              }),
              takeUntil(destroyed$)
            ));
          };
        }
      });
    },
    loaded$,
    destroyed$,
    init(storeInstance: Store<State>) {
      if (loaded === false) {
        loaded = true;
        store = storeInstance;
        store.loadModule(this);
        bindSelectorsToStore(store, this);
      }
      return module;
    },
    destroy(clearState?: boolean) {
      if (loaded === true) {
        loaded = false;
        store?.unloadModule(this, clearState);
      }
      return module;
    }
  };

  module.actions = new Proxy(processedActions, {
    get(target, prop: string | symbol, receiver) {
      const fn = (target as any)[prop];
      if (typeof fn !== "function") {
        return fn;
      }

      const wrappedFn = (...args: any[]) => {
        if (!store) {
          throw new Error(
            `Module "${slice}" actions cannot be dispatched before registration. ` +
            `Call module.register(store) first.`
          );
        }

        if ((fn as any).isThunk) {
          console.log("dispatching thunk:", fn);
        }

        const actionToDispatch = fn(...args);
        store.dispatch(actionToDispatch);
        return actionToDispatch;
      };

      const descriptors = Object.getOwnPropertyDescriptors(fn);
      Object.defineProperties(wrappedFn, descriptors);

      return wrappedFn;
    },
  });

  return module as FeatureModule<State, ActionTypes, Actions, Selectors, Dependencies>;
}

/**
 * Type guard to check whether an object is a synchronous ActionCreator.
 *
 * @param obj - The object to check.
 * @returns `true` if the object is a standard (non-thunk) action creator.
 */
function isActionCreator(obj: any): obj is ActionCreator {
  return obj && typeof obj.type === 'string' && obj?.isThunk !== true;
}
