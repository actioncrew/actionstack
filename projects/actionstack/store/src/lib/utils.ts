import { Action, AsyncReducer, StoreCreator, StoreEnhancer, Tree } from "./types";


/**
   * Updates a nested state object by applying a change to the specified path and value.
   * Ensures that intermediate nodes in the state are properly cloned or created, preserving immutability
   * for unchanged branches. Tracks visited nodes in the provided object tree to avoid redundant updates.
   */
function applyChange(initialState: any, {path, value}: {path: string[], value: any}, objTree: Tree<boolean>): any {
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
 * Combines reducers into a single reducer function.
 * Initializes the default state by invoking each reducer with `undefined` and a special `@@INIT` action.
 */
const combineReducers = (reducers: Tree<AsyncReducer>): AsyncReducer => {
  /**
   * Helper to validate reducers and flatten them into a single map.
   */
  const flattenReducers = (tree: Tree<AsyncReducer>, path: string[] = []): Map<string, { reducer: AsyncReducer; path: string[] }> => {
    const reducerMap = new Map<string, { reducer: AsyncReducer; path: string[] }>();
    for (const key in tree) {
      const reducer = tree[key];
      const currentPath = [...path, key];
      if (typeof reducer === "function") {
        reducerMap.set(currentPath.join("."), { reducer, path: currentPath });
      } else if (typeof reducer === "object") {
        const childReducers = flattenReducers(reducer, currentPath);
        for (const [childKey, childReducer] of childReducers) {
          reducerMap.set(childKey, childReducer);
        }
      } else {
        throw new Error(`Invalid reducer at path: ${currentPath.join(".")}`);
      }
    }
    return reducerMap;
  };

  const reducerMap = flattenReducers(reducers);

  /**
   * Helper to build the initial state by calling reducers with undefined state and a special `@@INIT` action.
   */
  const gatherInitialState = async (): Promise<any> => {
    const initialState: any = {};
    for (const { reducer, path } of reducerMap.values()) {
      const key = path[path.length - 1]; // Get the last key in the path as the state slice
      const initState = await reducer(undefined, { type: "@@INIT" } as Action);
      let cursor = initialState;
      for (let i = 0; i < path.length - 1; i++) {
        cursor[path[i]] = cursor[path[i]] || {};
        cursor = cursor[path[i]];
      }
      cursor[key] = initState;
    }
    return initialState;
  };

  /**
   * Combined reducer function.
   */
  return async (state: any, action: Action): Promise<any> => {
    if (state === undefined) {
      state = await gatherInitialState();
    }
    let hasChanged = false;
    const modified: any = {}; // To track the modifications
    const nextState = { ...state };

    for (const { reducer, path } of reducerMap.values()) {
      const key = path[path.length - 1];
      const currentState = path.reduce((acc, key) => acc[key], state);
      try {
        const updatedState = await reducer(currentState, action);
        if (currentState !== updatedState) {
          hasChanged = true;
          // Apply the change to the state using applyChange
          state = await applyChange(state, { path, value: updatedState }, modified);
        }
      } catch (error: any) {
        console.error(
          `Error processing reducer at "${path.join(".")}" with action "${action.type}": ${error.message}`
        );
      }
    }

    // Return the state only if it has changed
    return hasChanged ? state : nextState;
  };
};

/**
 * Applies middleware to the store's dispatch function.
 * Middleware enhances the dispatch function, allowing actions to be intercepted and modified.
 *
 * @param {...Function[]} middlewares Middleware functions to apply.
 * @returns A store enhancer that applies the middleware to the store.
 */
const applyMiddleware = (...middlewares: Function[]): StoreEnhancer => {
  const enhancer: StoreEnhancer = (next) => (mainModule, settings, enhancer) => {
    // Create the store with the original reducer and enhancer
    const store = next(mainModule, settings, enhancer);

    // Define starter and middleware APIs
    const middlewareAPI = store.getMiddlewareAPI();

    // Build middleware chain
    const chain = [store.starter(middlewareAPI), ...middlewares.map(middleware => middleware(middlewareAPI))] as any[];

    // Compose the middleware chain into a single dispatch function
    let dispatch = chain.reduceRight(
      (next, middleware) => middleware(next),
      store.dispatch
    );

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