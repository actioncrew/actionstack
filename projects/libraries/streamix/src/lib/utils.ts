import { Action, AsyncReducer, Reducer, StoreCreator, StoreEnhancer, Tree } from "./types";

/**
 * Retrieves a property from an object based on a path.
 * @param obj - The object to retrieve the property from.
 * @param path - The path to the property (e.g., "key" or ["user", "name"]).
 * @returns The value of the property or `undefined` if the path is invalid.
 */
export const getProperty = <T>(obj: any, path: keyof T | string[] | '*'): T | undefined => {
  // Handle global state request
  if (path === '*') {
    return obj as T;
  }

  // Handle string path (single key)
  if (typeof path === 'string') {
    return obj[path] as T;
  }

  // Handle array path (nested keys)
  if (Array.isArray(path)) {
    return path.reduce((acc, key) => {
      if (acc === undefined || acc === null) {
        return undefined;
      }
      // Handle array indices (e.g., "0" -> 0)
      const index = !isNaN(Number(key)) ? Number(key) : key;
      return acc[index];
    }, obj) as T;
  }

  // Handle unsupported path types
  console.warn('Unsupported type of path parameter');
  return undefined;
};

/**
 * Sets a property in an object based on a path.
 * @param obj - The object to update.
 * @param path - The path to the property (e.g., "key" or ["user", "name"]).
 * @param value - The new value to set at the specified path.
 * @returns The updated object.
 */
export const setProperty = <T>(obj: any, path: keyof T | string[] | '*', value: any): T => {
  // Handle global state update
  if (path === '*') {
    return { ...value }; // Shallow copy of the value
  }

  // Handle string path (single key)
  if (typeof path === 'string') {
    return {
      ...obj, // Shallow copy of the object
      [path]: { ...value }, // Shallow copy of the value for the specified key
    };
  }

  // Handle array path (nested keys)
  if (Array.isArray(path)) {
    const newObj = { ...obj }; // Shallow copy of the object
    let current = newObj;

    for (let i = 0; i < path.length; i++) {
      const key = path[i];

      // If this is the last key, set the value
      if (i === path.length - 1) {
        current[key] = value;
      }
      // Otherwise, continue traversing
      else {
        // Create a shallow copy of the nested object if it doesn't exist
        if (current[key] === undefined || current[key] === null) {
          current[key] = {};
        } else {
          current[key] = { ...current[key] }; // Shallow copy to ensure immutability
        }
        current = current[key];
      }
    }

    return newObj as T;
  }

  // Handle unsupported path types
  console.warn('Unsupported type of path parameter');
  return obj; // Return the object unchanged
};

/**
 * Combines multiple store enhancers into a single enhancer function.
 * This allows multiple enhancers to be applied in sequence to the store.
 * Typically used for combining middleware, logging, or other store customizations.
 *
 * @param enhancers - An array of store enhancers to be combined.
 * @returns A single store enhancer that applies all provided enhancers.
 */
function combineEnhancers(...enhancers: StoreEnhancer[]): StoreEnhancer {
  // Collect the names of the enhancers for later access
  const methodNames = enhancers.map(enhancer => enhancer.name);

  // Create a new combined enhancer that wraps the enhancers
  const combinedEnhancer = (next: StoreCreator) => {
    // Apply each enhancer in the chain
    return enhancers.reduceRight(
      (acc, enhancer) => enhancer(acc),
      next
    );
  };

  // Attach the names of the enhancers to the combined enhancer
  combinedEnhancer.names = methodNames;

  return combinedEnhancer;
}

/**
 * Deeply merges two objects, combining nested trees of state.
 *
 * This function recursively merges properties of the `source` object into
 * the `target` object. If a key exists in both and both values are plain
 * objects, their contents are merged. Arrays and non-object values are overwritten.
 *
 * @template T - The type of the target object.
 * @template S - The type of the source object.
 * @param {T} target - The target object to merge into.
 * @param {S} source - The source object to merge from.
 * @returns {T & S} - A new object that is the result of deeply merging `target` and `source`.
 *
 * @example
 * const a = { foo: { bar: 1 }, baz: 2 };
 * const b = { foo: { qux: 3 } };
 * const result = deepMerge(a, b);
 * // result -> { foo: { bar: 1, qux: 3 }, baz: 2 }
 */
