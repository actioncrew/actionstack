import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';
import { Subject } from 'rxjs/internal/Subject';

import { action, bindActionCreators } from './actions';
import { applyMiddleware, combineEnhancers, combineReducers, getProperty, setProperty } from './utils';
import { createLock } from './lock';
import { createExecutionStack } from './stack';
import { starter } from './starter';
import { createTracker, Tracker } from './tracker';
import {
  Action,
  AnyFn,
  AsyncReducer,
  defaultMainModule,
  FeatureModule,
  isPlainObject,
  kindOf,
  MainModule,
  MetaReducer,
  Middleware,
  MiddlewareAPI,
  Observer,
  ProcessingStrategy,
  Reducer,
  StoreEnhancer,
  Tree,
} from './types';


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
  exclusiveActionProcessing: false
};

/**
 * The `Store` type represents the core store object that manages state, actions, and modules.
 * It provides methods to interact with the store's state, dispatch actions, load/unload modules, and more.
 */
export type Store<T = any> = {
  dispatch: (action: Action | any) => Promise<void>;
  getState: (slice?: keyof T | string[] | "*") => any;
  readSafe: (slice: keyof T | string[] | "*", callback: (state: Readonly<T>) => void | Promise<void>) => Promise<void>;
  select: <R = any>(selector: (obs: Observable<T>, tracker?: Tracker) => Observable<R>, defaultValue?: any) => Observable<R>;
  loadModule: (module: FeatureModule) => Promise<void>;
  unloadModule: (module: FeatureModule, clearState: boolean) => Promise<void>;
  middlewareAPI: MiddlewareAPI;
  starter: Middleware;
};

/**
 * Constant array containing system action types as strings.
 * These action types are likely used internally for system events.
 */
const SYSTEM_ACTION_TYPES = [
  "INITIALIZE_STATE",
  "UPDATE_STATE",
  "STORE_INITIALIZED",
  "MODULE_LOADED",
  "MODULE_UNLOADED"
] as const;

/**
 * Type alias representing all possible system action types.
 * This type is derived from the `SYSTEM_ACTION_TYPES` array using the `typeof` operator and ensures the type is also a string.
 */
export type SystemActionTypes = typeof SYSTEM_ACTION_TYPES[number] & string;

/**
 * Function to check if a given string is a system action type.
 */
export function isSystemActionType(type: string): type is SystemActionTypes {
  return SYSTEM_ACTION_TYPES.includes(type as SystemActionTypes);
}

/**
 * Private function to create a system action.
 */
function systemAction<T extends SystemActionTypes>(type: T, payload?: Function) {
  return action(type, payload);
}

/**
 * Object containing action creator functions for all system action types.
 * Each property name corresponds to a system action type, and the function creates an action object with that type and optional payload.
 */
