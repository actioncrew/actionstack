import { Action, AsyncReducer } from "@actioncrew/actionstack";

function deepFreeze (o: any) {
  Object.freeze(o);

  var oIsFunction = typeof o === "function";
  var hasOwnProp = Object.prototype.hasOwnProperty;

  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (hasOwnProp.call(o, prop)
    && (oIsFunction ? prop !== 'caller' && prop !== 'callee' && prop !== 'arguments' : true )
    && o[prop] !== null
    && (typeof o[prop] === "object" || typeof o[prop] === "function")
    && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });

  return o;
};

/**
 * Meta-reducer that prevents state from being mutated anywhere in the app.
 */
export async function storeFreeze(reducer: AsyncReducer): Promise<AsyncReducer> {
  return async function freeze(state: any, action: Action<any>) {
    state = state || {};
    deepFreeze(state);
    // guard against trying to freeze null or undefined types
    if (action.payload) {
      deepFreeze(action.payload);
    }
    var nextState = await reducer(state, action);
    deepFreeze(nextState);
    return nextState;
  };
}
