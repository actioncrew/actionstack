import { Action, ActionCreator, ActionHandler, isAction, kindOf } from './types';

export { createAction as action };

export const actionHandlers = new Map<string, ActionHandler>();
export const actionCreators = new Map<string, (...args: any[]) => Action>();

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
export function createAction(typeOrThunk: string | Function, handler?: ActionHandler, payloadCreator?: Function): ActionCreator {
  function actionCreator(...args: any[]) {
    let action: Action = {
      type: typeOrThunk as string,
    };

    if (typeof typeOrThunk === 'function') {
      return async (dispatch: Function, getState: Function, dependencies: any) => {
        try {
          return await typeOrThunk(...args)(dispatch, getState, dependencies);
        } catch (error: any) {
          console.warn(`Error in action: ${error.message}. If dependencies object provided does not contain required property, it is possible that the slice name obtained from the tag name does not match the one declared in the slice file.`);
        }
      }
    } else if (payloadCreator) {
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
  }

  actionCreator.handler = handler ?? (() => {});
  actionCreator.toString = () => `${typeOrThunk}`;
  actionCreator.type = typeof typeOrThunk === 'string' ? typeOrThunk : 'asyncAction';
  actionCreator.match = (action: any) => isAction(action) && action.type === typeOrThunk;

  return actionCreator;
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
