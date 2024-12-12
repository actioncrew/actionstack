import { Action, isAction, kindOf } from './types';

export { createAction as action };

/**
 * Creates an action creator function for Actionstack actions.
 *
 * @param {string|Function} typeOrThunk   - This can be either a string representing the action type
 *                                          or a function representing a thunk (asynchronous action).
 * @param {Function} [payloadCreator]     - (Optional) A function used to generate the payload for the action.
 * @returns {Function}                    - An action creator function.
 *
 * This function creates an action creator function that can be used to create action objects.
 * The action object will have a `type` property set to the provided `typeOrThunk` value.
 * Additionally, it can have a `payload` property if a `payloadCreator` function is provided
 * or if arguments are passed to the action creator function itself.
 * It can also have optional `meta` and `error` properties included in the payload object.
 */
function createAction(typeOrThunk: string | Function, payloadCreator?: Function): any {
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

  actionCreator.toString = () => `${typeOrThunk}`;
  actionCreator.type = typeOrThunk;
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
 * Binds multiple action creators or a single action creator to the dispatch function.
 *
 * @param {Object|Function} actionCreators - An object containing action creator functions or a single action creator function.
 * @param {Function} dispatch              - The dispatch function.
 * @returns {Object|Function}              - An object containing the bound action creator functions or the bound single action creator function.
 *
 * This function takes an object containing multiple action creator functions or a single action creator function,
 * along with the dispatch function.
 * It iterates through the provided object (or binds a single function if provided) and returns a new object.
 * In the new object, each action creator function is wrapped with the `bindActionCreator` function
 * to automatically dispatch the created action when called.
 *
 * This function is useful for binding all action creators from a module or file to the dispatch function
 * in a single call, promoting cleaner component code.
 */
export function bindActionCreators(actionCreators: any, dispatch: Function): any {
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
