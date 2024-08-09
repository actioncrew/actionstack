import { InjectionToken, Type } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';

import { Store } from './store';

/**
 * Interface defining the structure of an action object.
 *
 * Actions are the primary way to communicate state changes in Actionstack-like stores.
 * This interface defines the expected properties for an action.
 *
 * @typeparam T - Optional type parameter for the action payload. Defaults to `any`.
 */
export interface Action<T = any> {
  type: string;
  payload?: T;
  error?: boolean;
  meta?: any;
  source?: any;
}

/**
 * Interface defining the structure of an asynchronous action.
 *
 * Asynchronous actions are functions that return promises, allowing for
 * handling asynchronous operations like network requests or timers within actions.
 *
 * @typeparam T - Optional type parameter for the action payload type (resolved promise value). Defaults to `any`.
 */
export interface AsyncAction<T = any> {
  (...args: any[]): Promise<T>;
}

/**
 * Represents an action creator.
 * @template T The type of the action payload.
 */
export type ActionCreator<T = any> = ((...args: any[]) => Action<T> | AsyncAction<T>) & {
  toString(): string;
  type: string;
  match(action: Action<T>): boolean;
}

/**
 * A function that takes the current state and an action, and returns
 * the updated state (excluding promises).
 */
export type Reducer = (state: any, action: Action) => Exclude<any, Promise<any>>;

/**
 * Type alias for an asynchronous reducer function.
 *
 * An asynchronous reducer is a function that takes the current state and an action object as arguments.
 * It returns a promise that resolves to the updated state after potentially performing asynchronous operations.
 *
 * @param state - The current state of the application.
 * @param action - The action object being dispatched.
 * @returns Promise<any> - A promise that resolves to the updated state after asynchronous operations (if any).
 */
export type AsyncReducer = (state: any, action: Action) => Promise<any>;

/**
 * Type alias for a meta-reducer function.
 *
 * A meta-reducer is a higher-order function that takes an asynchronous reducer as an argument.
 * It returns a promise that resolves to a potentially modified asynchronous reducer.
 * Meta-reducers are used to apply additional logic or middleware functionality around reducers.
 *
 * @param reducer - The asynchronous reducer function to be wrapped or modified.
 * @returns Promise<AsyncReducer> - A promise that resolves to a potentially modified asynchronous reducer.
 */
export type MetaReducer = (reducer: AsyncReducer) => Promise<AsyncReducer>;

/**
 * Interface defining the structure of a middleware function.
 *
 * Middleware functions are used to intercept, handle, and potentially modify the dispatching process in Actionstack-like stores.
 * This interface defines the expected behavior for a middleware function.
 *
 * @property (store: Store) => (next: (action: any) => any) => Promise<(action: any) => any> | any
 *  - A function that takes the store instance as an argument.
 *  - It returns another function that takes the `next` function in the middleware chain as an argument.
 *  - The inner function can perform logic before and/or after calling the `next` function with the action.
 *  - It can optionally return a promise that resolves to a modified version of the `next` function,
 *      allowing for asynchronous middleware behavior.
 *  - Alternatively, it can return any value to potentially short-circuit the middleware chain.
 *
 * @property signature?: string (optional)
 *  - An optional string property that can be used to define a signature for the middleware,
 *      aiding in type checking and documentation.
 */
export interface Middleware {
  (store: any): (next: Function) => (action: Action) => Promise<any>;
  signature?: string;
}

/**
 * Represents an observer that receives notifications of values from an Observable.
 * @interface
 * @template T The type of the value being observed.
 */
export interface Observer<T> {
  next: (value: T) => void;
  error: (err: any) => void;
  complete: () => void;
}

/**
 * Represents an asynchronous observer that receives notifications of values from an Observable.
 * @interface
 * @template T The type of the value being observed.
 */
export interface AsyncObserver<T> {
  next: (value: T) => Promise<void>;
  error: (err: any) => Promise<void>;
  complete: () => Promise<void>;
}