const systemActions = {
  initializeState: systemAction("INITIALIZE_STATE"),
  updateState: systemAction("UPDATE_STATE"),
  storeInitialized: systemAction("STORE_INITIALIZED"),
  moduleLoaded: systemAction("MODULE_LOADED", (module: FeatureModule) => ({module})),
  moduleUnloaded: systemAction("MODULE_UNLOADED", (module: FeatureModule) => ({module}))
};

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

  let sysActions = { ...systemActions };

  // Determine if the second argument is storeSettings or enhancer
  let settings: StoreSettings;
  if (typeof storeSettingsOrEnhancer === "function") {
    // If it's a function, it's the enhancer
    enhancer = storeSettingsOrEnhancer;
    settings = defaultStoreSettings; // Use default settings if not provided
  } else {
    // Otherwise, it's storeSettings
    settings = { ...storeSettingsOrEnhancer, ...defaultStoreSettings };
  }

  // Configure store pipeline
  let pipeline = {
    reducer: combineReducers({ [main.slice!]: main.reducer }),
    dependencies: {},
    strategy: settings.exclusiveActionProcessing ? "exclusive" : "concurrent"
  };

  const currentState = new BehaviorSubject<any>({});
  const tracker = createTracker();
  const lock = createLock();
  const stack = createExecutionStack();

  /**
   * Dispatches an action to update the global state.
   *
   * The function validates the action to ensure it is a plain object with a defined and string type property.
   * If any validation fails, a warning is logged to the console and the action is not dispatched.
   * After validation, the action is processed by the reducer, and the global state is updated accordingly.
   */
  let dispatch = async (action: Action | any) => {
    if (!isPlainObject(action)) {
      console.warn(`Actions must be plain objects. Instead, the actual type was: '${kindOf(action)}'.`);
      return;
    }
    if (typeof action.type === 'undefined') {
      console.warn('Actions may not have an undefined "type" property.');
      return;
    }
    if (typeof action.type !== 'string') {
      console.warn(`Action "type" property must be a string. Instead, the actual type was: '${kindOf(action.type)}'.`);
      return;
    }

    try {
      await updateState('*', async (state: any) => await pipeline.reducer(state, action), action);
    } catch {
      console.warn('Error during processing the action');
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
  const processDependencies = (source: any, processed: any = {}, origin: string = ''): any => {
    if (Array.isArray(source)) {
      return source.map(item => processDependencies(item, processed));
    }

    if (source && typeof source === 'object') {
      // Check if the source is a plain object
      if (typeof source.constructor === 'function' && source.constructor !== Object) {
        return source;
      } else {
        for (const [key, value] of Object.entries(source)) {
          if (!processed.hasOwnProperty(key)) {
            processed[key] = processDependencies(value, processed, origin);
          } else {
            console.warn(`Overlapping property '${key}' found in dependencies from module: ${origin}. The existing value will be preserved.`);
          }
        }
        return processed;// Assume it's a class instance or other non-plain object
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
    const otherModules = [mainModule, ...modules].filter(m => m !== module);
    const remainingDependencies = otherModules.reduce((acc, module) => {
      return processDependencies(module.dependencies, acc, module.slice);
    }, {});

    pipeline.dependencies = remainingDependencies;
  };

  /**
   * Loads a new feature module into the store if it isn't already loaded.
   * It ensures that dependencies are injected, the global state is updated,
   * and a `moduleLoaded` action is dispatched once the module is successfully loaded.
   */
  const loadModule = (module: FeatureModule): Promise<void> => {
    // Check if the module already exists
    if (modules.some(m => m.slice === module.slice)) {
      return Promise.resolve(); // Module already exists, return without changes
    }

    const promise = lock.acquire()
      .then(() => {
        // Create a new array with the module added
        modules = [...modules, module];

        // Inject dependencies
        return injectDependencies();
      })
      .then(() => updateState("*", state => setupReducer(state)))
      .finally(() => lock.release());

    // Dispatch module loaded action
    systemActions.moduleLoaded(module);
    return promise;
  }

  /**
   * Unloads a feature module from the store, optionally clearing its state.
   * It removes the module, ejects its dependencies, and updates the global state.
   * A `moduleUnloaded` action is dispatched after the module is unloaded.
   */
  const unloadModule = (module: FeatureModule, clearState: boolean = false): Promise<void> => {
    // Find the module index in the modules array
    const moduleIndex = modules.findIndex(m => m.slice === module.slice);

    // Check if the module exists
    if (moduleIndex === -1) {
      console.warn(`Module ${module.slice} not found, cannot unload.`);
      return Promise.resolve(); // Module not found, nothing to unload
    }

    const promise = lock.acquire()
      .then(() => {
        // Remove the module from the internal state
        modules.splice(moduleIndex, 1);

        // Eject dependencies
        return ejectDependencies(module);
      })
      .then(() => updateState("*", async (state) => {
        if (clearState) {
          state = { ...state };
          delete state[module.slice];
        }
        return await setupReducer(state);
      }))
      .finally(() => lock.release());

    // Dispatch module unloaded action
    systemActions.moduleUnloaded(module);
    return promise;
  }

  /**
   * Selects a specific value from the state using the provided selector function.
   * The function returns an observable that emits the selected value whenever the state changes.
   * Optionally, a default value can be provided if the selector returns `undefined`.
   */
  const getState = (slice: keyof T | string[] | "*"): any => {
    return getProperty(currentState.value, slice);
  }

  /**
   * Sets the state for a specified slice of the global state, updating it with the given value.
   * Handles different slice types, including a specific key, an array of path keys, or the entire global state.
   */
  const setState = async <T = any>(slice: keyof T | string[] | "*" , value: any, action = systemActions.updateState() as Action): Promise<any> => {
    const newState = setProperty(currentState.value, slice, value);

    currentState.next(newState);

    if (settings.awaitStatePropagation) {
      await tracker.allExecuted;
      tracker.reset();
    }

    return newState;
  }

  /**
   * Updates the state for a specified slice by executing the provided callback function,
   * which receives the current state as its argument and returns the updated state.
   * The resulting state is then set using the `setState` function.
   */
  const updateState = async (slice: keyof T | string[] | "*", callback: AnyFn, action = systemActions.updateState() as Action): Promise<any> => {
    if(callback === undefined) {
      console.warn('Callback function is missing. State will not be updated.')
      return;
    }

    let state = getState(slice);
    let result = await callback(state);
    await setState(slice, result, action);

    return action;
  };

  /**
   * Reads the state slice and executes the provided callback with the current state.
   * The function ensures that state is accessed in a thread-safe manner by acquiring a lock.
   */
  const readSafe = (slice: keyof T | string[], callback: (state:  Readonly<T>) => void | Promise<void>): Promise<void> => {
    const promise = (async () => {
      try {
        await lock.acquire(); //Potentially we can check here for an idle of the pipeline
        const state = await getState(slice); // Get state after acquiring lock
        callback(state);
      } finally {
        lock.release(); // Release lock regardless of success or failure
      }
    })();

    return promise;
  }

  /**
   * Selects a value from the store's state using the provided selector function.
   */
  function select<T, R = any>(
    selector: (obs: Observable<T>, tracker?: Tracker) => Observable<R>,
    defaultValue?: R,
    tracker?: Tracker,
  ): Observable<R> {
    const subject = new Subject<R>();
    let selected$ = selector(currentState, tracker);
    tracker?.track(selected$);

    const subscription = selected$ // Create an inner subscription
      .subscribe({
        next: (value) => {
          const filteredValue = value === undefined ? defaultValue : value;
          if (filteredValue !== undefined) {
            subject.next(filteredValue);
            tracker?.setStatus(selected$, true);
          }
        },
        error: (err) => {
          subject.error(err)
          tracker?.setStatus(selected$, true);
        },
        complete: () => {
          tracker?.complete(selected$);
          subject.complete();
        }
      });

    if (subscription) { // Add inner subscription to the outer subscription
      subscription.add(subscription);
    }

    return subject.asObservable();
  }

  /**
   * Sets up and applies reducers for the feature modules, combining them into a single reducer function.
   * Optionally applies meta reducers if enabled.
   */
  const setupReducer = async (state: any = {}): Promise<any> => {

    let featureReducers = [{slice: mainModule.slice!, reducer: mainModule.reducer}, ...modules].reduce((reducers, module) => {
      let moduleReducer: any = module.reducer instanceof Function ? module.reducer : {...module.reducer};
      reducers = {...reducers, [module.slice]: moduleReducer};
      return reducers;
    }, {} as Tree<Reducer>);

    let reducer = combineReducers(featureReducers);

    // Define async compose function to apply meta reducers
    const asyncCompose = (...fns: MetaReducer[]) => async (reducer: AsyncReducer) => {
      for (let i = fns.length - 1; i >= 0; i--) {
        try {
          reducer = await fns[i](reducer);
        } catch (error: any) {
          console.warn(`Error in metareducer ${i}:`, error.message);
        }
      }
      return reducer;
    };

    // Apply meta reducers if enabled
    if (settings.enableMetaReducers && mainModule.metaReducers && mainModule.metaReducers.length) {
      try {
        reducer = await asyncCompose(...mainModule.metaReducers)(reducer);
      } catch (error: any) {
        console.warn('Error applying meta reducers:', error.message);
      }
    }

    pipeline.reducer = reducer;

    // Update store state
    return await reducer(state, systemActions.updateState() as Action);
  }

  /**
   * Creates the middleware API object for use in the middleware pipeline.
   */
  const middlewareAPI = {
    getState: (slice?: any) => getState(slice),
    dispatch: (action: any) => dispatch(action),
    dependencies: () => pipeline.dependencies,
    strategy: () => pipeline.strategy,
    lock: lock,
    stack: stack,
  } as MiddlewareAPI;

  // Apply enhancer if provided
  if (typeof enhancer === "function") {
    // Check if the enhancer contains applyMiddleware
    const hasMiddlewareEnhancer = enhancer.name === 'applyMiddleware' || (enhancer as any).names?.includes('applyMiddleware');

    // If no middleware enhancer is present, apply applyMiddleware explicitly with an empty array
    if (!hasMiddlewareEnhancer) {
      enhancer = combineEnhancers(enhancer, applyMiddleware());
    }

    return enhancer(createStore)(main, settings);
  }

  // Bind system actions
  sysActions = bindActionCreators(systemActions, (action: Action) => settings.dispatchSystemActions && dispatch(action));

  // Initialize state and mark store as initialized
  sysActions.initializeState();

  console.log("%cYou are using ActionStack. Happy coding! 🎉", "font-weight: bold;");

  lock.acquire()
    .then(() => injectDependencies())
    .then(() => setupReducer())
    .then(state => setState("*", state))
    .finally(() => lock.release());

  sysActions.storeInitialized();

  return {
    dispatch,
    getState,
    readSafe,
    select,
    loadModule,
    unloadModule,
    starter,
    middlewareAPI,
  } as Store<any>;
}
