import { Observable } from 'rxjs/internal/Observable';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Subject } from 'rxjs/internal/Subject';

/**
 * Default configuration for the main module.
 * Includes a slice name, a basic reducer, an empty list of metaReducers, and no dependencies.
 */
const defaultMainModule = {
    slice: "main",
    reducer: (state = {}) => state,
    metaReducers: [],
    dependencies: {}
};
/**
 * Determines the type of a given value.
 *
 * This function attempts to identify the underlying type of a JavaScript value
 * using a combination of checks and built-in functions.
 *
 * @param val - The value to determine the type for.
 * @returns string - A string representing the type of the value (e.g., "undefined", "string", "array", etc.).
 */
function kindOf(val) {
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
function ctorName(val) {
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
function isError(val) {
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
function isDate(val) {
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
function isBoxed(value) {
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
function isPromise(value) {
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
function isAction(action) {
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
function isAsync(func) {
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
function isPlainObject(obj) {
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
function isObservable(obj) {
    // The !! is to ensure that this publicly exposed function returns
    // `false` if something like `null` or `0` is passed.
    return !!obj && (obj instanceof Observable || (typeof obj.lift === 'function' && typeof obj.subscribe === 'function'));
}
/**
 * Observable that immediately completes without emitting any values
 */
const EMPTY = new Observable((subscriber) => {
    subscriber.complete();
});

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
function createAction(typeOrThunk, payloadCreator) {
    function actionCreator(...args) {
        let action = {
            type: typeOrThunk,
        };
        if (typeof typeOrThunk === 'function') {
            return async (dispatch, getState, dependencies) => {
                try {
                    return await typeOrThunk(...args)(dispatch, getState, dependencies);
                }
                catch (error) {
                    console.warn(`Error in action: ${error.message}. If dependencies object provided does not contain required property, it is possible that the slice name obtained from the tag name does not match the one declared in the slice file.`);
                }
            };
        }
        else if (payloadCreator) {
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
    actionCreator.type = typeof typeOrThunk === 'string' ? typeOrThunk : 'asyncAction';
    actionCreator.match = (action) => isAction(action) && action.type === typeOrThunk;
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
function bindActionCreator(actionCreator, dispatch) {
    return function (...args) {
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
function bindActionCreators(actionCreators, dispatch) {
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

/**
 * Generates a random string of a specified length in base-36 (including digits and lowercase letters).
 *
 * @param {number} length  - The desired length of the random string.
 * @returns {string}       - A random base-36 string of the provided length.
 */
function salt(length) {
    return Math.random().toString(36).substring(2).padStart(length, "0").slice(0, length);
}
/**
 * Creates a simple 3-character hash of a string using a basic multiplication-based algorithm.
 *
 * @param {string} str - The string to be hashed.
 * @returns {string}   - A 3-character base-36 string representing the hash of the input string.
 */
function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
        h = 31 * h + str.charCodeAt(i);
    }
    // Convert to base-36 string and pad with zeros
    let hash = h.toString(36).padStart(3, "0");
    // Return the first 3 characters of the hash
    return hash.slice(0, 3);
}
/**
 * Generates a signature by combining a random salt and a 3-character hash of the salt, separated by dots.
 *
 * @returns {string} - A string containing the salt and its hash separated by dots (e.g., "abc.def").
 */
function signature() {
    let payload = salt(7), hashstr = hash(payload);
    return payload.concat(hashstr).split('').join('.');
}
/**
 * Validates a provided signature string based on its format and internal hash check.
 *
 * @param {string} sign  - The signature string to be validated.
 * @returns {boolean}    - True if the signature is a valid format and the internal hash check passes, false otherwise.
 */
function isValidSignature(sign) {
    return typeof sign === 'string' && (sign = sign.replace(/\./g, '')).length === 10 && hash(sign.slice(0, 7)) === sign.slice(7, 10);
}

/**
 * Creates a new instance of a simple lock.
 * Allows acquiring and releasing the lock, with queued resolvers when the lock is held.
 *
 * @returns {SimpleLock} - The lock object with acquire and release methods.
 */
const createLock = () => {
    let isLocked = false; // Tracks whether the lock is held
    const queue = []; // Queue to store waiting promise resolvers
    const acquire = () => new Promise((resolve) => {
        if (!isLocked) {
            isLocked = true;
            resolve(); // Immediately resolve if the lock is free
        }
        else {
            queue.push(resolve); // Otherwise, queue the resolve function
        }
    });
    const release = () => {
        if (!isLocked) {
            throw new Error("Cannot release a lock that is not acquired.");
        }
        const nextResolve = queue.shift();
        if (nextResolve) {
            nextResolve(); // Allow the next waiting function to acquire the lock
            // Keep `isLocked` as true because the lock is still held by the next resolver
        }
        else {
            isLocked = false; // No more waiting, so release the lock
        }
    };
    return { acquire, release };
};

/**
 * Selects a nested property from a plain object state using a path of keys.
 *
 * @template T The root state object type.
 * @template P A key of the object or a path array.
 *
 * @param slice The key or path to the desired nested value.
 *
 * @returns A selector function that takes a plain object state and returns the nested value.
 */
function createFeatureSelector(slice) {
    return (state) => {
        if (Array.isArray(slice)) {
            return slice.reduce((acc, key) => acc?.[key], state);
        }
        else {
            return state[slice];
        }
    };
}
/**
 * Composes multiple selectors into one, applying an optional projection function.
 *
 * @template T Slice type extracted from state.
 * @template U Final return type after projection.
 *
 * @param featureSelector Selector for extracting the slice from full state, or "@global" for entire state.
 * @param selectors A selector or array of selectors for extracting intermediate values.
 * @param projection Optional function to project intermediate values into a final result.
 *
 * @returns A selector that computes a derived value from the slice using the specified selectors.
 */
function createSelector(featureSelector, selectors, projectionOrOptions) {
    const isSelectorArray = Array.isArray(selectors);
    const projection = typeof projectionOrOptions === "function" ? projectionOrOptions : undefined;
    return (props, projectionProps) => {
        return (state) => {
            const sliceState = featureSelector === "@global" ? state : featureSelector(state);
            if (sliceState === undefined)
                return undefined;
            try {
                if (isSelectorArray) {
                    const results = selectors.map((selector, i) => selector(sliceState, props?.[i]));
                    if (results.some(r => r === undefined))
                        return undefined;
                    return projection(results, projectionProps);
                }
                else {
                    const result = selectors(sliceState, props);
                    return result === undefined
                        ? undefined
                        : projection
                            ? projection(result, projectionProps)
                            : result;
                }
            }
            catch (error) {
                console.warn("Selector execution error:", error.message);
                return undefined;
            }
        };
    };
}
/**
 * Similar to `createSelector` but supports asynchronous selector functions.
 *
 * @template T Slice type extracted from state.
 * @template U Final return type after projection.
 *
 * @param featureSelector Selector for extracting the slice from full state, or "@global" for entire state.
 * @param selectors A selector or array of selectors returning a value, Promise, or Observable-like.
 * @param projection Optional function to project intermediate values into a final result.
 *
 * @returns A selector that returns a Promise of a derived value from the state.
 */
function createSelectorAsync(featureSelector, selectors, projectionOrOptions) {
    const isSelectorArray = Array.isArray(selectors);
    const projection = typeof projectionOrOptions === "function" ? projectionOrOptions : undefined;
    return (props, projectionProps) => {
        return async (state) => {
            const sliceState = featureSelector === "@global" ? state : featureSelector(state);
            if (sliceState === undefined)
                return undefined;
            try {
                if (isSelectorArray) {
                    const results = await Promise.all(selectors.map((selector, i) => selector(sliceState, props?.[i])));
                    if (results.some(r => r === undefined))
                        return undefined;
                    return projection(results, projectionProps);
                }
                else {
                    const result = await selectors(sliceState, props);
                    return result === undefined
                        ? undefined
                        : projection
                            ? projection(result, projectionProps)
                            : result;
                }
            }
            catch (error) {
                console.warn("Async selector error:", error.message);
                return undefined;
            }
        };
    };
}

/**
 * Factory methods for creating operations of different types.
 */
const createInstruction = {
    /**
     * Creates an instruction for an action or async action.
     * @param action The action or async action to wrap in an instruction.
     * @returns The corresponding instruction.
     */
    action: (action) => {
        const operationType = typeof action === 'function' ? "asyncAction" : "action";
        const source = action.source;
        return { type: operationType, instance: action, context: source };
    },
    /**
     * Creates an instruction for a saga.
     * @param saga The saga function.
     * @returns The corresponding instruction.
     */
    saga: (saga) => ({ type: "saga", instance: saga }),
    /**
     * Creates an instruction for an epic.
     * @param epic The epic function.
     * @returns The corresponding instruction.
     */
    epic: (epic) => ({ type: "epic", instance: epic }),
};
/**
 * Checks if the given object is a valid Instruction.
 * @param obj The object to check.
 * @returns True if the object is a valid Instruction, false otherwise.
 */
const isInstruction = (obj) => {
    return obj?.type !== undefined && obj?.instance !== undefined;
};
/**
 * Creates a stack for managing operations with observable capabilities.
 * This stack allows you to add, remove, and query instructions (operations),
 * as well as observe changes to the stack.
 */
const createExecutionStack = () => {
    const stack$ = new BehaviorSubject([]);
    return {
        /**
         * Gets the current length of the stack.
         * @returns The length of the stack.
         */
        get length() {
            return stack$.value.length;
        },
        /**
         * Adds an operation to the stack.
         * @param item The operation (instruction) to add.
         */
        add(item) {
            stack$.next([...stack$.value, item]);
        },
        /**
         * Retrieves the top operation in the stack without removing it.
         * @returns The top operation or undefined if the stack is empty.
         */
        peek() {
            return stack$.value[stack$.value.length - 1];
        },
        /**
         * Removes the specified operation from the stack.
         * @param item The operation to remove.
         * @returns The removed operation or undefined if the operation was not found.
         */
        remove(item) {
            const index = stack$.value.lastIndexOf(item);
            if (index > -1) {
                const newStack = stack$.value.filter((_, i) => i !== index);
                stack$.next(newStack);
                return item;
            }
            return undefined;
        },
        /**
         * Clears all operations from the stack.
         */
        clear() {
            stack$.next([]);
        },
        /**
         * Converts the stack to an array of instructions.
         * @returns An array of instructions.
         */
        toArray() {
            return [...stack$.value];
        },
        /**
         * Finds the last operation in the stack that satisfies a given condition.
         * @param condition The condition to match the operation.
         * @returns The last matching operation or undefined if no match is found.
         */
        findLast(condition) {
            return stack$.value.slice().reverse().find(condition);
        },
        /**
         * Waits for the stack to become empty.
         * @returns A promise that resolves when the stack is empty.
         */
        waitForEmpty() {
            return waitFor(stack$, stack => stack.length === 0);
        },
        /**
         * Waits for the stack to become idle (i.e., no "action" operations are in progress).
         * @returns A promise that resolves when the stack becomes idle.
         */
        waitForIdle() {
            return waitFor(stack$, stack => !stack.some(item => item.type === "action"));
        },
        /**
         * Exposes the underlying observable stream for external subscription.
         */
        get observable() {
            return stack$.asObservable();
        },
    };
};
/**
 * Waits for a condition to be met in an observable stream.
 * @template T
 * @param obs The observable stream to observe.
 * @param predicate A predicate function to evaluate each emitted value.
 * @returns A promise that resolves when the condition is met.
 */
function waitFor(obs, predicate) {
    return new Promise((resolve, reject) => {
        const subscription = obs.subscribe({
            next: value => {
                if (predicate(value)) {
                    subscription.unsubscribe();
                    resolve(value);
                }
            },
            error: reject,
            complete: () => reject("Observable completed before condition was met"),
        });
    });
}

/**
 * Functional handler for managing actions within middleware.
 *
 * @param {MiddlewareConfig} config - Configuration object for the middleware.
 * @returns {Function} - A function to handle actions.
 */
function createActionHandler(config) {
    const stack = config.stack;
    const getState = config.getState;
    const dependencies = config.dependencies;
    /**
     * Handles the given action, processing it either synchronously or asynchronously.
     *
     * @param {Action | AsyncAction} action - The action to be processed.
     * @param {Function} next - The next middleware function in the chain.
     * @param {SimpleLock} lock - The lock instance to manage concurrency for this action.
     * @returns {Promise<void> | void} - A promise if the action is asynchronous, otherwise void.
     */
    const handleAction = async (action, next, lock) => {
        await lock.acquire();
        const op = createInstruction.action(action);
        stack.add(op);
        try {
            if (typeof action === 'function') {
                const innerLock = createLock();
                // Process async actions asynchronously and track them
                await action(async (syncAction) => {
                    await handleAction(syncAction, next, innerLock);
                }, getState, dependencies());
            }
            else {
                // Process regular synchronous actions
                await next(action);
            }
        }
        finally {
            stack.remove(op);
            lock.release();
        }
    };
    return handleAction;
}
/**
 * Function to create the starter middleware factory.
 * This factory function returns a middleware creator that takes strategy information as arguments and returns the actual middleware function.
 *
 * @returns Function - The middleware creator function.
 */
const createStarter = () => {
    /**
     * Middleware function for handling actions exclusively.
     *
     * This middleware ensures only one action is processed at a time and queues new actions until the current one finishes.
     *
     * @param args - Arguments provided by the middleware pipeline.
     *   * dispatch - Function to dispatch actions.
     *   * getState - Function to get the current state.
     *   * dependencies - Function to get dependencies.
     * @param next - Function to call the next middleware in the chain.
     * @returns Function - The actual middleware function that handles actions.
     */
    const exclusive = (config) => (next) => async (action) => {
        const handler = createActionHandler(config);
        const lockInstance = config.lock;
        await handler(action, next, lockInstance);
    };
    /**
     * Middleware function for handling actions concurrently.
     *
     * This middleware allows multiple async actions to be processed simultaneously.
     *
     * @param args - Arguments provided by the middleware pipeline (same as exclusive).
     * @param next - Function to call the next middleware in the chain.
     * @returns Function - The actual middleware function that handles actions.
     */
    const concurrent = (config) => (next) => async (action) => {
        let asyncActions = [];
        const handler = createActionHandler(config);
        const lockInstance = config.lock;
        const asyncFunc = handler(action, next, lockInstance);
        if (asyncFunc) {
            asyncActions.push(asyncFunc);
            asyncFunc.finally(() => {
                asyncActions = asyncActions.filter(func => func !== asyncFunc);
            });
        }
    };
    // Map strategy names to functions
    const strategies = {
        'exclusive': exclusive,
        'concurrent': concurrent
    };
    const defaultStrategy = 'concurrent';
    // Create a method to select the strategy
    const selectStrategy = ({ dispatch, getState, dependencies, strategy, lock, stack }) => (next) => async (action) => {
        let strategyFunc = strategies[strategy()];
        if (!strategyFunc) {
            console.warn(`Unknown strategy: ${strategy}, default is used: ${defaultStrategy}`);
            strategyFunc = strategies[defaultStrategy];
        }
        return strategyFunc({ dispatch, getState, dependencies, lock, stack })(next)(action);
    };
    selectStrategy.signature = 'i.p.5.j.7.0.2.1.8.b';
    return selectStrategy;
};
// Create the starter middleware
const starter = createStarter();

/**
   * Updates a nested state object by applying a change to the specified path and value.
   * Ensures that intermediate nodes in the state are properly cloned or created, preserving immutability
   * for unchanged branches. Tracks visited nodes in the provided object tree to avoid redundant updates.
   */
function applyChange(initialState, { path, value }, objTree) {
    let currentState = Object.keys(objTree).length > 0 ? initialState : { ...initialState };
    let currentObj = currentState;
    for (let i = 0; i < path.length; i++) {
        const key = path[i];
        if (i === path.length - 1) {
            // Reached the leaf node, update its value
            currentObj[key] = value;
            objTree[key] = true;
        }
        else {
            // Continue traversal
            currentObj = currentObj[key] = objTree[key] ? currentObj[key] : { ...currentObj[key] };
            objTree = (objTree[key] = objTree[key] ?? {});
        }
    }
    return currentState;
}
/**
 * Combines multiple store enhancers into a single enhancer function.
 * This allows multiple enhancers to be applied in sequence to the store.
 * Typically used for combining middleware, logging, or other store customizations.
 *
 * @param enhancers - An array of store enhancers to be combined.
 * @returns A single store enhancer that applies all provided enhancers.
 */
function combineEnhancers(...enhancers) {
    // Collect the names of the enhancers for later access
    const methodNames = enhancers.map(enhancer => enhancer.name);
    // Create a new combined enhancer that wraps the enhancers
    const combinedEnhancer = (next) => {
        // Apply each enhancer in the chain
        return enhancers.reduceRight((acc, enhancer) => enhancer(acc), next);
    };
    // Attach the names of the enhancers to the combined enhancer
    combinedEnhancer.names = methodNames;
    return combinedEnhancer;
}
/**
 * Combines reducers into a single reducer function.
 * Initializes the default state by invoking each reducer with `undefined` and a special `@@INIT` action.
 */
const combineReducers = (reducers) => {
    /**
     * Helper to validate reducers and flatten them into a single map.
     *
     * This recursively flattens the nested reducer tree and ensures all reducer paths are captured in the map.
     */
    const flattenReducers = (tree, path = []) => {
        const reducerMap = new Map();
        for (const key in tree) {
            const reducer = tree[key];
            const currentPath = [...path, key];
            if (typeof reducer === "function") {
                reducerMap.set(currentPath.join("."), { reducer, path: currentPath });
            }
            else if (typeof reducer === "object" && reducer !== null) {
                // Recursively flatten the nested reducers.
                const childReducers = flattenReducers(reducer, currentPath);
                childReducers.forEach((childReducer, childKey) => {
                    reducerMap.set(childKey, childReducer);
                });
            }
            else {
                throw new Error(`Invalid reducer at path: ${currentPath.join(".")}`);
            }
        }
        return reducerMap;
    };
    const reducerMap = flattenReducers(reducers);
    /**
     * Helper to build the initial state by calling reducers with undefined state and a special `@@INIT` action.
     *
     * It gathers the initial state for each reducer, ensuring the nested structure is respected.
     */
    const gatherInitialState = async () => {
        const initialState = {};
        for (const { reducer, path } of reducerMap.values()) {
            const key = path[path.length - 1]; // Get the last key in the path as the state slice
            try {
                const initState = await reducer(undefined, { type: "@@INIT" });
                let cursor = initialState;
                for (let i = 0; i < path.length - 1; i++) {
                    cursor[path[i]] = cursor[path[i]] || {};
                    cursor = cursor[path[i]];
                }
                cursor[key] = initState;
            }
            catch (error) {
                console.error(`Error initializing state at path "${path.join('.')}" with action "@@INIT": ${error.message}`);
            }
        }
        return initialState;
    };
    /**
     * Combined reducer function.
     *
     * It processes each reducer asynchronously and ensures the state is only updated if necessary.
     */
    return async (state, action) => {
        if (state === undefined) {
            state = await gatherInitialState();
        }
        let hasChanged = false;
        const modified = {}; // To track the modifications
        const nextState = { ...state };
        // Process each reducer in the flattened reducer map
        for (const { reducer, path } of reducerMap.values()) {
            const key = path[path.length - 1];
            const currentState = path.reduce((acc, key) => acc[key], state);
            try {
                const updatedState = await reducer(currentState, action);
                if (currentState !== updatedState) {
                    hasChanged = true;
                    // Apply the change to the state using applyChange
                    state = await applyChange(state, { path, value: updatedState }, modified);
                }
            }
            catch (error) {
                console.error(`Error processing reducer at "${path.join(".")}" with action "${action.type}": ${error.message}`);
            }
        }
        // Return the state only if it has changed, otherwise return the previous state.
        return hasChanged ? state : nextState;
    };
};
/**
 * Applies middleware to the store's dispatch function.
 * Middleware enhances the dispatch function, allowing actions to be intercepted and modified.
 *
 * @param {...Function[]} middlewares Middleware functions to apply.
 * @returns A store enhancer that applies the middleware to the store.
 */
const applyMiddleware = (...middlewares) => {
    const enhancer = (next) => (mainModule, settings, enhancer) => {
        // Create the store with the original reducer and enhancer
        const store = next(mainModule, settings, enhancer);
        // Define starter and middleware APIs
        const middlewareAPI = store.getMiddlewareAPI();
        // Build middleware chain
        const chain = [store.starter(middlewareAPI), ...middlewares.map(middleware => middleware(middlewareAPI))];
        // Compose the middleware chain into a single dispatch function
        let dispatch = chain.reduceRight((next, middleware) => middleware(next), store.dispatch);
        // Return the enhanced store
        return {
            ...store,
            dispatch, // Overwrite dispatch with the enhanced dispatch
        };
    };
    // Ensure the 'name' property is properly set for the enhancer
    Object.defineProperty(enhancer, 'name', { value: 'applyMiddleware' });
    return enhancer;
};

/**
 * Creates a new functional Tracker for managing the execution status of Observables.
 *
 * @returns {Tracker} - A Tracker instance.
 */
const createTracker = () => {
    const entries = new Map();
    const timeout = 30000;
    /**
     * Gets the execution status of a tracked Observable.
     */
    const getStatus = (entry) => entries.get(entry)?.value === true;
    /**
     * Sets the execution status of a tracked Observable.
     */
    const setStatus = (entry, value) => entries.get(entry)?.next(value);
    /**
     * Marks a tracked Observable as completed.
     */
    const setCompletion = (entry) => entries.get(entry)?.complete();
    /**
     * Tracks a new Observable.
     */
    const track = (observable) => {
        if (!entries.has(observable)) {
            const subject = new BehaviorSubject(false);
            entries.set(observable, subject);
        }
    };
    /**
     * Removes a tracked Observable and unsubscribes its BehaviorSubject.
     */
    const remove = (observable) => {
        const subject = entries.get(observable);
        if (subject) {
            entries.delete(observable);
            subject.complete();
        }
    };
    /**
     * Resets the execution status of all tracked Observables to `false`.
     */
    const reset = () => {
        for (const [key, value] of [...entries.entries()]) {
            if (value.closed) {
                entries.delete(key);
            }
            else {
                value.next(false);
            }
        }
    };
    /**
     * Asynchronously checks if all tracked Observables have completed within a timeout period.
     */
    const allExecuted = () => new Promise((resolve, reject) => {
        if ([...entries.values()].length === 0) {
            resolve();
            return;
        }
        const timeoutId = setTimeout(() => reject('Timeout reached'), timeout);
        let numPending = [...entries.values()].length;
        const handleCompletion = () => {
            numPending--;
            if (numPending === 0) {
                clearTimeout(timeoutId);
                resolve();
            }
        };
        const handleError = (error) => {
            clearTimeout(timeoutId);
            reject(error);
        };
        [...entries.values()].forEach((subject) => {
            subject.subscribe({
                next: handleCompletion,
                error: handleError,
                complete: handleCompletion,
            });
        });
    });
    return {
        timeout,
        getStatus,
        setStatus,
        complete: setCompletion,
        track,
        remove,
        reset,
        allExecuted,
    };
};

/**
 * The default settings for the store that configure various behaviors such as action dispatch,
 * state propagation, and reducer handling.
 */
const defaultStoreSettings = {
    dispatchSystemActions: true,
    awaitStatePropagation: true,
    enableMetaReducers: true,
    enableAsyncReducers: true,
    exclusiveActionProcessing: false
};
/**
 * Constant array containing system action types as strings.
 * These action types are likely used internally for system events.
 */
const SYSTEM_ACTION_TYPES = [
    "INITIALIZE_STATE",
    "UPDATE_STATE",
    "STORE_INITIALIZED",
    "MODULE_LOADED",
    "MODULE_UNLOADED"
];
/**
 * Function to check if a given string is a system action type.
 */
function isSystemActionType(type) {
    return SYSTEM_ACTION_TYPES.includes(type);
}
/**
 * Private function to create a system action.
 */
function systemAction(type, payload) {
    return createAction(type, payload);
}
/**
 * Object containing action creator functions for all system action types.
 * Each property name corresponds to a system action type, and the function creates an action object with that type and optional payload.
 */
const systemActions = {
    initializeState: systemAction("INITIALIZE_STATE"),
    updateState: systemAction("UPDATE_STATE"),
    storeInitialized: systemAction("STORE_INITIALIZED"),
    moduleLoaded: systemAction("MODULE_LOADED", (module) => ({ module })),
    moduleUnloaded: systemAction("MODULE_UNLOADED", (module) => ({ module }))
};
/**
 * Creates a new store instance.
 *
 * This function initializes a store with the provided `mainModule` configuration and optional store enhancer.
 * It also accepts store settings that define various configuration options for the store.
 * The `storeSettings` parameter defaults to `defaultStoreSettings` if not provided.
 */
function createStore(mainModule, storeSettingsOrEnhancer, enhancer) {
    let main = { ...defaultMainModule, ...mainModule };
    let modules = [];
    let sysActions = { ...systemActions };
    // Determine if the second argument is storeSettings or enhancer
    let settings;
    if (typeof storeSettingsOrEnhancer === "function") {
        // If it's a function, it's the enhancer
        enhancer = storeSettingsOrEnhancer;
        settings = defaultStoreSettings; // Use default settings if not provided
    }
    else {
        // Otherwise, it's storeSettings
        settings = { ...storeSettingsOrEnhancer, ...defaultStoreSettings };
    }
    // Configure store pipeline
    let pipeline = {
        reducer: combineReducers({ [main.slice]: main.reducer }),
        dependencies: {},
        strategy: settings.exclusiveActionProcessing ? "exclusive" : "concurrent"
    };
    const currentState = new BehaviorSubject({});
    const tracker = createTracker();
    const lock = createLock();
    const stack = createExecutionStack();
    /**
     * Dispatches an action to update the global state.
     *
     * The function validates the action to ensure it is a plain object with a defined and string type property.
     * If any validation fails, a warning is logged to the console and the action is not dispatched.
     * After validation, the action is processed by the reducer, and the global state is updated accordingly.
     */
    let dispatch = async (action) => {
        if (!isPlainObject(action)) {
            console.warn(`Actions must be plain objects. Instead, the actual type was: '${kindOf(action)}'.`);
            return;
        }
        if (typeof action.type === 'undefined') {
            console.warn('Actions may not have an undefined "type" property.');
            return;
        }
        if (typeof action.type !== 'string') {
            console.warn(`Action "type" property must be a string. Instead, the actual type was: '${kindOf(action.type)}'.`);
            return;
        }
        try {
            await updateState('@global', async (state) => await pipeline.reducer(state, action), action);
        }
        catch {
            console.warn('Error during processing the action');
        }
    };
    /**
   * Recursively processes a nested structure of dependencies, handling arrays, objects, and class instances.
   *
   * @param {any} source The source object to process.
   * @param {Object} processed The object to accumulate processed values.
   * @param {string} origin The origin of the current source object (e.g., module name).
   * @returns {any} The processed object.
   *
   * @description
   * This function recursively traverses the `source` object, processing its properties and handling arrays, objects, and class instances. It merges overlapping properties from different sources, logging a warning for each conflict.
   *
   * - **Array Handling:** Recursively processes each element of an array.
   * - **Plain Object Handling:** Iterates over the properties of a plain object, recursively processing each value and merging them into the `processed` object. Logs a warning for overlapping properties.
   * - **Class Instance Handling:** Returns the original class instance without modification to avoid unintended side effects.
   *
   * @example
   * const dependencies = {
   *   a: { b: 1, c: [2, { d: 3 }] },
   *   e: new SomeClass(),
   * };
   *
   * const processedDependencies = processDependencies(dependencies);
   */
    const processDependencies = (source, processed = {}, origin = '') => {
        if (Array.isArray(source)) {
            return source.map(item => processDependencies(item, processed));
        }
        if (source && typeof source === 'object') {
            // Check if the source is a plain object
            if (typeof source.constructor === 'function' && source.constructor !== Object) {
                return source;
            }
            else {
                for (const [key, value] of Object.entries(source)) {
                    if (!processed.hasOwnProperty(key)) {
                        processed[key] = processDependencies(value, processed, origin);
                    }
                    else {
                        console.warn(`Overlapping property '${key}' found in dependencies from module: ${origin}. The existing value will be preserved.`);
                    }
                }
                return processed; // Assume it's a class instance or other non-plain object
            }
        }
        return source;
    };
    /**
     * Merges and injects dependencies from the main module and all feature modules
     * into the pipeline's dependency object. Handles class instantiation.
     */
    const injectDependencies = () => {
        const allDependencies = [mainModule, ...modules].reduce((acc, module) => {
            return processDependencies(module.dependencies, acc, module.slice);
        }, {});
        pipeline.dependencies = allDependencies;
    };
    /**
     * Removes the specified module's dependencies from the pipeline and updates
     * the global dependencies object, ensuring proper handling of nested structures.
     */
    const ejectDependencies = (module) => {
        const otherModules = [mainModule, ...modules].filter(m => m !== module);
        const remainingDependencies = otherModules.reduce((acc, module) => {
            return processDependencies(module.dependencies, acc, module.slice);
        }, {});
        pipeline.dependencies = remainingDependencies;
    };
    /**
     * Loads a new feature module into the store if it isn't already loaded.
     * It ensures that dependencies are injected, the global state is updated,
     * and a `moduleLoaded` action is dispatched once the module is successfully loaded.
     */
    const loadModule = (module) => {
        // Check if the module already exists
        if (modules.some(m => m.slice === module.slice)) {
            return Promise.resolve(); // Module already exists, return without changes
        }
        const promise = lock.acquire()
            .then(() => {
            // Create a new array with the module added
            modules = [...modules, module];
            // Inject dependencies
            return injectDependencies();
        })
            .then(() => updateState("@global", state => setupReducer(state)))
            .finally(() => lock.release());
        // Dispatch module loaded action
        systemActions.moduleLoaded(module);
        return promise;
    };
    /**
     * Unloads a feature module from the store, optionally clearing its state.
     * It removes the module, ejects its dependencies, and updates the global state.
     * A `moduleUnloaded` action is dispatched after the module is unloaded.
     */
    const unloadModule = (module, clearState = false) => {
        // Find the module index in the modules array
        const moduleIndex = modules.findIndex(m => m.slice === module.slice);
        // Check if the module exists
        if (moduleIndex === -1) {
            console.warn(`Module ${module.slice} not found, cannot unload.`);
            return Promise.resolve(); // Module not found, nothing to unload
        }
        const promise = lock.acquire()
            .then(() => {
            // Remove the module from the internal state
            modules.splice(moduleIndex, 1);
            // Eject dependencies
            return ejectDependencies(module);
        })
            .then(() => updateState("@global", async (state) => {
            if (clearState) {
                state = { ...state };
                delete state[module.slice];
            }
            return await setupReducer(state);
        }))
            .finally(() => lock.release());
        // Dispatch module unloaded action
        systemActions.moduleUnloaded(module);
        return promise;
    };
    /**
     * Selects a specific value from the state using the provided selector function.
     * The function returns an observable that emits the selected value whenever the state changes.
     * Optionally, a default value can be provided if the selector returns `undefined`.
     */
    const getState = (slice) => {
        if (currentState.value === undefined || slice === undefined || typeof slice === "string" && slice == "@global") {
            return currentState.value;
        }
        else if (typeof slice === "string") {
            return currentState.value[slice];
        }
        else if (Array.isArray(slice)) {
            return slice.reduce((acc, key) => {
                if (acc === undefined || acc === null) {
                    return undefined;
                }
                else if (Array.isArray(acc)) {
                    return acc[parseInt(key)];
                }
                else {
                    return acc[key];
                }
            }, currentState.value);
        }
        else {
            console.warn("Unsupported type of slice parameter");
        }
    };
    /**
     * Sets the state for a specified slice of the global state, updating it with the given value.
     * Handles different slice types, including a specific key, an array of path keys, or the entire global state.
     */
    const setState = async (slice, value, action = systemActions.updateState()) => {
        let newState;
        if (slice === undefined || typeof slice === "string" && slice == "@global") {
            // Update the whole state with a shallow copy of the value
            newState = ({ ...value });
        }
        else if (typeof slice === "string") {
            // Update the state property with the given key with a shallow copy of the value
            newState = { ...currentState.value, [slice]: { ...value } };
        }
        else if (Array.isArray(slice)) {
            // Apply change to the state based on the provided path and value
            newState = applyChange(currentState.value, { path: slice, value }, {});
        }
        else {
            // Unsupported type of slice parameter
            console.warn("Unsupported type of slice parameter");
            return;
        }
        currentState.next(newState);
        if (settings.awaitStatePropagation) {
            await tracker.allExecuted;
            tracker.reset();
        }
        return newState;
    };
    /**
     * Updates the state for a specified slice by executing the provided callback function,
     * which receives the current state as its argument and returns the updated state.
     * The resulting state is then set using the `setState` function.
     */
    const updateState = async (slice, callback, action = systemActions.updateState()) => {
        if (callback === undefined) {
            console.warn('Callback function is missing. State will not be updated.');
            return;
        }
        let state = getState(slice);
        let result = await callback(state);
        await setState(slice, result, action);
        return action;
    };
    /**
     * Reads the state slice and executes the provided callback with the current state.
     * The function ensures that state is accessed in a thread-safe manner by acquiring a lock.
     */
    const readSafe = (slice, callback) => {
        const promise = (async () => {
            try {
                await lock.acquire(); //Potentially we can check here for an idle of the pipeline
                const state = await getState(slice); // Get state after acquiring lock
                callback(state);
            }
            finally {
                lock.release(); // Release lock regardless of success or failure
            }
        })();
        return promise;
    };
    /**
     * Selects a value from the store's state using the provided selector function.
     */
    function select(selector, defaultValue, tracker) {
        const subject = new Subject();
        let selected$ = selector(currentState, tracker);
        tracker?.track(selected$);
        const subscription = selected$ // Create an inner subscription
            .subscribe({
            next: (value) => {
                const filteredValue = value === undefined ? defaultValue : value;
                if (filteredValue !== undefined) {
                    subject.next(filteredValue);
                    tracker?.setStatus(selected$, true);
                }
            },
            error: (err) => {
                subject.error(err);
                tracker?.setStatus(selected$, true);
            },
            complete: () => {
                tracker?.complete(selected$);
                subject.complete();
            }
        });
        if (subscription) { // Add inner subscription to the outer subscription
            subscription.add(subscription);
        }
        return subject.asObservable();
    }
    /**
     * Sets up and applies reducers for the feature modules, combining them into a single reducer function.
     * Optionally applies meta reducers if enabled.
     */
    const setupReducer = async (state = {}) => {
        let featureReducers = [{ slice: mainModule.slice, reducer: mainModule.reducer }, ...modules].reduce((reducers, module) => {
            let moduleReducer = module.reducer instanceof Function ? module.reducer : { ...module.reducer };
            reducers = { ...reducers, [module.slice]: moduleReducer };
            return reducers;
        }, {});
        let reducer = combineReducers(featureReducers);
        // Define async compose function to apply meta reducers
        const asyncCompose = (...fns) => async (reducer) => {
            for (let i = fns.length - 1; i >= 0; i--) {
                try {
                    reducer = await fns[i](reducer);
                }
                catch (error) {
                    console.warn(`Error in metareducer ${i}:`, error.message);
                }
            }
            return reducer;
        };
        // Apply meta reducers if enabled
        if (settings.enableMetaReducers && mainModule.metaReducers && mainModule.metaReducers.length) {
            try {
                reducer = await asyncCompose(...mainModule.metaReducers)(reducer);
            }
            catch (error) {
                console.warn('Error applying meta reducers:', error.message);
            }
        }
        pipeline.reducer = reducer;
        // Update store state
        return await reducer(state, systemActions.updateState());
    };
    /**
     * Creates the middleware API object for use in the middleware pipeline.
     */
    const getMiddlewareAPI = () => ({
        getState: (slice) => getState(slice),
        dispatch: (action) => dispatch(action),
        dependencies: () => pipeline.dependencies,
        strategy: () => pipeline.strategy,
        lock: lock,
        stack: stack,
    });
    // Apply enhancer if provided
    if (typeof enhancer === "function") {
        // Check if the enhancer contains applyMiddleware
        const hasMiddlewareEnhancer = enhancer.name === 'applyMiddleware' || enhancer.names?.includes('applyMiddleware');
        // If no middleware enhancer is present, apply applyMiddleware explicitly with an empty array
        if (!hasMiddlewareEnhancer) {
            enhancer = combineEnhancers(enhancer, applyMiddleware());
        }
        return enhancer(createStore)(main, settings);
    }
    // Bind system actions
    sysActions = bindActionCreators(systemActions, (action) => settings.dispatchSystemActions && dispatch(action));
    // Initialize state and mark store as initialized
    sysActions.initializeState();
    console.log("%cYou are using ActionStack. Happy coding! 🎉", "font-weight: bold;");
    lock.acquire()
        .then(() => injectDependencies())
        .then(() => setupReducer())
        .then(state => setState("@global", state))
        .finally(() => lock.release());
    sysActions.storeInitialized();
    return {
        starter,
        dispatch,
        getState,
        readSafe,
        select,
        loadModule,
        unloadModule,
        getMiddlewareAPI,
    };
}

/*
 * Public API Surface of actionstack
 */

/**
 * Generated bundle index. Do not edit.
 */

export { EMPTY, createAction as action, applyChange, applyMiddleware, bindActionCreator, bindActionCreators, combineEnhancers, combineReducers, createAction, createActionHandler, createExecutionStack, createFeatureSelector, createInstruction, createLock, createStarter, createStore, createTracker, defaultMainModule, createFeatureSelector as featureSelector, hash, isAction, isAsync, isBoxed, isInstruction, isObservable, isPlainObject, isPromise, isSystemActionType, isValidSignature, kindOf, salt, createSelector as selector, createSelectorAsync as selectorAsync, signature, starter };
//# sourceMappingURL=actionstack-store.mjs.map
