import { AsyncReducer, Reducer, StoreEnhancer, Tree } from "./types";
/**
   * Updates a nested state object by applying a change to the specified path and value.
   * Ensures that intermediate nodes in the state are properly cloned or created, preserving immutability
   * for unchanged branches. Tracks visited nodes in the provided object tree to avoid redundant updates.
   */
declare function applyChange(initialState: any, { path, value }: {
    path: string[];
    value: any;
}, objTree: Tree<boolean>): any;
/**
 * Combines multiple store enhancers into a single enhancer function.
 * This allows multiple enhancers to be applied in sequence to the store.
 * Typically used for combining middleware, logging, or other store customizations.
 *
 * @param enhancers - An array of store enhancers to be combined.
 * @returns A single store enhancer that applies all provided enhancers.
 */
declare function combineEnhancers(...enhancers: StoreEnhancer[]): StoreEnhancer;
/**
 * Combines reducers into a single reducer function.
 * Initializes the default state by invoking each reducer with `undefined` and a special `@@INIT` action.
 */
declare const combineReducers: (reducers: Tree<Reducer | AsyncReducer>) => AsyncReducer;
/**
 * Applies middleware to the store's dispatch function.
 * Middleware enhances the dispatch function, allowing actions to be intercepted and modified.
 *
 * @param {...Function[]} middlewares Middleware functions to apply.
 * @returns A store enhancer that applies the middleware to the store.
 */
declare const applyMiddleware: (...middlewares: Function[]) => StoreEnhancer;
export { applyChange, applyMiddleware, combineEnhancers, combineReducers, };
