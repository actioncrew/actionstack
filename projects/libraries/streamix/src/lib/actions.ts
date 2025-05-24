import { Action, ActionCreator, ActionHandler, AsyncAction, isAction, kindOf, ThunkCreator } from './types';

export { createAction as action, createThunk as thunk };

export const actionHandlers = new Map<string, ActionHandler>();
export const actionCreators = new Map<string, (...args: any[]) => Action>();

/**
 * Creates a **synchronous** action creator function.
 * This action creator will generate a plain action object when called.
 *
 * @param type The string action type (e.g., 'USERS/ADD_USER').
 * @param handler (Optional) A SliceActionHandler function to handle this action in a reducer.
 * @param payloadCreator (Optional) A function to generate the action's payload.
 * If not provided, the first argument to the action creator becomes the payload.
 * @returns A RegularActionCreator function.
 */
export function createAction<P = any, T extends string = string, Args extends any[] = any[]>(
  type: T,
  handler?: ActionHandler<P, P>,
  payloadCreator?: (...args: Args) => any
): ActionCreator<P, T, Args> {

  const actionCreator: ActionCreator<P, T, Args> = ((...args: Args) => {
    let action: Action<P> = { type };

    if (payloadCreator) {
      let result = payloadCreator(...args);
      if (result === undefined || result === null) {
        console.warn('payloadCreator did not return an object. Did you forget to initialize an action with params?');
      }

      // Do not return payload if it is undefined
      if (result !== undefined && result !== null) {
        action.payload = result;
        'meta' in result && (action.meta = result.meta);
        'error' in result && (action.error = result.error);
      }
    }
    else {
      // Do not return payload if it is undefined
      if (args[0] !== undefined) {
        action.payload = args[0];
      }
    }

    return action;
  }) as ActionCreator<P, T, Args>; // Cast to the specific ActionCreator type

  // Attach static properties and methods
  actionCreator.handler = handler ?? (() => {}); // Assign handler
  actionCreator.type = type;
  actionCreator.toString = () => type;
  actionCreator.match = (action: any) => isAction(action) && action.type === type;

  return actionCreator;
}

/**
 * Creates an **asynchronous** (thunk) action creator function.
 * This action creator will return an `AsyncAction` (thunk) when called.
 *
 * @param type The string action type for the thunk (e.g., 'USERS/FETCH_PROFILE').
 * @param thunk The actual AsyncAction function that contains the asynchronous logic.
 * @returns A ThunkCreator function.
 */
export function createThunk<
  T extends string = string,
  // ThunkBody is the actual AsyncAction function: (dispatch, getState, dependencies) => result
  ThunkBody extends AsyncAction = AsyncAction,
  // Args are the parameters passed to the *outer* thunk creator function
  Args extends any[] = any[]
>(
  type: T,
  thunkBodyCreator: (...args: Args) => ThunkBody // This is the function that returns the AsyncAction
): ThunkCreator<T, ThunkBody, Args> {

  // The `thunkCreator` is the outer function that consumers will call
  // (e.g., `WorkspaceUserById('some-id')`)
  const thunkCreator: ThunkCreator<T, ThunkBody, Args> = ((...args: Args) => {

    // When `thunkCreator(...args)` is called, it returns the actual `AsyncAction` (thunk)
    // which captures `args` in its closure.
    const actualThunk: ThunkBody = ((dispatch, getState, dependencies) => {
      try {
        // Execute the `thunkBodyCreator` with `args` to get the specific thunk instance,
        // then invoke that thunk with dispatch, getState, and dependencies.
        return thunkBodyCreator(...args)(dispatch, getState, dependencies);
      } catch (error: any) {
        console.warn(`Error in thunk action "${type}": ${error.message}.`);
        throw error; // Re-throw to propagate the error
      }
    }) as ThunkBody; // Cast to ensure correct type inference for ThunkBody

    // Attach properties to the actual thunk function for debugging/matching
    (actualThunk as any).type = type;
    (actualThunk as any).toString = () => type;
    (actualThunk as any).match = (action: any) => isAction(action) && action.type === type;
    (actualThunk as any).isThunk = true; // Mark as thunk for identification

    return actualThunk;
  }) as ThunkCreator<T, ThunkBody, Args>; // Cast to the ThunkCreator type

  // Attach static properties to the thunkCreator itself
  thunkCreator.type = type;
  thunkCreator.toString = () => type;
  thunkCreator.match = (action: any) => isAction(action) && action.type === type;
  thunkCreator.isThunk = true; // Mark this creator as a thunk creator

  return thunkCreator;
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
export function bindActionCreators(
  actionCreators: Record<string, Function> | Function,
  dispatch: Function
): any {
  if (typeof actionCreators === "function") {
    // Single action creator function
    return bindActionCreator(actionCreators, dispatch);
  }

  if (typeof actionCreators !== "object" || actionCreators === null) {
    console.warn(
      `bindActionCreators expected an object or a function, but received: '${Object.prototype.toString.call(actionCreators)}'.`
    );
    return undefined;
  }

  const boundActionCreators: Record<string, Function> = {};

  for (const key in actionCreators) {
    const actionCreator = actionCreators[key];
    if (typeof actionCreator === "function") {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
    }
  }

  return boundActionCreators;
}