/**
 * Interface representing an operator function for transforming observables.
 *
 * An operator function takes an input `Observable<T>` and returns an output `Observable<R>`.
 *
 * @typeParam T - The type of the input elements.
 * @typeParam R - The type of the output elements.
 */
export interface OperatorFunction<T, R> {
  (source: Observable<T>): Observable<R>
}

/**
 * Type alias for any function that takes any number of arguments and returns anything.
 *
 * This type is used to represent a generic function without specifying a specific argument or return type.
 * It can be helpful for situations where the exact function signature is not important.
 */
export type AnyFn = (...args: any[]) => any;

/**
 * Interface defining the structure of a selector function.
 *
 * Selectors are functions that extract specific data or derived values from the Actionstack store's state.
 * This interface defines the expected behavior for a selector function.
 *
 * @param state - The current state of the application.
 * @param props?: any (optional) - Optional props object that can be used by the selector for additional logic.
 * @returns any - The selected value or derived data from the state.
 */
export interface SelectorFunction {
  (state: any, props?: any): any;
}

/**
 * Interface defining the structure of a projection function.
 *
 * Projection functions are similar to selector functions, but they can handle projecting data from
 * either a single state object or an array of state objects.
 * This interface defines the expected behavior for a projection function.
 *
 * @param state - The current state of the application (can be a single object or an array of state objects).
 * @param props?: any (optional) - Optional props object that can be used by the projection function for additional logic.
 * @returns any - The projected value or derived data from the state.
 */
export interface ProjectionFunction {
  (state: any | any[], props?: any): any;
}

/**
 * Type alias representing a recursive tree structure.
 *
 * This type is used to define nested objects in a hierarchical way.
 * - `LeafType`: The type for the leaf nodes of the tree (representing the base values).
 * - `T`: Optional type parameter for the root object type (defaults to `any`).
 *
 * The structure works as follows:
 *  - For each property key `K` in the root object type `T`:
 *      - If the property value `T[K]` is an object:
 *          - The type for that property becomes another `Tree` instance, recursively defining the nested structure.
 *      - If the property value `T[K]` is not an object:
 *          - The type for that property becomes the `LeafType`.
 *
 * This type allows for representing complex object structures with nested objects and leaf nodes.
 */
export type Tree<LeafType, T = any> = {
  [K in keyof T]: T[K] extends object ? Tree<LeafType, T[K]> : LeafType;
};

/**
 * Type alias representing processing strategies for side epics.
 *
 */
export type ProcessingStrategy = "exclusive" | "concurrent";

/**
 * Type alias representing slice strategies.
 *
 */
export type SliceStrategy = "persistent" | "temporary";

/**
 * Interface defining the structure of a feature module.
 *
 * Feature modules are used to organize state and logic for specific parts of an application.
 * This interface defines the expected properties for a feature module.
 *
 * @property slice - A unique string identifier for the feature module's state slice in the store.
 * @property reducer - The reducer function or a tree of reducers responsible for managing the state of the feature.
 *                  - A reducer function takes the current state slice and an action object,
 *                    and returns the updated state slice based on the action.
 *                  - A tree of reducers allows for defining nested reducers for complex state structures.
 * @property dependencies?: Tree<Type<any> | InjectionToken<any>> (optional) -
 *                   An optional tree representing the dependencies required by the feature module.
 *                   - These dependencies can be types (like classes or interfaces) or injection tokens
 *                     used for dependency injection.
 *                   - The tree structure allows for specifying nested dependencies within the feature.
 */
export interface FeatureModule {
  slice: string;
  reducer: Reducer | Tree<Reducer>;
  dependencies?: Tree<Type<any> | InjectionToken<any>>;
}

