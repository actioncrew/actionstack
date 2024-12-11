import { inject, InjectionToken, Injector, Type } from '@angular/core';
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
 *
 * This class defines properties that control various behaviors of a store for managing application state.
 */
export type StoreSettings = {
  dispatchSystemActions: boolean;
  awaitStatePropagation: boolean;
  enableMetaReducers: boolean;
  enableAsyncReducers: boolean;
};

const defaultStoreSettings = {
  dispatchSystemActions: true,
  awaitStatePropagation: true,
  enableMetaReducers: true,
  enableAsyncReducers: true
};

export type Store<T = any> = {
  dispatch: (action: Action | any) => Promise<void>;
  select: <R = any>(selector: (obs: Observable<T>, tracker?: Tracker) => Observable<R>, defaultValue?: any) => Observable<R>;
  getState: (slice?: keyof T | string[] | "@global") => any;
  loadModule: (module: FeatureModule) => Promise<void>;
  unloadModule: (module: FeatureModule, clearState: boolean) => Promise<void>;
  read: (slice: keyof T | string[] | "@global", callback: (state: Readonly<T>) => void | Promise<void>) => Promise<void>;
  settings: StoreSettings;
};

/**
 * Constant array containing system action types as strings.
 *
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
 *
 * This type is derived from the `SYSTEM_ACTION_TYPES` array using the `typeof` operator and ensures the type is also a string.
 */
export type SystemActionTypes = typeof SYSTEM_ACTION_TYPES[number] & string;

/**
 * Function to check if a given string is a system action type.
 *
 * @param type - The string to check.
 * @returns boolean - True if the type is a system action type, false otherwise.
 */
export function isSystemActionType(type: string): type is SystemActionTypes {
  return SYSTEM_ACTION_TYPES.includes(type as SystemActionTypes);
}

/**
 * Private function to create a system action.
 *
 * @param type - The system action type (string).
 * @param payload - Optional function or value to be attached as the payload.
 * @returns object - The created system action object.
 */
function systemAction<T extends SystemActionTypes>(type: T, payload?: Function) {
  return action(type, payload);
}

/**
 * Object containing action creator functions for all system action types.
 *
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
 * Class representing a state management store.
 *
 * This class provides functionalities for managing application state, including:
 *  * Storing the current state.
 *  * Dispatching actions to update the state.
 *  * Getting the current state.
 *  * Subscribing to changes in the state.
 */

export function createStore<T = any>(mainModule: MainModule, enhancer?: StoreEnhancer, storeSettings: StoreSettings = defaultStoreSettings): Store<T> {

  let main = { ...mainModule };
  let modules: FeatureModule[] = [];

  let pipeline = {
    middleware: [] as any[],
    reducer: ((state: any = {}, action: Action) => state) as AsyncReducer,
    dependencies: {} as Tree<Type<any> | InjectionToken<any>>,
    strategy: "exclusive" as ProcessingStrategy
  };
  const currentState = new BehaviorSubject<any>(undefined);
  const settings = { ...defaultStoreSettings, ...storeSettings };
  const tracker = createTracker();
  const lock = createLock();
  const stack = createExecutionStack();
  let sysActions = { ...systemActions };

  const dispatch = async (action: Action | any) => {
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

  const applyMiddleware = () => {
    let dispatch = async (action: any) => {
      console.warn("Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch.");
      return;
    };

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
        // If value is an object, add its children to the stack
        subtree[key] = {};
        stack.push(...Object.keys(value).map(childKey => ({ parent: value, key: childKey, subtree: subtree[key] })));
      } else {
        subtree[key] = value;
      }
    }
  }

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
        // If value is an object, recurse to handle its children
        subtree[key] = {};
        stack.push(...Object.keys(value).map(childKey => ({
          parent: value, key: childKey, subtree: subtree[key]
        })));
      } else {
        // If value is a simple value, set it directly
        subtree[key] = value;
      }
    }
  };

  /**
   * Loads a feature module into the store.
   * @param {FeatureModule} module - The feature module to load.
   * @param {Injector} injector - The injector to use for dependency injection.
   * @returns {Promise<void>}
   */
  const loadModule = (module: FeatureModule, injector: Injector): Promise<void> => {
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
   * Unloads a feature module from the store.
   * @param {FeatureModule} module - The feature module to unload.
   * @param {boolean} [clearState=false] - A flag indicating whether to clear the module's state.
   * @returns {Promise<void>}
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
   * Updates the state based on the provided slice and value, returning the updated state.
   * @param {keyof T | string[] | undefined} slice - The slice of the state to update.
   * @param {any} value - The new value to set for the specified slice.
   * @param {Action} [action=systemActions.updateState()] - The action to propagate after updating the state.
   * @returns {Promise<any>}  A promise that resolves to the updated state object.
   * @protected
   * @template T
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
   * Sets up the reducer function by combining feature reducers and applying meta reducers.
   * @param {any} [state={}] - The initial state.
   * @returns {Promise<any>} A promise that resolves to the updated state after setting up the reducer.
   * @protected
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
   * Executes a callback function after acquiring a lock and ensuring the system is idle.
   * @param {keyof T | string[]} slice - The slice of state to execute the callback on.
   * @param {(readonly state: ) => void} callback - The callback function to execute with the state.
   * @returns {Promise<void>} A promise that resolves after executing the callback.
   * @template T
   */
  const read = (slice: keyof T | string[], callback: (state:  Readonly<T>) => void | Promise<void>): Promise<void> => {
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
   * Gets the current state or a slice of the state from the store.
   * @param {keyof T | string[]} [slice] - The slice of the state to retrieve.
   * @returns {T | any} The current state or the selected slice of the state.
   * @throws {Error} Throws an error if the slice parameter is of unsupported type.
   * @template T
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
   * Function to create a store instance.
   * @param {MainModule} mainModule - The main module containing middleware, reducer, dependencies, and strategy.
   * @returns {Store} The created store instance.
   */
  let storeCreator = (mainModule: MainModule) => {
    let defaultMainModule = {
      slice: "main",
      middleware: [],
      reducer: (state: any = {}, action: Action) => state as Reducer,
      metaReducers: [],
      dependencies: {},
      strategy: "exclusive" as ProcessingStrategy
    };

    // Assign mainModule properties to store
    main = { ...defaultMainModule, ...mainModule };

    // Configure store pipeline
    pipeline = {...pipeline, ...{
      middleware: Array.from(mainModule.middleware ?? []),
      reducer: combineReducers({[mainModule.slice!]: mainModule.reducer}),
      dependencies: {...mainModule.dependencies},
      strategy: mainModule.strategy!,
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
      select,
      loadModule,
      unloadModule,
      read,
      settings,
    } as Store<any>;
  }

  // Apply enhancer if provided
  if (typeof enhancer !== "undefined") {
    if (typeof enhancer !== "function") {
      console.warn(`Expected the enhancer to be a function. Instead, received: '${kindOf(enhancer)}'`);
    } else {
      // Apply the enhancer to the storeCreator function
      return enhancer(storeCreator)(main);
    }
  }

  // If no enhancer provided, return the result of calling storeCreator
  return storeCreator(main);
}