export function deepMerge(target: any, source: any): any {
  const output = { ...target };
  for (const key of Object.keys(source)) {
    if (
      typeof source[key] === 'object' &&
      source[key] !== null &&
      !Array.isArray(source[key])
    ) {
      output[key] = deepMerge(output[key] ?? {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output;
}

/**
 * Combines reducers into a single reducer function.
 * Initializes the default state by invoking each reducer with `undefined` and a special `@@INIT` action.
 */
const combineReducers = (reducers: Tree<Reducer | AsyncReducer>): AsyncReducer => {
  /**
   * Helper to validate reducers and flatten them into a single map.
   *
   * This recursively flattens the nested reducer tree and ensures all reducer paths are captured in the map.
   */
  const flattenReducers = (tree: Tree<Reducer | AsyncReducer>, path: string[] = []): Map<string, { reducer: AsyncReducer; path: string[] }> => {
    const reducerMap = new Map<string, { reducer: AsyncReducer; path: string[] }>();

    for (const key in tree) {
      const reducer = tree[key];
      const currentPath = [...path, key];

      if (typeof reducer === "function") {
        reducerMap.set(currentPath.join("."), { reducer, path: currentPath });
      } else if (typeof reducer === "object" && reducer !== null) {
        // Recursively flatten the nested reducers.
        const childReducers = flattenReducers(reducer, currentPath);
        childReducers.forEach((childReducer, childKey) => {
          reducerMap.set(childKey, childReducer);
        });
      } else {
        throw new Error(`Invalid reducer at path: ${currentPath.join(".")}`);
      }
    }

    return reducerMap;
  };

  const reducerMap = flattenReducers(reducers);

  /**
   * Helper to build the initial state by calling reducers with undefined state and a special `@@INIT` action.
   *
   * It gathers the initial state for each reducer, ensuring the nested structure is respected.
   */
  const gatherInitialState = async (): Promise<any> => {
    const initialState: any = {};

    for (const { reducer, path } of reducerMap.values()) {
      const key = path[path.length - 1]; // Get the last key in the path as the state slice
      try {
        const initState = await reducer(undefined, { type: "@@INIT" } as Action);
        let cursor = initialState;
        for (let i = 0; i < path.length - 1; i++) {
          cursor[path[i]] = cursor[path[i]] || {};
          cursor = cursor[path[i]];
        }
        cursor[key] = initState;
      } catch (error: any) {
        console.error(`Error initializing state at path "${path.join('.')}" with action "@@INIT": ${error.message}`);
      }
    }

    return initialState;
  };

  /**
   * Combined reducer function.
   *
   * It processes each reducer asynchronously and ensures the state is only updated if necessary.
   */
  return async (state: any, action: Action): Promise<any> => {
    if (state === undefined) {
      state = await gatherInitialState();
    }

    let hasChanged = false;
    const modified: any = {}; // To track the modifications
    const nextState = { ...state };

    // Process each reducer in the flattened reducer map
    for (const { reducer, path } of reducerMap.values()) {
      const key = path[path.length - 1];
      const currentState = path.reduce((acc, key) => acc[key], state);

      try {
        const updatedState = await reducer(currentState, action);
        if (currentState !== updatedState) {
          hasChanged = true;
          // Apply the change to the state using applyChange
          state = await applyChange(state, path, updatedState, modified);
        }
      } catch (error: any) {
        console.error(
          `Error processing reducer at "${path.join(".")}" with action "${action.type}": ${error.message}`
        );
      }
    }

    // Return the state only if it has changed, otherwise return the previous state.
    return hasChanged ? state : nextState;
  };
};

/**
 * Updates a nested state object by applying a change to the specified path and value.
 * Ensures that intermediate nodes in the state are properly cloned or created, preserving immutability
 * for unchanged branches. Tracks visited nodes in the provided object tree to avoid redundant updates.
 */
function applyChange(initialState: any, path: string[], value: any, objTree: Tree<boolean>): any {
  let currentState: any = Object.keys(objTree).length > 0 ? initialState: {...initialState};
  let currentObj: any = currentState;

  for (let i = 0; i < path.length; i++) {
    const key = path[i];
    if (i === path.length - 1) {
      // Reached the leaf node, update its value
      currentObj[key] = value;
      objTree[key] = true;
    } else {
      // Continue traversal
      currentObj = currentObj[key] = objTree[key] ? currentObj[key] : { ...currentObj[key] };
      objTree = (objTree[key] = objTree[key] ?? {}) as any;
    }
  }
  return currentState;
}

/**
 * Applies middleware to the store's dispatch function.
 * Middleware enhances the dispatch function, allowing actions to be intercepted and modified.
 *
 * @param {...Function[]} middlewares Middleware functions to apply.
 * @returns A store enhancer that applies the middleware to the store.
 */
const applyMiddleware = (...middlewares: Function[]): StoreEnhancer => {
  const enhancer: StoreEnhancer = (next) => (settings, enhancer) => {
    // Create the store with the original reducer and enhancer
    const store = next(settings, enhancer);

    // Define starter and middleware APIs
    const middlewareAPI = store.getMiddlewareAPI();

    // Build middleware chain
    const chain = [store.starter, ...middlewares].map(middleware => middleware(middlewareAPI));

    // Compose the middleware chain into a single dispatch function
    let dispatch = chain.reduceRight(
      (next, middleware) => middleware(next),
      store.dispatch
    );

    middlewareAPI.dispatch = dispatch;

    // Return the enhanced store
    return {
      ...store,
      dispatch, // Overwrite dispatch with the enhanced dispatch
    };
  };

  // Ensure the 'name' property is properly set for the enhancer
  Object.defineProperty(enhancer, 'name', { value: 'applyMiddleware' });
  return enhancer;
};

export {
  applyChange,
  applyMiddleware,
  combineEnhancers,
  combineReducers,
}
