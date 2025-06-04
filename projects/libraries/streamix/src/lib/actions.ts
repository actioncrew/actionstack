import { Action, ActionCreator, AsyncAction, isAction, kindOf } from './types';

export { createAction as action };

type Dispatch = (action: Action<any>) => any;
type GetState = () => any;
type Dependencies = any;

/**
 * Creates an action creator function for Actionstack actions, supporting both synchronous and asynchronous use cases.
 *
 * @param {string|Function} typeOrThunk   - A string representing the action type for synchronous actions,
 *                                          or a function representing a thunk for asynchronous actions.
 * @param {Function} [payloadCreator]     - (Optional) A function to generate the payload for the action.
 * @returns {Function}                    - An action creator function that generates action objects or dispatchable thunks.
 *
 * This function allows the creation of action creators for both synchronous and asynchronous workflows:
 *
 * - **Synchronous Actions**: When `typeOrThunk` is a string, the returned action creator generates objects
 *   with a `type` property and optionally a `payload`, `meta`, and `error` property.
 *   - If a `payloadCreator` is provided, it is used to generate the payload.
 *   - If no `payloadCreator` is provided, the first argument passed to the action creator is used as the payload.
 *
 * - **Asynchronous Actions (Thunks)**: When `typeOrThunk` is a function, the returned action creator creates
 *   a dispatchable thunk. The thunk receives `dispatch`, `getState`, and optional `dependencies` as arguments,
 *   allowing for asynchronous logic.
 *   - Errors in the thunk are caught and logged with a warning.
 *
 * **Example Usage:**
 *
 * Synchronous:
 * ```typescript
 * const increment = createAction('INCREMENT', (amount) => ({ amount }));
 * dispatch(increment(1));
 * // Output: { type: 'INCREMENT', payload: { amount: 1 } }
 * ```
 *
 * Asynchronous:
 * ```typescript
 * const fetchData = createAction(async (dispatch, getState) => {
 *   const data = await fetch('/api/data');
 *   dispatch({ type: 'DATA_FETCHED', payload: await data.json() });
 * });
 * dispatch(fetchData);
 * ```
 *
 * Warnings:
 * - If `payloadCreator` returns `undefined` or `null`, a warning is issued.
 * - For thunks, an error in execution logs a warning.
 */
export function createAction<T, Args extends any[]>(
  type: string
): ActionCreator<T | undefined, []>;

export function createAction<T, Args extends any[]>(
  type: string,
  payloadCreator?: (...args: Args) => T
): ActionCreator<T, Args>;

export function createAction<T, Args extends any[]>(
  typeOrThunk: string | ((...args: Args) => (dispatch: Dispatch, getState: GetState, deps: Dependencies) => Promise<T>),
  payloadCreator?: (...args: Args) => T
): ActionCreator<T, Args> {
  // If typeOrThunk is a function, we’re in “async thunk” mode.
  const isThunkMode = typeof typeOrThunk === 'function' && typeOrThunk.length > 0 && payloadCreator === undefined;

  // Build a default payloadCreator that simply returns the first argument (or undefined)
  // Cast it to the proper type so TS knows this matches (...args: Args) => T
  const defaultPayloadCreator = ((...args: any[]) => {
    return args.length > 0 ? args[0] : undefined;
  }) as (...args: Args) => T;

  function actionCreator(...args: Args): Action<T> | AsyncAction<T> {
    if (isThunkMode) {
      // ----- Async thunk case -----
      // typeOrThunk is actually (...args: Args) => (dispatch, getState, deps) => Promise<T>
      const thunkFn = typeOrThunk as (...args: Args) => (dispatch: Dispatch, getState: GetState, deps: Dependencies) => Promise<T>;

      return async (dispatch: Dispatch, getState: GetState, dependencies: Dependencies): Promise<T> => {
        try {
          return await thunkFn(...args)(dispatch, getState, dependencies);
        } catch (error: any) {
          console.warn(
            `Error in async action: ${error?.message}. ` +
            `If dependencies object is missing required props, check your slice registration.`
          );
          throw error;
        }
      };
    }

    // ----- Synchronous action case -----
    const action: Action<T> = {
      type: typeOrThunk as string
    };

    // Pick either the user‐supplied payloadCreator or the default (which returns args[0] or undefined).
    const actualPayloadCreator = (payloadCreator ?? defaultPayloadCreator) as (...args: Args) => T;
    const payload = actualPayloadCreator(...args);

    if (payload !== undefined) {
      action.payload = payload;

      // If payload is an object, copy through meta / error if they exist
      if (payload !== null && typeof payload === 'object') {
        if ('meta' in payload) {
          action.meta = (payload as any).meta;
        }
        if ('error' in payload) {
          action.error = (payload as any).error;
        }
      }
    }

    return action;
  }

  // Assign .type, .toString(), and .match(...) just as in your legacy code:
  actionCreator.toString = () => (typeof typeOrThunk === 'string' ? (typeOrThunk as string) : 'asyncAction');
  actionCreator.type = typeof typeOrThunk === 'string' ? (typeOrThunk as string) : 'asyncAction';
  actionCreator.match = (action: Action<any>): action is Action<T> => {
    return !!action && action.type === (typeof typeOrThunk === 'string' ? (typeOrThunk as string) : 'asyncAction');
  };

  return actionCreator as ActionCreator<T, Args>;
}


