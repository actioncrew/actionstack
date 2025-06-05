import { Action, ActionCreator, Dependencies, Dispatch, GetState, isAction, kindOf, ThunkCreator } from './types';

export { createAction as action, createThunk as thunk };

/**
 * Creates an action creator for synchronous or asynchronous actions.
 *
 * @param {string|Function} typeOrThunk - A string representing the action type for synchronous actions,
 *                                       or a thunk function for async actions.
 * @param {Function} [payloadCreator]   - Optional function to create the payload for the action.
 * @returns {Function}                  - Action creator function producing actions or dispatchable thunks.
 *
 * @remarks
 * - **Synchronous Actions:** When `typeOrThunk` is a string, returns a function that creates action objects.
 *   If `payloadCreator` is provided, it generates the payload; otherwise, the first argument is used as payload.
 * - **Async Actions (Thunks):** When `typeOrThunk` is a function, returns a thunk creator function
 *   that dispatches async logic with `dispatch`, `getState`, and optional `dependencies`.
 *
 * @example
 * // Synchronous action creator
 * const increment = createAction('INCREMENT', amount => ({ amount }));
 * dispatch(increment(1));
 *
 * @example
 * // Asynchronous thunk action creator
 * const fetchData = createAction(async (dispatch, getState) => {
 *   const data = await fetch('/api/data');
 *   dispatch({ type: 'DATA_FETCHED', payload: await data.json() });
 * });
 * dispatch(fetchData());
 */
export function createAction<T extends string, Args extends any[], P>(
  type: T,
  payloadCreator: (...args: Args) => P
): ActionCreator<T, Args, P>;

export function createAction<T extends string>(
  type: T,
  payloadCreator?: undefined
): ActionCreator<T, [], undefined>;

export function createAction<T extends string, P = any>(
  type: T,
  payloadCreator?: undefined
): ActionCreator<T, [P], P>;

export function createAction(type: string, payloadCreator?: Function): any {
  function actionCreator(...args: any[]) {
    const action: Action = { type };

    if (payloadCreator) {
      const result = payloadCreator(...args);
      if (result === undefined || result === null) {
        console.warn(
          'payloadCreator did not return an object. Did you forget to initialize an action with params?'
        );
      }
      if (result !== undefined && result !== null) {
        action.payload = result;
        if ('meta' in result) action.meta = result.meta;
        if ('error' in result) action.error = result.error;
      }
    } else {
      if (args[0] !== undefined) {
        action.payload = args[0];
      }
    }

    return action;
  }

  actionCreator.toString = () => (typeof type === 'string' ? type : 'asyncAction');
  actionCreator.type = typeof type === 'string' ? type : 'asyncAction';
  actionCreator.match = (action: any) => isAction(action) && action.type === type;

  return actionCreator;
}

/**
 * Creates a thunk action creator for asynchronous logic.
 *
 * @param {Function} fn - A function returning a thunk function with
 *                        signature `(dispatch, getState, dependencies) => Promise<R>`.
 * @returns {Function}  - A thunk creator function accepting arguments for `fn`.
 *
 * @example
 * const fetchUser = createThunk(async (id) => async (dispatch) => {
 *   const response = await fetch(`/user/${id}`);
 *   const user = await response.json();
 *   dispatch(userLoaded(user));
 * });
 * dispatch(fetchUser(123));
 */
export function createThunk<Args extends any[], R>(
  fn: (...args: Args) => (dispatch: Dispatch, getState: GetState, dependencies?: Dependencies) => Promise<R>
): ThunkCreator<Args, R> {
  const thunkCreator = (...args: Args) => {
    return async (dispatch: Dispatch, getState: GetState, dependencies?: Dependencies) => {
      try {
        return await fn(...args)(dispatch, getState, dependencies);
      } catch (error: any) {
        console.warn(`Thunk error: ${error.message}`);
        throw error;
      }
    };
  };

  thunkCreator.toString = () => 'asyncAction' as 'asyncAction';
  thunkCreator.type = 'asyncAction' as 'asyncAction';
  thunkCreator.match = (_: any) => false;

  return thunkCreator;
}

/**
 * Binds a single action creator to a dispatch function.
 *
 * @param {Function} actionCreator - The action creator function.
 * @param {Function} dispatch      - The dispatch function.
 * @returns {Function}             - A function that dispatches the action when called.
 */
export function bindActionCreator(actionCreator: Function, dispatch: Function): Function {
  return function (this: any, ...args: any[]): any {
    return dispatch(actionCreator.apply(this, args));
  };
}

/**
 * Binds multiple action creators or a single action creator to a dispatch function.
 *
 * @param {Object|Function} actionCreators - An object of action creators or a single action creator function.
 * @param {Function} dispatch               - The dispatch function.
 * @returns {Object|Function}               - Bound action creators mirroring the input shape.
 *
 * @remarks
 * - If the input is not an object or function, a warning is logged.
 * - When an object is passed, all functions in the object are bound to dispatch.
 * - When a single function is passed, it is bound directly.
 *
 * @example
 * const boundActions = bindActionCreators({ increment, decrement }, dispatch);
 * boundActions.increment(1);
 */
export function bindActionCreators(actionCreators: Record<string, Function> | Function, dispatch: Function): any {
  if (typeof actionCreators !== 'object' || actionCreators === null) {
    console.warn(
      `bindActionCreators expected an object or a function, but instead received: '${kindOf(
        actionCreators
      )}'. Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
    );
    return undefined;
  }

  actionCreators = { ...actionCreators };

  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch);
  }

  const keys = Object.keys(actionCreators);
  const numKeys = keys.length;

  if (numKeys === 1) {
    const actionCreator = actionCreators[keys[0]];
    if (typeof actionCreator === 'function') {
      return bindActionCreator(actionCreator, dispatch);
    }
  }

  for (let i = 0; i < numKeys; i++) {
    const key = keys[i];
    const actionCreator = actionCreators[key];
    if (typeof actionCreator === 'function') {
      actionCreators[key] = bindActionCreator(actionCreator, dispatch);
    }
  }

  return actionCreators;
}