/**
 * Interface defining the structure of the main application module.
 *
 * The main application module serves as the entry point for configuring the Actionstack store.
 * This interface defines the expected properties for the main application module.
 *
 * @property slice?: string (optional) - A unique string identifier for the main application's state slice (if applicable).
 * @property middleware?: Middleware[] (optional) - An array of middleware functions to be applied to the store.
 *                  - Middleware functions intercept, handle, and potentially modify the dispatching process.
 * @property reducer - The reducer function or a tree of reducers responsible for managing the entire application state.
 * @property metaReducers?: MetaReducer[] (optional) - An array of meta-reducer functions to be applied to the reducers.
 *                  - Meta-reducers are higher-order functions that can wrap and potentially modify reducers,
 *                    adding additional logic or middleware functionality.
 * @property dependencies?: Tree<Type<any> | InjectionToken<any>> (optional) -
 *                   An optional tree representing the dependencies required by the main application.
 *                   - These dependencies can be types or injection tokens used for dependency injection.
 *                   - The tree structure allows for specifying nested dependencies.
 * @property strategy?: ProcessingStrategy (optional) - The processing strategy for side epics within the application.
 *                  - This defines how side epics (functions performing actions outside the dispatch cycle) are executed.
 *                  - Possible strategies are "exclusive" (run one at a time) or "concurrent" (run in parallel).
 */
export interface MainModule {
  slice?: string;
  middleware?: Middleware[];
  reducer: Reducer | Tree<Reducer>;
  metaReducers?: MetaReducer[];
  dependencies?: Tree<Type<any> | InjectionToken<any>>;
  strategy?: ProcessingStrategy;
}

/**
 * Type alias for a store creation function.
 *
 * This type represents a function that takes the main application module configuration and an optional store enhancer,
 * and returns a newly created Actionstack store instance.
 *
 * @param module - The main application module object containing the store configuration.
 * @param enhancer?: StoreEnhancer (optional) - A store enhancer function that can be used to apply additional
 *                     functionality or middleware to the store creation process.
 * @returns Store - A newly created Actionstack store instance.
 */
export type StoreCreator = (module: MainModule, enhancer?: StoreEnhancer) => Store;

/**
 * Type alias for a store enhancer function.
 *
 * This type represents a function that takes the next store creation function as an argument,
 * and returns a new store creation function potentially with additional functionality.
 * Store enhancers are used to extend the capabilities of the store creation process.
 *
 * @param next - The next store creation function in the chain (typically the default store creator).
 * @returns StoreCreator - A new store creation function that potentially wraps the original one
 *                         and provides additional functionality.
 */
export type StoreEnhancer = (next: StoreCreator) => StoreCreator;

/**
 * Determines the type of a given value.
 *
 * This function attempts to identify the underlying type of a JavaScript value
 * using a combination of checks and built-in functions.
 *
 * @param val - The value to determine the type for.
 * @returns string - A string representing the type of the value (e.g., "undefined", "string", "array", etc.).
 */
function kindOf(val: any): string {
  if (val === undefined)
    return "undefined";
  if (val === null)
    return "null";

  const type = typeof val;
  switch (type) {
    case "boolean":
    case "string":
    case "number":
    case "symbol":
    case "function": {
      return type;
    }
  }

  if (Array.isArray(val))
    return "array";

  if (isDate(val))
    return "date";

  if (isError(val))
    return "error";

  if (isObservable(val))
    return "observable";

  if (isPromise(val))
    return "promise";

  const constructorName = ctorName(val);
  switch (constructorName) {
    case "Symbol":
    case "WeakMap":
    case "WeakSet":
    case "Map":
    case "Set":
      return constructorName;
  }

  return Object.prototype.toString.call(val).slice(8, -1).toLowerCase().replace(/\s/g, "");
}

/**
 * Attempts to get the constructor name of a value.
 *
 * This function checks if the value has a constructor that is a function,
 * and if so, it returns the name of the constructor. Otherwise, it returns null.
 *
 * @param val - The value to get the constructor name for.
 * @returns string - The name of the constructor (if applicable), otherwise null.
 */
function ctorName(val: any): string {
  return typeof val.constructor === "function" ? val.constructor.name : null;
}