/**
 * Binds an action creator to the dispatch function.
 *
 * @param {Function} actionCreator   - The action creator function to be bound.
 * @param {Function} dispatch        - The dispatch function.
 * @returns {Function}               - A new function that dispatches the action created by the provided action creator.
 *
 * This function takes an action creator function and the dispatch function.
 * It returns a new function that, when called, will dispatch the action created by the provided action creator.
 * The new function can be called with any arguments, which will be passed on to the original action creator function.
 */
export function bindActionCreator(actionCreator: Function, dispatch: Function): Function {
  return function(this: any, ...args: any[]): any {
    return dispatch(actionCreator.apply(this, args));
  };
}

/**
 * Binds one or more action creators to a dispatch function, making it easier to call actions directly.
 *
 * @param {Object|Function} actionCreators - An object containing multiple action creator functions
 *                                           or a single action creator function.
 * @param {Function} dispatch              - The dispatch function to bind the action creators to.
 * @returns {Object|Function}              - An object with the bound action creator functions
 *                                           or a single bound action creator function.
 *
 * This function accepts either:
 * - An object containing multiple action creator functions:
 *   Each function in the object will be wrapped by `bindActionCreator` to automatically dispatch
 *   actions when called, and the resulting object will be returned.
 * - A single action creator function:
 *   The function will be wrapped and returned as a bound action creator.
 *
 * It also performs type-checking to ensure the provided `actionCreators` parameter is either
 * an object or a function, issuing a warning if the input type is incorrect.
 *
 * This utility simplifies the process of binding all action creators from a module or file
 * to the dispatch function, resulting in cleaner and more concise component code.
 */
export function bindActionCreators(actionCreators: Record<string, Function> | Function, dispatch: Function): any {
  if (typeof actionCreators !== "object" || actionCreators === null) {
    console.warn(`bindActionCreators expected an object or a function, but instead received: '${kindOf(actionCreators)}'. Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`);
    return undefined;
  }

  actionCreators = { ...actionCreators };
  if (typeof actionCreators === "function") {
    return bindActionCreator(actionCreators, dispatch);
  }

  const keys = Object.keys(actionCreators);
  const numKeys = keys.length;

  if (numKeys === 1) {
    const actionCreator = actionCreators[keys[0]];

    if (typeof actionCreator === "function") {
      return bindActionCreator(actionCreator, dispatch);
    }
  }

  for (let i = 0; i < numKeys; i++) {
    const key = keys[i];
    const actionCreator = actionCreators[key];

    if (typeof actionCreator === "function") {
      actionCreators[key] = bindActionCreator(actionCreator, dispatch);
    }
  }

  return actionCreators;
}
