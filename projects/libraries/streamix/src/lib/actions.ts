import { Action, ActionCreator, ActionHandler, AsyncAction, isAction, ThunkCreator } from './types';

export { createAction as action, createThunk as thunk };

export const actionHandlers = new Map<string, ActionHandler>();
export const actionCreators = new Map<string, (...args: any[]) => Action>();
export const registeredThunks = new Map<string, ThunkCreator<any, any, any>>();

/**
 * Creates a synchronous action creator function.
 *
 * Overloaded to support different combinations of payload and handler.
 *
 * @param type The action type string (e.g., 'ADD_USER').
 * @param handler Optional reducer handler for this action. Used in overloads.
 * @param payloadCreator Optional function to generate payload from arguments. Used in overloads.
 * @returns An action creator function.
 */
export function createAction<TType extends string>(type: TType): ActionCreator<void, TType, []>;
export function createAction<TType extends string, TState>(
  type: TType,
  handler: ActionHandler<TState, void>
): ActionCreator<void, TType, []>;
export function createAction<TType extends string, TPayload>(
  type: TType,
  handler: ActionHandler<any, TPayload>
): ActionCreator<TPayload, TType, [TPayload]>;
export function createAction<TType extends string, TArgs extends readonly any[], TPayload>(
  type: TType,
  handler: ActionHandler<any, TPayload>,
  payloadCreator: (...args: TArgs) => TPayload
): ActionCreator<TPayload, TType, TArgs>;

/**
 * Implementation of createAction.
 * @internal
 */
export function createAction<TType extends string, TArgs extends readonly any[] = [], TPayload = void>(
  type: TType,
  handler: ActionHandler<any, TPayload> = (() => void 0) as ActionHandler<any, TPayload>,
  payloadCreator?: (...args: TArgs) => TPayload
): ActionCreator<TPayload, TType, TArgs> {
  const defaultPayloadCreator = ((...args: any[]) => (args.length > 0 ? args[0] : undefined)) as (...args: TArgs) => TPayload;
  const actualPayloadCreator = payloadCreator ?? defaultPayloadCreator;

  const creator = (...args: TArgs): Action<TPayload> => {
    const payload = actualPayloadCreator(...args);
    const action: Action<TPayload> = { type };

    if (payload !== undefined) {
      action.payload = payload;
      if (payload !== null && typeof payload === 'object') {
        if ('meta' in payload) action.meta = (payload as any).meta;
        if ('error' in payload) action.error = (payload as any).error;
      }
    }

    return action;
  };

  return Object.assign(creator, {
    handler,
    type,
    toString: () => type,
    match: (action: Action<any>): action is Action<TPayload> => action?.type === type,
  }) as ActionCreator<TPayload, TType, TArgs>;
}

/**
 * Creates an asynchronous thunk action creator function.
 *
 * A thunk is a function that can perform asynchronous logic and dispatch
 * multiple actions before and/or after its asynchronous operations complete.
 *
 * This version also supports "triggers" — action types or matcher functions
 * that, when matched by any dispatched action, will cause this thunk to be
 * executed automatically.
 *
 * @template T - The string literal type of the thunk's action type.
 * @template ThunkBody - The type of the thunk function (AsyncAction).
 * @template Args - The argument tuple type accepted by the thunk creator.
 *
 * @param type - The action type string for the thunk (used for matching and debugging).
 * @param thunkBodyCreator - A factory function that receives the thunk's arguments
 *   and returns the actual thunk body function to execute.
 * @param triggers - Optional list of trigger definitions. Each trigger can be:
 *   - a string action type to match exactly, or
 *   - a matcher function that receives the dispatched action and returns `true` if the thunk should run.
 *
 * @returns A thunk creator function. Calling this function with arguments will
 *   return a thunk function with attached metadata:
 *   - `type`: the action type string
 *   - `match(action)`: checks if the given action matches this thunk's type
 *   - `isThunk`: `true` for identification in middleware
 *   - `triggers`: (optional) the list of trigger definitions
 */
export function createThunk<
  T extends string = string,
  ThunkBody extends AsyncAction = AsyncAction,
  Args extends any[] = any[]
>(
  type: T,
  thunkBodyCreator: (...args: Args) => ThunkBody,
  triggers?: Array<string | ((action: any) => boolean)>
): ThunkCreator<T, ThunkBody, Args> {
  const thunkCreator: ThunkCreator<T, ThunkBody, Args> = ((...args: Args) => {
    const actualThunk: ThunkBody = ((dispatch, getState, dependencies) => {
      try {
        return thunkBodyCreator(...args)(dispatch, getState, dependencies);
      } catch (error: any) {
        console.warn(`Error in thunk action "${type}": ${error.message}.`);
        throw error;
      }
    }) as ThunkBody;

    const thunkWithProps = actualThunk as any;
    thunkWithProps.type = type;
    thunkWithProps.toString = () => type;
    thunkWithProps.match = (action: any) => isAction(action) && action.type === type;
    thunkWithProps.isThunk = true;

    return thunkWithProps;
  }) as ThunkCreator<T, ThunkBody, Args>;

  thunkCreator.type = type;
  thunkCreator.toString = () => type;
  thunkCreator.match = (action: any) => isAction(action) && action.type === type;
  thunkCreator.isThunk = true;

  if (triggers && triggers.length) {
    (thunkCreator as any).triggers = triggers;
  }

  return thunkCreator as any;
}

/**
 * Binds a single action creator to the dispatch function.
 *
 * @param actionCreator The action creator function.
 * @param dispatch The dispatch function.
 * @returns A function that dispatches the action created by the action creator.
 */
export function bindActionCreator(actionCreator: Function, dispatch: Function): Function {
  return function (this: any, ...args: any[]): any {
    return dispatch(actionCreator.apply(this, args));
  };
}

/**
 * Binds multiple action creators to the dispatch function.
 *
 * @param actionCreators An object of action creators or a single action creator function.
 * @param dispatch The dispatch function.
 * @returns An object of bound action creators or a single bound action creator function.
 */
export function bindActionCreators(
  actionCreators: Record<string, Function> | Function,
  dispatch: Function
): any {
  if (typeof actionCreators === 'function') {
    return bindActionCreator(actionCreators, dispatch);
  }

  if (typeof actionCreators !== 'object' || actionCreators === null) {
    console.warn(
      `bindActionCreators expected an object or a function, but received: '${Object.prototype.toString.call(
        actionCreators
      )}'.`
    );
    return undefined;
  }

  const boundActionCreators: Record<string, Function> = {};

  for (const key in actionCreators) {
    const actionCreator = actionCreators[key];
    if (typeof actionCreator === 'function') {
      boundActionCreators[key] = bindActionCreator(actionCreator, dispatch);
    }
  }

  return boundActionCreators;
}
