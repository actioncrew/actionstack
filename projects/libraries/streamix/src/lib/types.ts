import { Stream, Subject } from '@actioncrew/streamix';
import { ExecutionStack, SimpleLock, Store, StoreSettings } from '../lib';

/**
 * Describes a standard action object used to signal state changes.
 *
 * Actions are dispatched to update the state in Actionstack-like stores.
 *
 * @template T - Type of the action payload. Defaults to `any`.
 */
export interface Action<T = any> {
  type: string;
  payload?: T;
  error?: boolean;
  meta?: any;
  source?: any;
}

/**
 * Represents an asynchronous action (thunk) that can dispatch other actions and access state.
 *
 * Used for side effects and complex state flows. Receives utilities for dispatching, reading state,
 * and accessing app-level dependencies.
 *
 * @template TState - The shape of the application or relevant state.
 * @template TDependencies - The structure of the dependencies object.
 *
 * @param dispatch - Function to dispatch synchronous or asynchronous actions.
 * @param getState - Function to retrieve the current state.
 * @param dependencies - Application dependencies injected into async logic.
 * @returns A Promise that resolves when the async operation finishes.
 */
export interface AsyncAction<TState = any, TDependencies extends Record<string, any> = Record<string, any>> {
  (
    dispatch: (action: Action | AsyncAction<TState, TDependencies>) => Promise<void>,
    getState: () => TState,
    dependencies: TDependencies
  ): Promise<void>;
}

/**
 * Creates a synchronous action with optional metadata and helpers for identification.
 *
 * @template TPayload - Type of the payload for the created action.
 * @template TType - String literal type of the action.
 * @template TArgs - Argument types accepted by the action creator function.
 *
 * @returns A function that produces an {@link Action} when invoked, with metadata for matching and debugging.
 */
export type ActionCreator<
  TPayload = any,
  TType extends string = string,
  TArgs extends readonly any[] = any[]
> = ((...args: TArgs) => Action<TPayload>) & {
  handler: ActionHandler;
  toString(): string;
  type: TType;
  match(action: Action<TPayload>): boolean;
};

/**
 * A factory for creating asynchronous actions (thunks) with built-in metadata.
 *
 * @template T - The string type identifier for the thunk.
 * @template Thunk - The thunk function type (typically {@link AsyncAction}).
 * @template Args - Argument types accepted by the thunk creator function.
 *
 * @property type - Unique string identifier for this thunk.
 * @property toString - Returns the thunk's type string.
 * @property match - Determines if a given action matches this thunk.
 * @property isThunk - Always `true`, used to distinguish thunks from normal actions.
 *
 * @returns A callable that produces an {@link AsyncAction} when invoked with `Args`.
 */
export type ThunkCreator<T extends string = string, Thunk extends AsyncAction = AsyncAction, Args extends any[] = any[]> = {
  (...args: Args): Thunk;
  type: T;
  toString: () => T;
  match: (action: Action<any> | AsyncAction) => boolean;
  isThunk: boolean;
};

/**
 * @template T - The type of the state slice that this handler operates on.
 *
 * Defines a function that handles a specific action type to update state.
 *
 * An `ActionHandler` receives the current state of a slice and the payload
 * of the action that triggered it. It is responsible for computing and
 * returning the new state for that slice. The handler can be synchronous
 * (returning `T`) or asynchronous (returning `Promise<T>`), though typically
 * state updates themselves are synchronous results of an async action having completed its side effects.
 *
 * @param {T} state - The current state of the slice.
 * @param {any} [payload] - The payload of the action that triggered this handler. Optional, as not all actions have payloads.
 * @returns {T | Promise<T>} The new state of the slice, or a Promise resolving to the new state.
 */
export type ActionHandler<State = any, Payload = any> =
  (state: State, payload: Payload) => State;

/**
 * A function that takes the current state and an action, and returns
 * the updated state (excluding promises).
 */
export type Reducer<T = any> = (state: T, action: Action) => T;

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
export type AsyncReducer<T = any> = (state: T, action: Action) => Promise<T>;

/**
 * Defines the methods and properties available to middleware for interacting with the store.
 * Provides access to state, dispatching actions, dependencies, processing strategy,
 * synchronization, and execution stack.
 *
 * @property {function([string[]]): any} getState - Retrieves the state or a specific slice of the state.
 * @property {function(Action|AsyncAction): Promise<void>} dispatch - Dispatches an action (synchronous or asynchronous).
 * @property {function(): any} dependencies - Retrieves the current dependencies in the pipeline.
 * @property {function(): ProcessingStrategy} strategy - Retrieves the current processing strategy.
 * @property {SimpleLock} lock - A lock to synchronize or prevent concurrent access to resources.
 * @property {ExecutionStack} stack - The execution stack tracking the sequence of actions or operations.
 */
