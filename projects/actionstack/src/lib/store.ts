import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';
import { Subject } from 'rxjs/internal/Subject';

import { action, bindActionCreators } from './actions';
import { createLock } from './lock';
import { createExecutionStack } from './stack';
import { starter } from './starter';
import { createTracker, Tracker } from './tracker';
import {
  Action,
  AnyFn,
  AsyncReducer,
  FeatureModule,
  isPlainObject,
  kindOf,
  MainModule,
  MetaReducer,
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
  dispatchSystemActions: boolean;
  awaitStatePropagation: boolean;
  enableMetaReducers: boolean;
  enableAsyncReducers: boolean;
};

/**
 * The default settings for the store that configure various behaviors such as action dispatch,
 * state propagation, and reducer handling.
 */
const defaultStoreSettings = {
  dispatchSystemActions: true,
  awaitStatePropagation: true,
  enableMetaReducers: true,
  enableAsyncReducers: true
};

/**
 * The `Store` type represents the core store object that manages state, actions, and modules.
 * It provides methods to interact with the store's state, dispatch actions, load/unload modules, and more.
 */
export type Store<T = any> = {
  dispatch: (action: Action | any) => Promise<void>;
  getState: (slice?: keyof T | string[] | "@global") => any;
  readSafe: (slice: keyof T | string[] | "@global", callback: (state: Readonly<T>) => void | Promise<void>) => Promise<void>;
  select: <R = any>(selector: (obs: Observable<T>, tracker?: Tracker) => Observable<R>, defaultValue?: any) => Observable<R>;
  loadModule: (module: FeatureModule) => Promise<void>;
  unloadModule: (module: FeatureModule, clearState: boolean) => Promise<void>;
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
 *
 * @template T - The type of the store's state.
 *
 * @param {MainModule} mainModule - The main module configuration that defines the core behavior and structure of the store.
 * This includes settings like the reducer, dependencies, middleware, and more.
 *
 * @param {StoreEnhancer} [enhancer] - An optional store enhancer to augment the store's functionality, such as adding custom middlewares, logging, or other features.
 *
 * @param {StoreSettings} [storeSettings=defaultStoreSettings] - Optional settings to configure the store. Defaults to `defaultStoreSettings` if not provided.
 * The settings may include options like state persistence, logging preferences, etc.
 *
 * @returns {Store<T>} The newly created store instance that is initialized with the provided configurations.
 */
export function createStore<T = any>(mainModule: MainModule, storeSettings: StoreSettings = defaultStoreSettings, enhancer?: StoreEnhancer): Store<T> {

  let main = { ...mainModule };
  let modules: FeatureModule[] = [];

  let pipeline = {
    middleware: [] as any[],
    reducer: ((state: any = {}) => state) as AsyncReducer,
    dependencies: {} as Tree<any>,
    strategy: "exclusive" as ProcessingStrategy
  };

  let sysActions = { ...systemActions };

  const currentState = new BehaviorSubject<any>({});
  const settings = { ...defaultStoreSettings, ...storeSettings };
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
      await updateState('@global', async (state: any) => await pipeline.reducer(state, action), action);
    } catch {
      console.warn('Error during processing the action');
    }
  };

  /**
   * Applies middleware to the dispatch function to modify its behavior.
   *
   * This function sets up a middleware chain by combining the starter middleware with other middleware
   * functions provided in the pipeline. It modifies the dispatch function by wrapping it in the middleware
   * chain, allowing the action to be intercepted and potentially modified before it reaches the reducer.
   */
  const applyMiddleware = () => {
    // Define starter and middleware APIs
    const middlewareAPI = {
      getState: () => getState(),
      dispatch: async (action: any) => await dispatch(action),
      dependencies: () => pipeline.dependencies,
      strategy: () => pipeline.strategy,
      lock: lock,
      stack: stack
    };

    // Build middleware chain
    const chain = [starter(middlewareAPI), ...pipeline.middleware.map(middleware => middleware(middlewareAPI))] as any[];
    // Compose middleware chain with dispatch function
    dispatch = (chain.length === 1 ? chain[0] : chain.reduce((a, b) => (...args: any[]) => a(b(...args))))(dispatch);
  };

  /**
   * Merges and injects dependencies from the main module and all feature modules
   * into the pipeline's dependency object. It handles recursion for nested objects
   * and arrays and ensures classes are instantiated correctly.
   */
  const injectDependencies = (): void => {
    // Initialize the new dependencies object
    let newDependencies = {} as any;

    // Combine all dependencies into one object
    let allDependencies = [mainModule.dependencies, ...modules.map(module => module.dependencies)].filter(Boolean);

    // Recursively clone and update dependencies
    allDependencies.forEach((dep: any) => {
      Object.keys(dep).forEach(key => {
        newDependencies[key] = dep[key];
      });
    });

    // Initialize the pipeline dependencies object
    pipeline.dependencies = {} as any;

    // Create a stack for depth-first traversal of newDependencies
    let stack: { parent: any, key: string | number, subtree: any }[] = Object.keys(newDependencies).map(key => ({ parent: newDependencies, key, subtree: pipeline.dependencies }));

    while (stack.length > 0) {
      const { parent, key, subtree } = stack.pop()!;
      const value = parent[key];
      if (Array.isArray(value)) {
        // If value is an array, add its elements to the stack
        subtree[key] = [];
        stack.push(...value.map((v, i) => ({ parent: value, key: i, subtree: subtree[key] })));
      } else if (typeof value === 'object' && value !== null) {
        if (value && typeof value.constructor === 'function') {
          // If the value is a class (function with prototype), instantiate it
          subtree[key] = value; // Assuming default constructor is suitable
        } else {
          // If value is an object (not a class), copy its children to the stack
          subtree[key] = {};
          stack.push(...Object.keys(value).map(childKey => ({
            parent: value, key: childKey, subtree: subtree[key]
          })));
        }
      } else {
        subtree[key] = value;
      }
    }
  }

  /**
   * Removes the specified module's dependencies from the pipeline and updates
   * the global dependencies object. It merges the remaining dependencies from
   * the main module and other feature modules, handling recursion for nested
   * objects and arrays, and ensures classes are instantiated correctly.
   */
  const ejectDependencies = (module: FeatureModule): void => {
    // Combine all dependencies into one object, excluding the specified module
    let allDependencies = [mainModule.dependencies, ...modules.filter(m => m !== module).map(m => m.dependencies)].filter(Boolean);

    // Initialize the new dependencies object
    let newDependencies = {} as any;

    // Recursively clone and update dependencies
    allDependencies.forEach((dep: any) => {
      Object.keys(dep).forEach(key => {
        newDependencies[key] = dep[key];
      });
    });

    // Initialize the pipeline dependencies object
    pipeline.dependencies = {} as any;

    // Create a stack for depth-first traversal of the newDependencies tree
    let stack: { parent: any, key: string | number, subtree: any }[] = Object.keys(newDependencies).map(key => ({
      parent: newDependencies, key, subtree: pipeline.dependencies
    }));

    // Traverse and update the pipeline.dependencies object
    while (stack.length > 0) {
      const { parent, key, subtree } = stack.pop()!;
      const value = parent[key];

      if (Array.isArray(value)) {
        // If value is an array, handle its elements
        subtree[key] = [];
        stack.push(...value.map((v, i) => ({ parent: value, key: i, subtree: subtree[key] })));
      } else if (typeof value === 'object' && value !== null) {
        if (value && typeof value.constructor === 'function') {
          // If the value is a class (function with prototype), instantiate it
          subtree[key] = value; // Assuming default constructor is suitable
        } else {
          // If value is an object (not a class), copy its children to the stack
          subtree[key] = {};
          stack.push(...Object.keys(value).map(childKey => ({
            parent: value, key: childKey, subtree: subtree[key]
          })));
        }
      } else {
        // If value is a simple value, set it directly
        subtree[key] = value;
      }
    }
  };

  /**
   * Loads a new feature module into the store if it isn't already loaded.
   * It ensures that dependencies are injected, the global state is updated,
   * and a `moduleLoaded` action is dispatched once the module is successfully loaded.
   *
   * @param {FeatureModule} module - The feature module to be loaded.
   * @returns {Promise<void>} A promise that resolves when the module is successfully loaded.
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
      .then(() => updateState("@global", state => setupReducer(state)))
      .finally(() => lock.release());

    // Dispatch module loaded action
    systemActions.moduleLoaded(module);
    return promise;
  }

  /**
   * Unloads a feature module from the store, optionally clearing its state.
   * It removes the module, ejects its dependencies, and updates the global state.
   * A `moduleUnloaded` action is dispatched after the module is unloaded.
   *
   * @param {FeatureModule} module - The feature module to be unloaded.
   * @param {boolean} [clearState=false] - Whether to clear the module's state from the global state.
   * @returns {Promise<void>} A promise that resolves when the module is successfully unloaded.
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
      .then(() => updateState("@global", async (state) => {
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
   * Applies a change to a nested state object based on a given path and value,
   * updating the state along the path and marking the edges of the tree as visited.
   *
   * @param {any} initialState - The initial state object to apply changes to.
   * @param {Object} change - The change to apply, containing a path and value.
   * @param {string[]} change.path - The path to the property to update.
   * @param {any} change.value - The new value to set at the specified path.
   * @param {Tree<boolean>} edges - A tree structure representing the visited paths.
   * @returns {any} The updated state object.
   */
  const applyChange = (initialState: any, {path, value}: {path: string[], value: any}, edges: Tree<boolean>): any => {
    let currentState: any = Object.keys(edges).length > 0 ? initialState: {...initialState};
    let currentObj: any = currentState;
    let currentEdges: Tree<boolean> = edges;

    for (let i = 0; i < path.length; i++) {
      const key = path[i];
      if (i === path.length - 1) {
        // Reached the leaf node, update its value
        currentObj[key] = value;
        currentEdges[key] = true;
      } else {
        // Continue traversal
        currentObj = currentObj[key] = currentEdges[key] ? currentObj[key] : { ...currentObj[key] };
        currentEdges = (currentEdges[key] = currentEdges[key] ?? {}) as any;
      }
    }
    return currentState;
  }

  /**
   * Sets the state for a specified slice of the global state, updating it with the given value.
   * Handles different slice types, including a specific key, an array of path keys, or the entire global state.
   *
   * @param {keyof T | string[] | "@global" | undefined} slice - The slice of the state to update.
   * If undefined, updates the whole state, if "@global", updates the global state,
   * or a string/array for specific paths/keys.
   * @param {any} value - The new value to set at the specified slice or path.
   * @param {Action} [action=systemActions.updateState()] - The action triggering the state update (optional).
   * @returns {Promise<any>} A promise resolving to the updated state object.
   */
  const setState = async <T = any>(slice: keyof T | string[] | "@global" | undefined, value: any, action: Action = systemActions.updateState()): Promise<any> => {
    let newState: any;
    if (slice === undefined || typeof slice === "string" && slice == "@global") {
      // Update the whole state with a shallow copy of the value
      newState = ({...value});
    } else if (typeof slice === "string") {
      // Update the state property with the given key with a shallow copy of the value
      newState = {...currentState.value, [slice]: { ...value }};
    } else if (Array.isArray(slice)) {
      // Apply change to the state based on the provided path and value
      newState = applyChange(currentState.value, {path: slice, value}, {});
    } else {
      // Unsupported type of slice parameter
      console.warn("Unsupported type of slice parameter");
      return;
    }

    tracker.reset();

    const next = async <T>(subject: Subject<T>, value: T): Promise<void> => {
      return new Promise<void>(async (resolve) => {
        await subject.next(value);
        resolve();
      });
    };

    let stateUpdated = next(currentState, newState);

    if (settings.awaitStatePropagation) {
      await Promise.allSettled([stateUpdated]);
    }

    return newState;
  }

  /**
   * Updates the state for a specified slice by executing the provided callback function,
   * which receives the current state as its argument and returns the updated state.
   * The resulting state is then set using the `setState` function.
   *
   * @param {keyof T | string[] | "@global" | undefined} slice - The slice of the state to update.
   * If undefined, updates the whole state, if "@global", updates the global state,
   * or a string/array for specific paths/keys.
   * @param {AnyFn} callback - The callback function that receives the current state and returns the updated state.
   * @param {Action} [action=systemActions.updateState()] - The action triggering the state update (optional).
   * @returns {Promise<Action>} A promise resolving to the action that triggered the state update.
   */
  const updateState = async (slice: keyof T | string[] | "@global" | undefined, callback: AnyFn, action: Action = systemActions.updateState()): Promise<any> => {
    if(callback === undefined) {
      console.warn('Callback function is missing. State will not be updated.')
      return;
    }

    let state = await getState(slice);
    let result = await callback(state);
    await setState(slice, result, action);

    return action;
  };

  /**
   * Combines multiple reducers into a single asynchronous reducer function.
   * The combined reducer applies each individual reducer to the state based on its corresponding path.
   *
   * @param {Tree<Reducer>} reducers - A tree structure where each leaf is a reducer function and each node represents a nested path.
   * @returns {AsyncReducer} A combined reducer function that applies each individual reducer to the state.
   */
  const combineReducers = (reducers: Tree<Reducer>): AsyncReducer => {
    // Create a map for reducers
    const reducerMap = new Map<Reducer, string[]>();

    /**
     * Recursively builds a map of reducers with their corresponding paths.
     * @param {Tree<Reducer>} tree - The tree structure containing reducers.
     * @param {string[]} [path=[]] - The current path in the tree.
     */
    const buildReducerMap = (tree: Tree<Reducer>, path: string[] = []) => {
      for (const key in tree) {
        const reducer = tree[key]; const newPath = [...path, key]; // Add current key to the path
        if(reducer instanceof Function) {
          reducerMap.set(reducer, newPath);
        }
        else if (typeof reducer === 'object') {
          buildReducerMap(reducer, newPath);
        }
      }
    };

    buildReducerMap(reducers);

    /**
     * Combined reducer function that applies each individual reducer to the state.
     * @param {any} [state={}] - The current state.
     * @param {Action} action - The action to process.
     * @returns {Promise<any>} A promise that resolves to the modified state.
     */
    const combinedReducer = async (state: any = {}, action: Action) => {
      // Apply every reducer to state and track changes
      let modified = {};
      for (const [reducer, path] of reducerMap) {
        try {
          const currentState = await getState(path);
          const updatedState = await reducer(currentState, action);
          if(currentState !== updatedState) { state = await applyChange(state, {path, value: updatedState}, modified); }
        } catch (error: any) {
          console.warn(`Error occurred while processing an action ${action.type} for ${path.join('.')}: ${error.message}`);
        }
      }
      return state;
    };
    return combinedReducer;
  }

  /**
   * Sets up and applies reducers for the feature modules, combining them into a single reducer function.
   * Optionally applies meta reducers if enabled.
   *
   * @param {any} [state={}] - The initial state to apply the reducers to. Defaults to an empty object.
   * @returns {Promise<any>} A promise that resolves to the updated state after applying the reducers and meta reducers.
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
    return await reducer(state, systemActions.updateState());
  }

  /**
   * Reads the state slice and executes the provided callback with the current state.
   * The function ensures that state is accessed in a thread-safe manner by acquiring a lock.
   *
   * @param {keyof T | string[]} slice - The state slice or path to retrieve.
   * @param {(state: Readonly<T>) => void | Promise<void>} callback - The callback to execute with the state.
   * @returns {Promise<void>} A promise that resolves once the callback has been executed with the state.
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
   * @param {(obs: Observable<any>) => Observable<any>} selector - The selector function to apply on the state observable.
   * @param {*} [defaultValue] - The default value to use if the selected value is undefined.
   * @returns {Observable<any>} An observable stream with the selected value.
   */
  const select = <R = any>(selector: (obs: Observable<T>, tracker?: Tracker) => Observable<R>, defaultValue?: any): Observable<R> => {
    let lastValue: any;
    let selected$: Observable<R> | undefined;
    return new Observable<R>((subscriber: Observer<R>) => {
      const subscription = currentState.pipe((state) => (selected$ = selector(state, tracker) as Observable<R>)).subscribe(selectedValue => {
        const filteredValue = selectedValue === undefined ? defaultValue : selectedValue;
        if(filteredValue !== lastValue) {
          Promise.resolve(subscriber.next(filteredValue))
            .then(() => lastValue = filteredValue)
            .finally(() => tracker.setStatus(selected$!, true));
        } else {
          tracker.setStatus(selected$!, true);
        }
      });

      return () => subscription.unsubscribe();
    });
  }

  /**
   * Selects a specific value from the state using the provided selector function.
   * The function returns an observable that emits the selected value whenever the state changes.
   * Optionally, a default value can be provided if the selector returns `undefined`.
   *
   * @param {function} selector - The function to select a specific part of the state. It receives the state observable and an optional tracker.
   * @param {any} [defaultValue] - The default value to emit when the selector returns `undefined`.
   * @returns {Observable<R>} An observable that emits the selected state value or the default value.
   */
  const getState = (slice?: keyof T | string[] | "@global"): any => {
    if (currentState.value === undefined || slice === undefined || typeof slice === "string" && slice == "@global") {
      return currentState.value as T;
    } else if (typeof slice === "string") {
      return currentState.value[slice] as T;
    } else if (Array.isArray(slice)) {
      return slice.reduce((acc, key) => {
        if (acc === undefined || acc === null) {
          return undefined;
        } else if (Array.isArray(acc)) {
          return acc[parseInt(key)];
        } else {
          return acc[key];
        }
      }, currentState.value) as T;
    } else {
      console.warn("Unsupported type of slice parameter");
    }
  }

  /**
   * Creates and initializes the store with the given main module configuration.
   * The store provides methods for dispatching actions, accessing state, and managing modules.
   *
   * @param {MainModule} mainModule - The main module configuration, including slice, middleware, reducer, metaReducers, dependencies, and strategy.
   * @returns {Store<any>} The initialized store object with methods like `dispatch`, `getState`, `select`, `loadModule`, `unloadModule`, `read`, and `settings`.
   */
  let storeCreator = (mainModule: MainModule, settings: StoreSettings = defaultStoreSettings) => {
    let defaultMainModule = {
      slice: "main",
      middleware: [],
      reducer: (state: any = {}) => state as Reducer,
      metaReducers: [],
      dependencies: {},
      strategy: "exclusive" as ProcessingStrategy
    };

    // Assign mainModule properties to store
    main = { ...defaultMainModule, ...mainModule };

    // Configure store pipeline
    pipeline = {...pipeline, ...{
      middleware: Array.from(main.middleware ?? []),
      reducer: combineReducers({[main.slice!]: main.reducer}),
      dependencies: {...main.dependencies},
      strategy: main.strategy!,
    }};

    // Apply middleware
    applyMiddleware();

    // Bind system actions
    sysActions = bindActionCreators(systemActions, (action: Action) => settings.dispatchSystemActions && dispatch(action));

    // Initialize state and mark store as initialized
    sysActions.initializeState();

    console.log("%cYou are using ActionStack. Happy coding! 🎉", "font-weight: bold;");

    lock.acquire()
      .then(() => setupReducer())
      .then(state => setState("@global", state))
      .finally(() => lock.release());

    sysActions.storeInitialized();

    return {
      dispatch,
      getState,
      readSafe,
      select,
      loadModule,
      unloadModule
    } as Store<any>;
  }

  // Apply enhancer if provided
  if (typeof enhancer !== "undefined") {
    if (typeof enhancer !== "function") {
      console.warn(`Expected the enhancer to be a function. Instead, received: '${kindOf(enhancer)}'`);
    } else {
      // Apply the enhancer to the storeCreator function
      return enhancer(storeCreator)(main, settings);
    }
  }

  // If no enhancer provided, return the result of calling storeCreator
  return storeCreator(main, settings);
}