/**
 * Checks if a value is an Error object.
 *
 * This function uses two criteria to determine if a value is an Error:
 *   - It checks if the value is an instance of the built-in `Error` class.
 *   - It checks if the value has a string property named "message" and a constructor with a number property named "stackTraceLimit".
 *
 * @param val - The value to check if it's an Error.
 * @returns boolean - True if the value is an Error, false otherwise.
 */
function isError(val: any): boolean {
  return val instanceof Error || typeof val.message === "string" && val.constructor && typeof val.constructor.stackTraceLimit === "number";
}

/**
 * Checks if a value is a Date object.
 *
 * This function uses two approaches to determine if a value is a Date:
 *   - It checks if the value is an instance of the built-in `Date` class.
 *   - It checks if the value has functions named `toDateString`, `getDate`, and `setDate`.
 *
 * @param val - The value to check if it's a Date.
 * @returns boolean - True if the value is a Date, false otherwise.
 */
function isDate(val: any): boolean {
  if (val instanceof Date)
    return true;

  return typeof val.toDateString === "function" && typeof val.getDate === "function" && typeof val.setDate === "function";
}

/**
 * Checks if a value is a boxed primitive.
 *
 * This function checks if a value is not `undefined` or `null`, and its value doesn't strictly equal itself when called with `valueOf()`.
 * Primitive values wrapped in their corresponding object representations (e.g., new Number(10)) are considered boxed.
 *
 * @param value - The value to check if it's boxed.
 * @returns boolean - True if the value is a boxed primitive, false otherwise.
 */
function isBoxed(value: any) {
  return value !== undefined && value !== null && value.valueOf() !== value;
}

/**
 * Checks if a value is a Promise object.
 *
 * This function uses a trick to identify promises. It resolves the value with `Promise.resolve` and compares the resolved value with the original value.
 * If they are the same, it's likely a promise.
 *
 * @param value - The value to check if it's a Promise.
 * @returns boolean - True if the value is a Promise, false otherwise.
 */
function isPromise(value: any) {
  return Promise.resolve(value) == value;
}

/**
 * Checks if a value is a valid Actionstack action object.
 *
 * This function determines if the provided value is a valid action object
 * used in Actionstack for dispatching state changes.
 *
 * @param action - The value to check if it's a Actionstack action.
 * @returns boolean - True if the value is a plain object with a string property named "type", false otherwise.
 */
function isAction(action: any): boolean {
  return isPlainObject(action) && "type" in action && typeof action.type === "string";
}

/**
 * Checks if a function is an async function.
 *
 * This function uses the constructor name to determine if the provided function
 * is an async function introduced in ES2018.
 *
 * @param func - The function to check if it's an async function.
 * @returns boolean - True if the function's constructor name is "AsyncFunction", false otherwise.
 */
function isAsync(func: Function) {
  return func.constructor.name === "AsyncFunction";
}

/**
 * Checks if a value is a plain object.
 *
 * This function determines if the provided value is a plain object (an object
 * that doesn't inherit from other prototypes).
 *
 * @param obj - The value to check if it's a plain object.
 * @returns boolean - True if the value is an object and its prototype is the same as the Object.prototype, false otherwise.
 */
function isPlainObject(obj: any): boolean {
  if (typeof obj !== "object" || obj === null)
    return false;

  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(obj) === proto;
}

/**
 * Tests to see if the object is an RxJS {@link Observable}
 * @param obj the object to test
 */
function isObservable(obj: any): obj is Observable<unknown> {
  // The !! is to ensure that this publicly exposed function returns
  // `false` if something like `null` or `0` is passed.
  return !!obj && (obj instanceof Observable || (typeof obj.lift === 'function' && typeof obj.subscribe === 'function'));
}

/**
 * Observable that immediately completes without emitting any values
 */
export const EMPTY = new Observable<never>((subscriber) => {
  subscriber.complete();
});

export { isAction, isAsync, isBoxed, isObservable, isPlainObject, isPromise, kindOf };