export type MiddlewareAPI = {
  getState: (slice?: string[]) => any;
  dispatch: (action: Action | AsyncAction) => Promise<void>;
  dependencies: () => any;
  strategy: () => ProcessingStrategy;
  lock: SimpleLock;
  stack: ExecutionStack;
}

/**
 * Interface defining the structure of a middleware function.
 *
 * Middleware functions are used to intercept, handle, and potentially modify the dispatching process in Actionstack-like stores.
 * This interface defines the expected behavior for a middleware function.
 *
 * @property (api: Store) => (next: Function) => (action: any) => Promise<any> | any
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
  (api: any): (next: Function) => (action: Action) => Promise<any> | any;
  signature?: string;
}

/**
 * Represents an observer that receives notifications of values from an Stream.
 * @interface
 * @template T The type of the value being observed.
 */
export interface Observer<T> {
  next: (value: T) => void;
  error: (err: any) => void;
  complete: () => void;
}

/**
 * Represents an asynchronous observer that receives notifications of values from an Stream.
 * @interface
 * @template T The type of the value being observed.
 */
export interface AsyncObserver<T> {
  next: (value: T) => Promise<void>;
  error: (err: any) => Promise<void>;
  complete: () => Promise<void>;
}

/**
 * Interface representing an operator function for transforming streams.
 *
 * An operator function takes an input `Stream<T>` and returns an output `Stream<R>`.
 *
 * @typeParam T - The type of the input elements.
 * @typeParam R - The type of the output elements.
 */
export interface OperatorFunction<T, R> {
  (source: Stream<T>): Stream<R>
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
export type SelectorFunction<S = any, R = any> = (state: S, props?: any) => Promise<R> | R;

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
export type ProjectionFunction<R = any, P = any> = (results: any[], props?: P) => R;

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

export type Streams<S extends Record<string, (...args: any[]) => (state: any) => any>> = {
  [K in keyof S]: (...args: Parameters<S[K]>) => Stream<ReturnType<ReturnType<S[K]>>>;
};

/**
 * Represents a feature module that organizes state, logic, and dependencies
 * for a specific part of an application.
 *
 * @template State - The type of the feature state slice.
 * @template ActionTypes - The union type of action type strings.
 * @template Actions - The shape of action creator functions.
 * @template Selectors - The shape of selector functions.
 * @template Dependencies - The type representing dependencies required by the feature.
 *
 * @property slice - A unique identifier string for the feature's state slice in the store.
 * @property initialState - The initial state value for this feature slice.
 * @property actionHandlers - A map of action type strings to their respective reducer functions
 *                            that handle updates to the feature state.
 * @property actions - An object containing action creator functions.
 * @property selectors - An object containing selector functions to derive data from the state.
 * @property dependencies? - Optional dependencies tree, such as types or injection tokens,
 *                           which the feature module requires.
 * @property [key: string] - Allows for additional arbitrary properties.
 */
export interface FeatureModule<
  State = any,
  ActionTypes extends string = string,
  Actions extends Record<string, (...args: any[]) => Action<any>> = any,
  Selectors extends Record<string, (state: any) => any> = any,
  Dependencies = any
> {

  readonly slice: string;
  readonly initialState: State;
  readonly dependencies?: Dependencies;
  readonly loaded$: Subject<void>;
  readonly destroyed$: Subject<void>;
  readonly data$: Streams<Selectors>;
  readonly actions: Actions;
  readonly selectors: Selectors;
  readonly [key: string]: any;
  init: (store: Store<any>) => FeatureModule<State, ActionTypes, Actions, Selectors, Dependencies>;
  configure: (store: Store<State>) => FeatureModule<State, ActionTypes, Actions, Selectors, Dependencies>;
  destroy: (clearState?: boolean) => FeatureModule<State, ActionTypes, Actions, Selectors, Dependencies>;
}

/**
 * Type definition for a function that creates a store instance.
 *
 * @template T - The type of the state managed by the store.
 * @param {StoreSettings} [settings] - Optional settings for the store, such as dispatch behavior or feature toggles.
 * @param {StoreEnhancer} [enhancer] - Optional enhancer function to extend or modify the store's functionality.
 * @returns {Store<T>} The created store instance with methods for managing state and actions.
 */
export type StoreCreator<T = any> = (settings?: StoreSettings, enhancer?: StoreEnhancer) => Store<T>;

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

  if (isStream(val))
    return "Stream";

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
function ctorName(val: any): string | null {
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
 * Tests to see if the object is an RxJS {@link Stream}
 * @param obj the object to test
 */
function isStream(obj: any): obj is Stream<unknown> {
  // The !! is to ensure that this publicly exposed function returns
  // `false` if something like `null` or `0` is passed.
  return !!obj && obj.type === 'stream' && typeof obj.subscribe === 'function';
}

export { isAction, isAsync, isBoxed, isStream, isPlainObject, isPromise, kindOf };

