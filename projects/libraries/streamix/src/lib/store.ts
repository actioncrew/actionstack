import { action, actionHandlers, bindActionCreators, createAction } from './actions';
import { applyMiddleware, combineEnhancers, deepMerge, getProperty, setProperty } from './utils';
import { createLock } from './lock';
import { createExecutionStack } from './stack';
import { starter } from './starter';
import { createTracker } from './tracker';
import {
  Action,
  AnyFn,
  AsyncAction,
  defaultMainModule,
  FeatureModule,
  isPlainObject,
  kindOf,
  MainModule,
  Middleware,
  MiddlewareAPI,
  StoreEnhancer,
} from './types';
import {
  createBehaviorSubject,
  createQueue,
  createStream,
  createSubject,
  eachValueFrom,
  of,
  Stream,
  Subscription,
} from '@actioncrew/streamix';
import { createModule } from './module';

/**
 * Class representing configuration options for a store.
 * This class defines properties that control various behaviors of a store for managing application state.
 */
export type StoreSettings = {
  dispatchSystemActions?: boolean;
  awaitStatePropagation?: boolean;
  enableMetaReducers?: boolean;
  enableAsyncReducers?: boolean;
  exclusiveActionProcessing?: boolean;
};

/**
 * The default settings for the store that configure various behaviors such as action dispatch,
 * state propagation, and reducer handling.
 */
const defaultStoreSettings: StoreSettings = {
  dispatchSystemActions: true,
  awaitStatePropagation: true,
  enableMetaReducers: true,
  enableAsyncReducers: true,
  exclusiveActionProcessing: false,
};

/**
 * The `Store` type represents the core store object that manages state, actions, and modules.
 * It provides methods to interact with the store's state, dispatch actions, load/unload modules, and more.
 */
export type Store<T = any> = {
  dispatch: (action: Action | any) => Promise<void>;
  getState: (
    slice: keyof T | string[] | '*',
    callback: (state: Readonly<T>) => void | Promise<void>
  ) => Promise<void>;
  select<R = any>(
    selector: (state: T) => R | Promise<R>,
    defaultValue?: R,
  ): Stream<R>;
  loadModule: (module: FeatureModule) => Promise<void>;
  unloadModule: (module: FeatureModule, clearState?: boolean) => Promise<void>;
  middlewareAPI: MiddlewareAPI;
  starter: Middleware;
};

interface SystemState {
  _initialized: boolean;
  _ready: boolean;
  _modules: string[];
}

const systemModule = createModule({
  slice: "system",
  initialState: {
    _initialized: false,
    _ready: false,
    _modules: []
  } as SystemState,
  actions: {
    initializeState: createAction(
      'INITIALIZE_STATE',
      (state: SystemState) => ({ _modules: [], _initialized: false, _ready: false })
    ),

    updateState: createAction(
      'UPDATE_STATE',
      (state: SystemState, payload: Partial<SystemState>) => ({ ...state, ...payload })
    ),

    storeInitialized: createAction(
      'STORE_INITIALIZED',
      (state: SystemState) => ({ ...state, _initialized: true, _ready: true })
    ),

    moduleLoaded: createAction(
      'MODULE_LOADED',
      (state: SystemState, payload: { slice: string }) => ({
        ...state,
        _modules: [...state._modules, payload.slice]
      }),
    ),

    moduleUnloaded: createAction(
      'MODULE_UNLOADED',
      (state: SystemState, payload: { slice: string }) => ({
        ...state,
        _modules: state._modules.filter(m => m !== payload.slice)
      })
    )
  },
  selectors: {
    isInitialized: () => (state: SystemState) => state._initialized,
    isReady: () => (state: SystemState) => state._ready,
    loadedModules: () => (state: SystemState) => state._modules
  },
  dependencies: {}
});

export function isSystemActionType(type: string): boolean {
  return Object.values(systemModule.actions).map(t => t.type as string).includes(type);
}

/**
 * Creates a new store instance.
 *
 * This function initializes a store with the provided `mainModule` configuration and optional store enhancer.
 * It also accepts store settings that define various configuration options for the store.
 * The `storeSettings` parameter defaults to `defaultStoreSettings` if not provided.
 */
export function createStore<T = any>(
  mainModule: MainModule,
  storeSettingsOrEnhancer?: StoreSettings | StoreEnhancer,
  enhancer?: StoreEnhancer
): Store<T> {
  let main = { ...defaultMainModule, ...mainModule };
  let modules: FeatureModule[] = [];

  let sysActions = systemModule.actions;

  // Determine if the second argument is storeSettings or enhancer
  let settings: StoreSettings;
  if (typeof storeSettingsOrEnhancer === 'function') {
    // If it's a function, it's the enhancer
    enhancer = storeSettingsOrEnhancer;
    settings = defaultStoreSettings; // Use default settings if not provided
  } else {
    // Otherwise, it's storeSettings
    settings = { ...storeSettingsOrEnhancer, ...defaultStoreSettings };
  }

  // Configure store pipeline
  let pipeline = {
    // reducer: combineReducers({ [main.slice!]: main.reducer }),
    state: main.initialState,
    dependencies: main.dependencies,
    strategy: settings.exclusiveActionProcessing ? 'exclusive' : 'concurrent',
  };

  let state = pipeline.state as T;
  let currentState = createBehaviorSubject<T>(state as T);
  const tracker = settings.awaitStatePropagation ? createTracker() : undefined;
  const lock = createLock();
  const stack = createExecutionStack();
  const queue = createQueue();

  /**
   * Dispatches an action to update the global state.
   *
   * The function validates the action to ensure it is a plain object with a defined and string type property.
   * If any validation fails, a warning is logged to the console and the action is not dispatched.
   * After validation, the action is processed by the reducer, and the global state is updated accordingly.
   */
  let dispatch = async (action: Action | any) => {

    const handler = actionHandlers.get(action.type);

    if (handler) {
      // Get the slice name from action type (format: "sliceName/ACTION_TYPE")
      const [sliceName] = action.type.split('/');

      // Get current slice state
      const currentSliceState = getProperty(state, sliceName);

      // Call handler with slice state
      const newSliceState = await handler(currentSliceState, action.payload);

      // Update only the slice state
      state = setProperty(state, sliceName, newSliceState);
      currentState.next(state as T);
      return;
    }
  };

  /**
   * Recursively processes a nested structure of dependencies, handling arrays, objects, and class instances.
   *
   * @param {any} source The source object to process.
   * @param {Object} processed The object to accumulate processed values.
   * @param {string} origin The origin of the current source object (e.g., module name).
   * @returns {any} The processed object.
   *
   * @description
   * This function recursively traverses the `source` object, processing its properties and handling arrays, objects, and class instances. It merges overlapping properties from different sources, logging a warning for each conflict.
   *
   * - **Array Handling:** Recursively processes each element of an array.
   * - **Plain Object Handling:** Iterates over the properties of a plain object, recursively processing each value and merging them into the `processed` object. Logs a warning for overlapping properties.
   * - **Class Instance Handling:** Returns the original class instance without modification to avoid unintended side effects.
   *
   * @example
   * const dependencies = {
   *   a: { b: 1, c: [2, { d: 3 }] },
   *   e: new SomeClass(),
   * };
   *
   * const processedDependencies = processDependencies(dependencies);
   */
  const processDependencies = (
    source: any,
    processed: any = {},
    origin: string = ''
  ): any => {
    if (Array.isArray(source)) {
      return source.map((item) => processDependencies(item, processed));
    }

    if (source && typeof source === 'object') {
      // Check if the source is a plain object
      if (
        typeof source.constructor === 'function' &&
        source.constructor !== Object
      ) {
        return source;
      } else {
        for (const [key, value] of Object.entries(source)) {
          if (!processed.hasOwnProperty(key)) {
            processed[key] = processDependencies(value, processed, origin);
          } else {
            console.warn(
              `Overlapping property '${key}' found in dependencies from module: ${origin}. The existing value will be preserved.`
            );
          }
        }
        return processed; // Assume it's a class instance or other non-plain object
      }
    }

    return source;
  };

  /**
   * Merges and injects dependencies from the main module and all feature modules
   * into the pipeline's dependency object. Handles class instantiation.
   */
  const injectDependencies = (): void => {
    const allDependencies = [mainModule, ...modules].reduce((acc, module) => {
      return processDependencies(module.dependencies, acc, module.slice);
    }, {});

    pipeline.dependencies = allDependencies;
  };

  /**
   * Removes the specified module's dependencies from the pipeline and updates
   * the global dependencies object, ensuring proper handling of nested structures.
   */
  const ejectDependencies = (module: FeatureModule): void => {
    const otherModules = [mainModule, ...modules].filter((m) => m !== module);
    const remainingDependencies = otherModules.reduce((acc, module) => {
      return processDependencies(module.dependencies, acc, module.slice);
    }, {});

    pipeline.dependencies = remainingDependencies;
  };

  const registerActionHandlers = (
    module: FeatureModule
  ) => {
    Object.values(module.actions).forEach((action: any) => {
      if (actionHandlers.has(action.type)) {
        console.warn(`Action handler for "${action.type}" already registered - overwriting`);
      }
      actionHandlers.set(action.type, action.handler);
    })
  }

  const unregisterActionHandlers = (
    module: FeatureModule
  ) => {
    Object.values(module.actions).forEach((action: any) => {
      if (actionHandlers.has(action.type)) {
        actionHandlers.delete(action.type);
      }
    })
  }

  /**
   * Loads a new feature module into the store if it isn't already loaded.
   * It ensures that dependencies are injected, the global state is updated,
   * and a `moduleLoaded` action is dispatched once the module is successfully loaded.
   */
  const loadModule = (module: FeatureModule): Promise<void> => {
    (module as any).store = store;
    return queue.enqueue(async () => {
      if (modules.some((m) => m.slice === module.slice)) {
        return Promise.resolve(); // Already loaded
      }

      try {
        await lock.acquire(); //Potentially we can check here for an idle of the pipeline
        // Register the module
        modules = [...modules, module];

        registerActionHandlers(module);

        // Inject dependencies
        injectDependencies();
        await setupState(); // Rebuild global state

        sysActions.moduleLoaded(module);
        (module as any).loaded$.next(true);
      } finally {
        lock.release(); // Release lock regardless of success or failure
      }
    })
  };

  /**
   * Unloads a feature module from the store, optionally clearing its state.
   * It removes the module, ejects its dependencies, and updates the global state.
   * A `moduleUnloaded` action is dispatched after the module is unloaded.
   */
  const unloadModule = (
    module: FeatureModule,
    clearState: boolean = false
  ): Promise<void> => {
    return queue.enqueue(async () => {
      // Find the module index in the modules array
      const moduleIndex = modules.findIndex((m) => m.slice === module.slice);

      // Check if the module exists
      if (moduleIndex === -1) {
        console.warn(`Module ${module.slice} not found, cannot unload.`);
        return Promise.resolve(); // Module not found, nothing to unload
      }

      try {
        await lock.acquire(); //Potentially we can check here for an idle of the pipeline
        // Remove the module from the internal state
        modules.splice(moduleIndex, 1);

        unregisterActionHandlers(module);

        // Eject dependencies
        ejectDependencies(module);

        const slicePath = (module.slice || 'main').split('/');
        if (clearState) {
          state = setProperty(state, slicePath, undefined)
        }
        currentState.next(state);

        // Dispatch module unloaded action
        sysActions.moduleUnloaded(module);
      } finally {
        lock.release(); // Release lock regardless of success or failure
      }
    });
  };

  /**
   * Selects a specific value from the state using the provided selector function.
   * The function returns an observable that emits the selected value whenever the state changes.
   */
  const get = (slice: keyof T | string[] | '*'): T | undefined => {
    return getProperty(state, slice);
  };

  /**
   * Sets the state for a specified slice of the store state, updating it with the given value.
   * Handles different slice types, including a specific key, an array of path keys, or the entire store state.
   *
   * @param slice - The slice of the state to update. Use `"*"` for full updates.
   * @param value - The new value to set for the specified slice.
   * @returns A promise that resolves with the updated state.
   */
  const set = async (
    slice: keyof T | string[] | '*',
    value: any
  ): Promise<T> => {
    state = setProperty(state, slice, value);
    currentState.next(state);

    // Wait for state propagation if required
    if (settings.awaitStatePropagation) {
      await tracker?.allExecuted;
      tracker?.reset();
    }

    return state;
  };

  /**
   * Updates the state for a specified slice by executing the provided callback function,
   * which receives the current state as its argument and returns the updated state.
   * The resulting state is then set using the `setState` function.
   */
  const update = async (
    slice: keyof T | string[] | '*',
    callback: AnyFn,
    action = sysActions.updateState({}) as Action
  ): Promise<any> => {
    if (callback === undefined) {
      console.warn('Callback function is missing. State will not be updated.');
      return;
    }

    let state = get(slice);
    let result = await callback(state);
    await set(slice, result);

    return action;
  };

  /**
   * Reads the state slice and executes the provided callback with the current state.
   * The function ensures that state is accessed in a thread-safe manner by acquiring a lock.
   */
  const getState = (
    slice: keyof T | string[],
    callback: (state: Readonly<T | undefined>) => void | Promise<void>
  ): Promise<void> => {
    const promise = (async () => {
      try {
        await lock.acquire(); //Potentially we can check here for an idle of the pipeline
        const state = await get(slice); // Get state after acquiring lock
        callback(state);
      } finally {
        lock.release(); // Release lock regardless of success or failure
      }
    })();

    return promise;
  };

  /**
   * Selects and derives a value from the store's current state using the provided selector.
   *
   * The selector can return either a synchronous value or a Promise. If the result is `undefined`,
   * the `defaultValue` (if provided) will be used instead. The returned stream emits updates
   * whenever the selected value changes.
   *
   * @template R The type of the derived value.
   * @param {(state: T) => R | Promise<R>} selector - A function that selects or derives a value from the current state.
   * @param {R} [defaultValue] - A fallback value to emit when the selected value is `undefined`.
   * @returns {Stream<R>} A stream emitting selected (and optionally transformed) values.
   */
  const select = <R = any>(
    selector: (state: T) => R | Promise<R>,
    defaultValue?: R,
  ): Stream<R> => {
    const subject = createSubject<R>();
    let subscription: Subscription | null = null;
    let subscriberCount = 0;

    tracker?.track(subject);

    const originalSubscribe = subject.subscribe.bind(subject);
    subject.subscribe = (...args: any[]) => {
      if (subscriberCount === 0) {
        subscription = currentState.subscribe({
          next: async (state: T) => { // Use `state` from emitted value
            if (state === undefined || state === null) {
              if (defaultValue !== undefined) {
                subject.next(defaultValue);
              }
              tracker?.setStatus(subject, true);
              return;
            }

            try {
              const result = selector(state);

              if (result instanceof Promise) {
                result
                  .then((value) => {
                    const v = value === undefined ? defaultValue : value;
                    if (v !== undefined) subject.next(v);
                    tracker?.setStatus(subject, true);
                  })
                  .catch((err) => {
                    tracker?.setStatus(subject, true);
                    subject.error(err);
                  });
              } else {
                const v = result === undefined ? defaultValue : result;
                if (v !== undefined) subject.next(v);
                tracker?.setStatus(subject, true);
              }
            } catch (err) {
              tracker?.setStatus(subject, true);
              subject.error(err);
            }
          },
          error: (err) => {
            tracker?.setStatus(subject, true);
            subject.error(err);
            subscription?.unsubscribe(); // Cleanup
          },
          complete: () => {
            tracker?.complete(subject);
            subject.complete();
            subscription?.unsubscribe(); // Cleanup
          },
        });
      }

      subscriberCount++;
      const sub = originalSubscribe(...args);

      const originalUnsubscribe = sub.unsubscribe.bind(sub);
      sub.unsubscribe = () => {
        originalUnsubscribe();
        subscriberCount--;

        if (subscriberCount === 0 && subscription) {
          subscription.unsubscribe();
          subscription = null;
        }
      };

      return sub;
    };

    return subject;
  };

  const setupState = async (): Promise<any> => {
    let finalState = state;

    // Initialize the main slice first
    const allModules = [main, ...modules];

    for (const mod of allModules) {
      const slicePath = (mod.slice || 'main').split('/');
      if (getProperty<any>(finalState, slicePath) === undefined) {
        finalState = setProperty(finalState, slicePath, mod.initialState);
      }
    }

    // Apply meta-reducers to the state if enabled
    if (settings.enableMetaReducers && mainModule.metaReducers?.length) {
      for (let i = mainModule.metaReducers.length - 1; i >= 0; i--) {
        try {
          const meta = mainModule.metaReducers[i];
          const maybeNewState = await meta(finalState);
          if (maybeNewState !== undefined) {
            finalState = maybeNewState;
          }
        } catch (err: any) {
          console.warn(`Error in meta-reducer ${i}:`, err.message);
        }
      }
    }

    state = finalState as T;
    currentState.next(state);
    return finalState;
  };

  /**
   * Creates the middleware API object for use in the middleware pipeline.
   */
  const middlewareAPI = {
      getState: (slice?: any) => get(slice === undefined ? "*" : slice),
      dispatch: (action: Action | AsyncAction) => dispatch(action),
      dependencies: () => pipeline.dependencies,
      strategy: () => pipeline.strategy,
      lock: lock,
      stack: stack,
    } as MiddlewareAPI;

  let store = {
    starter,
    dispatch,
    getState,
    select,
    loadModule,
    unloadModule,
    middlewareAPI,
  } as Store<any>;


  /**
   * Initializes the store with system actions and state setup
   */
  const initializeStore = (storeInstance: Store<any>) => {
    // Bind system actions using the store's dispatch method
    systemModule.init(store);

    sysActions = systemModule.actions;

    // Initialize state and mark store as initialized
    sysActions.initializeState();

    console.log(
      '%cYou are using ActionStack. Happy coding! 🎉',
      'font-weight: bold;'
    );

    injectDependencies();
    sysActions.storeInitialized();
  }

  // Apply enhancer if provided
  if (typeof enhancer === 'function') {
    // Check if the enhancer contains applyMiddleware
    const hasMiddlewareEnhancer =
      enhancer.name === 'applyMiddleware' ||
      (enhancer as any).names?.includes('applyMiddleware');

    // If no middleware enhancer is present, apply applyMiddleware explicitly with an empty array
    if (!hasMiddlewareEnhancer) {
      enhancer = combineEnhancers(enhancer, applyMiddleware());
    }
  } else {
    enhancer = combineEnhancers(applyMiddleware());
  }

  store = enhancer(() => store)(main, settings);
  let originalDispatch = store.dispatch;
  store.dispatch = (action) => queue.enqueue(() => originalDispatch(action));
  initializeStore(store);
  return store;
}
