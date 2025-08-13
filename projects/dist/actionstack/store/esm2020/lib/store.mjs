import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Subject } from 'rxjs/internal/Subject';
import { action, bindActionCreators } from './actions';
import { applyChange, applyMiddleware, combineEnhancers, combineReducers } from './utils';
import { createLock } from './lock';
import { createExecutionStack } from './stack';
import { starter } from './starter';
import { createTracker } from './tracker';
import { defaultMainModule, isPlainObject, kindOf, } from './types';
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
export function isSystemActionType(type) {
    return SYSTEM_ACTION_TYPES.includes(type);
}
/**
 * Private function to create a system action.
 */
function systemAction(type, payload) {
    return action(type, payload);
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
export function createStore(mainModule, storeSettingsOrEnhancer, enhancer) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9saWJyYXJpZXMvYWN0aW9uc3RhY2svc3RvcmUvc3JjL2xpYi9zdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWhELE9BQU8sRUFBRSxNQUFNLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQzFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDcEMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sU0FBUyxDQUFDO0FBQy9DLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFDcEMsT0FBTyxFQUFFLGFBQWEsRUFBVyxNQUFNLFdBQVcsQ0FBQztBQUNuRCxPQUFPLEVBSUwsaUJBQWlCLEVBRWpCLGFBQWEsRUFDYixNQUFNLEdBVVAsTUFBTSxTQUFTLENBQUM7QUFlakI7OztHQUdHO0FBQ0gsTUFBTSxvQkFBb0IsR0FBa0I7SUFDMUMscUJBQXFCLEVBQUUsSUFBSTtJQUMzQixxQkFBcUIsRUFBRSxJQUFJO0lBQzNCLGtCQUFrQixFQUFFLElBQUk7SUFDeEIsbUJBQW1CLEVBQUUsSUFBSTtJQUN6Qix5QkFBeUIsRUFBRSxLQUFLO0NBQ2pDLENBQUM7QUFpQkY7OztHQUdHO0FBQ0gsTUFBTSxtQkFBbUIsR0FBRztJQUMxQixrQkFBa0I7SUFDbEIsY0FBYztJQUNkLG1CQUFtQjtJQUNuQixlQUFlO0lBQ2YsaUJBQWlCO0NBQ1QsQ0FBQztBQVFYOztHQUVHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUFDLElBQVk7SUFDN0Ms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QUUsQ0FBQyxDQUFDO0lBRWpDLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBRTlCLE9BQU87UUFDTCxPQUFPO1FBQ1AsUUFBUTtRQUNSLFFBQVE7UUFDUixRQUFRO1FBQ1IsTUFBTTtRQUNOLFVBQVU7UUFDVixZQUFZO1FBQ1osZ0JBQWdCO0tBQ0gsQ0FBQztBQUNsQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgaW5qZWN0IH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XHJcbmltcG9ydCB7IEJlaGF2aW9yU3ViamVjdCB9IGZyb20gJ3J4anMvaW50ZXJuYWwvQmVoYXZpb3JTdWJqZWN0JztcclxuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMvaW50ZXJuYWwvT2JzZXJ2YWJsZSc7XHJcbmltcG9ydCB7IFN1YmplY3QgfSBmcm9tICdyeGpzL2ludGVybmFsL1N1YmplY3QnO1xyXG5cclxuaW1wb3J0IHsgYWN0aW9uLCBiaW5kQWN0aW9uQ3JlYXRvcnMgfSBmcm9tICcuL2FjdGlvbnMnO1xyXG5pbXBvcnQgeyBhcHBseUNoYW5nZSwgYXBwbHlNaWRkbGV3YXJlLCBjb21iaW5lRW5oYW5jZXJzLCBjb21iaW5lUmVkdWNlcnMgfSBmcm9tICcuL3V0aWxzJztcclxuaW1wb3J0IHsgY3JlYXRlTG9jayB9IGZyb20gJy4vbG9jayc7XHJcbmltcG9ydCB7IGNyZWF0ZUV4ZWN1dGlvblN0YWNrIH0gZnJvbSAnLi9zdGFjayc7XHJcbmltcG9ydCB7IHN0YXJ0ZXIgfSBmcm9tICcuL3N0YXJ0ZXInO1xyXG5pbXBvcnQgeyBjcmVhdGVUcmFja2VyLCBUcmFja2VyIH0gZnJvbSAnLi90cmFja2VyJztcclxuaW1wb3J0IHtcclxuICBBY3Rpb24sXHJcbiAgQW55Rm4sXHJcbiAgQXN5bmNSZWR1Y2VyLFxyXG4gIGRlZmF1bHRNYWluTW9kdWxlLFxyXG4gIEZlYXR1cmVNb2R1bGUsXHJcbiAgaXNQbGFpbk9iamVjdCxcclxuICBraW5kT2YsXHJcbiAgTWFpbk1vZHVsZSxcclxuICBNZXRhUmVkdWNlcixcclxuICBNaWRkbGV3YXJlLFxyXG4gIE1pZGRsZXdhcmVBUEksXHJcbiAgT2JzZXJ2ZXIsXHJcbiAgUHJvY2Vzc2luZ1N0cmF0ZWd5LFxyXG4gIFJlZHVjZXIsXHJcbiAgU3RvcmVFbmhhbmNlcixcclxuICBUcmVlLFxyXG59IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuXHJcbi8qKlxyXG4gKiBDbGFzcyByZXByZXNlbnRpbmcgY29uZmlndXJhdGlvbiBvcHRpb25zIGZvciBhIHN0b3JlLlxyXG4gKiBUaGlzIGNsYXNzIGRlZmluZXMgcHJvcGVydGllcyB0aGF0IGNvbnRyb2wgdmFyaW91cyBiZWhhdmlvcnMgb2YgYSBzdG9yZSBmb3IgbWFuYWdpbmcgYXBwbGljYXRpb24gc3RhdGUuXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBTdG9yZVNldHRpbmdzID0ge1xyXG4gIGRpc3BhdGNoU3lzdGVtQWN0aW9ucz86IGJvb2xlYW47XHJcbiAgYXdhaXRTdGF0ZVByb3BhZ2F0aW9uPzogYm9vbGVhbjtcclxuICBlbmFibGVNZXRhUmVkdWNlcnM/OiBib29sZWFuO1xyXG4gIGVuYWJsZUFzeW5jUmVkdWNlcnM/OiBib29sZWFuO1xyXG4gIGV4Y2x1c2l2ZUFjdGlvblByb2Nlc3Npbmc/OiBib29sZWFuO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRoZSBkZWZhdWx0IHNldHRpbmdzIGZvciB0aGUgc3RvcmUgdGhhdCBjb25maWd1cmUgdmFyaW91cyBiZWhhdmlvcnMgc3VjaCBhcyBhY3Rpb24gZGlzcGF0Y2gsXHJcbiAqIHN0YXRlIHByb3BhZ2F0aW9uLCBhbmQgcmVkdWNlciBoYW5kbGluZy5cclxuICovXHJcbmNvbnN0IGRlZmF1bHRTdG9yZVNldHRpbmdzOiBTdG9yZVNldHRpbmdzID0ge1xyXG4gIGRpc3BhdGNoU3lzdGVtQWN0aW9uczogdHJ1ZSxcclxuICBhd2FpdFN0YXRlUHJvcGFnYXRpb246IHRydWUsXHJcbiAgZW5hYmxlTWV0YVJlZHVjZXJzOiB0cnVlLFxyXG4gIGVuYWJsZUFzeW5jUmVkdWNlcnM6IHRydWUsXHJcbiAgZXhjbHVzaXZlQWN0aW9uUHJvY2Vzc2luZzogZmFsc2VcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUaGUgYFN0b3JlYCB0eXBlIHJlcHJlc2VudHMgdGhlIGNvcmUgc3RvcmUgb2JqZWN0IHRoYXQgbWFuYWdlcyBzdGF0ZSwgYWN0aW9ucywgYW5kIG1vZHVsZXMuXHJcbiAqIEl0IHByb3ZpZGVzIG1ldGhvZHMgdG8gaW50ZXJhY3Qgd2l0aCB0aGUgc3RvcmUncyBzdGF0ZSwgZGlzcGF0Y2ggYWN0aW9ucywgbG9hZC91bmxvYWQgbW9kdWxlcywgYW5kIG1vcmUuXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBTdG9yZTxUID0gYW55PiA9IHtcclxuICBkaXNwYXRjaDogKGFjdGlvbjogQWN0aW9uIHwgYW55KSA9PiBQcm9taXNlPHZvaWQ+O1xyXG4gIGdldFN0YXRlOiAoc2xpY2U/OiBrZXlvZiBUIHwgc3RyaW5nW10gfCBcIkBnbG9iYWxcIikgPT4gYW55O1xyXG4gIHJlYWRTYWZlOiAoc2xpY2U6IGtleW9mIFQgfCBzdHJpbmdbXSB8IFwiQGdsb2JhbFwiLCBjYWxsYmFjazogKHN0YXRlOiBSZWFkb25seTxUPikgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pID0+IFByb21pc2U8dm9pZD47XHJcbiAgc2VsZWN0OiA8UiA9IGFueT4oc2VsZWN0b3I6IChvYnM6IE9ic2VydmFibGU8VD4sIHRyYWNrZXI/OiBUcmFja2VyKSA9PiBPYnNlcnZhYmxlPFI+LCBkZWZhdWx0VmFsdWU/OiBhbnkpID0+IE9ic2VydmFibGU8Uj47XHJcbiAgbG9hZE1vZHVsZTogKG1vZHVsZTogRmVhdHVyZU1vZHVsZSkgPT4gUHJvbWlzZTx2b2lkPjtcclxuICB1bmxvYWRNb2R1bGU6IChtb2R1bGU6IEZlYXR1cmVNb2R1bGUsIGNsZWFyU3RhdGU6IGJvb2xlYW4pID0+IFByb21pc2U8dm9pZD47XHJcbiAgZ2V0TWlkZGxld2FyZUFQSTogKCkgPT4gYW55O1xyXG4gIHN0YXJ0ZXI6IE1pZGRsZXdhcmU7XHJcbn07XHJcblxyXG4vKipcclxuICogQ29uc3RhbnQgYXJyYXkgY29udGFpbmluZyBzeXN0ZW0gYWN0aW9uIHR5cGVzIGFzIHN0cmluZ3MuXHJcbiAqIFRoZXNlIGFjdGlvbiB0eXBlcyBhcmUgbGlrZWx5IHVzZWQgaW50ZXJuYWxseSBmb3Igc3lzdGVtIGV2ZW50cy5cclxuICovXHJcbmNvbnN0IFNZU1RFTV9BQ1RJT05fVFlQRVMgPSBbXHJcbiAgXCJJTklUSUFMSVpFX1NUQVRFXCIsXHJcbiAgXCJVUERBVEVfU1RBVEVcIixcclxuICBcIlNUT1JFX0lOSVRJQUxJWkVEXCIsXHJcbiAgXCJNT0RVTEVfTE9BREVEXCIsXHJcbiAgXCJNT0RVTEVfVU5MT0FERURcIlxyXG5dIGFzIGNvbnN0O1xyXG5cclxuLyoqXHJcbiAqIFR5cGUgYWxpYXMgcmVwcmVzZW50aW5nIGFsbCBwb3NzaWJsZSBzeXN0ZW0gYWN0aW9uIHR5cGVzLlxyXG4gKiBUaGlzIHR5cGUgaXMgZGVyaXZlZCBmcm9tIHRoZSBgU1lTVEVNX0FDVElPTl9UWVBFU2AgYXJyYXkgdXNpbmcgdGhlIGB0eXBlb2ZgIG9wZXJhdG9yIGFuZCBlbnN1cmVzIHRoZSB0eXBlIGlzIGFsc28gYSBzdHJpbmcuXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBTeXN0ZW1BY3Rpb25UeXBlcyA9IHR5cGVvZiBTWVNURU1fQUNUSU9OX1RZUEVTW251bWJlcl0gJiBzdHJpbmc7XHJcblxyXG4vKipcclxuICogRnVuY3Rpb24gdG8gY2hlY2sgaWYgYSBnaXZlbiBzdHJpbmcgaXMgYSBzeXN0ZW0gYWN0aW9uIHR5cGUuXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNTeXN0ZW1BY3Rpb25UeXBlKHR5cGU6IHN0cmluZyk6IHR5cGUgaXMgU3lzdGVtQWN0aW9uVHlwZXMge1xyXG4gIHJldHVybiBTWVNURU1fQUNUSU9OX1RZUEVTLmluY2x1ZGVzKHR5cGUgYXMgU3lzdGVtQWN0aW9uVHlwZXMpO1xyXG59XHJcblxyXG4vKipcclxuICogUHJpdmF0ZSBmdW5jdGlvbiB0byBjcmVhdGUgYSBzeXN0ZW0gYWN0aW9uLlxyXG4gKi9cclxuZnVuY3Rpb24gc3lzdGVtQWN0aW9uPFQgZXh0ZW5kcyBTeXN0ZW1BY3Rpb25UeXBlcz4odHlwZTogVCwgcGF5bG9hZD86IEZ1bmN0aW9uKSB7XHJcbiAgcmV0dXJuIGFjdGlvbih0eXBlLCBwYXlsb2FkKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIE9iamVjdCBjb250YWluaW5nIGFjdGlvbiBjcmVhdG9yIGZ1bmN0aW9ucyBmb3IgYWxsIHN5c3RlbSBhY3Rpb24gdHlwZXMuXHJcbiAqIEVhY2ggcHJvcGVydHkgbmFtZSBjb3JyZXNwb25kcyB0byBhIHN5c3RlbSBhY3Rpb24gdHlwZSwgYW5kIHRoZSBmdW5jdGlvbiBjcmVhdGVzIGFuIGFjdGlvbiBvYmplY3Qgd2l0aCB0aGF0IHR5cGUgYW5kIG9wdGlvbmFsIHBheWxvYWQuXHJcbiAqL1xyXG5jb25zdCBzeXN0ZW1BY3Rpb25zID0ge1xyXG4gIGluaXRpYWxpemVTdGF0ZTogc3lzdGVtQWN0aW9uKFwiSU5JVElBTElaRV9TVEFURVwiKSxcclxuICB1cGRhdGVTdGF0ZTogc3lzdGVtQWN0aW9uKFwiVVBEQVRFX1NUQVRFXCIpLFxyXG4gIHN0b3JlSW5pdGlhbGl6ZWQ6IHN5c3RlbUFjdGlvbihcIlNUT1JFX0lOSVRJQUxJWkVEXCIpLFxyXG4gIG1vZHVsZUxvYWRlZDogc3lzdGVtQWN0aW9uKFwiTU9EVUxFX0xPQURFRFwiLCAobW9kdWxlOiBGZWF0dXJlTW9kdWxlKSA9PiAoe21vZHVsZX0pKSxcclxuICBtb2R1bGVVbmxvYWRlZDogc3lzdGVtQWN0aW9uKFwiTU9EVUxFX1VOTE9BREVEXCIsIChtb2R1bGU6IEZlYXR1cmVNb2R1bGUpID0+ICh7bW9kdWxlfSkpXHJcbn07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBzdG9yZSBpbnN0YW5jZS5cclxuICpcclxuICogVGhpcyBmdW5jdGlvbiBpbml0aWFsaXplcyBhIHN0b3JlIHdpdGggdGhlIHByb3ZpZGVkIGBtYWluTW9kdWxlYCBjb25maWd1cmF0aW9uIGFuZCBvcHRpb25hbCBzdG9yZSBlbmhhbmNlci5cclxuICogSXQgYWxzbyBhY2NlcHRzIHN0b3JlIHNldHRpbmdzIHRoYXQgZGVmaW5lIHZhcmlvdXMgY29uZmlndXJhdGlvbiBvcHRpb25zIGZvciB0aGUgc3RvcmUuXHJcbiAqIFRoZSBgc3RvcmVTZXR0aW5nc2AgcGFyYW1ldGVyIGRlZmF1bHRzIHRvIGBkZWZhdWx0U3RvcmVTZXR0aW5nc2AgaWYgbm90IHByb3ZpZGVkLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVN0b3JlPFQgPSBhbnk+KFxyXG4gIG1haW5Nb2R1bGU6IE1haW5Nb2R1bGUsXHJcbiAgc3RvcmVTZXR0aW5nc09yRW5oYW5jZXI/OiBTdG9yZVNldHRpbmdzIHwgU3RvcmVFbmhhbmNlcixcclxuICBlbmhhbmNlcj86IFN0b3JlRW5oYW5jZXJcclxuKTogU3RvcmU8VD4ge1xyXG4gIGxldCBtYWluID0geyAuLi5kZWZhdWx0TWFpbk1vZHVsZSwgLi4ubWFpbk1vZHVsZSB9O1xyXG4gIGxldCBtb2R1bGVzOiBGZWF0dXJlTW9kdWxlW10gPSBbXTtcclxuXHJcbiAgbGV0IHN5c0FjdGlvbnMgPSB7IC4uLnN5c3RlbUFjdGlvbnMgfTtcclxuXHJcbiAgLy8gRGV0ZXJtaW5lIGlmIHRoZSBzZWNvbmQgYXJndW1lbnQgaXMgc3RvcmVTZXR0aW5ncyBvciBlbmhhbmNlclxyXG4gIGxldCBzZXR0aW5nczogU3RvcmVTZXR0aW5ncztcclxuICBpZiAodHlwZW9mIHN0b3JlU2V0dGluZ3NPckVuaGFuY2VyID09PSBcImZ1bmN0aW9uXCIpIHtcclxuICAgIC8vIElmIGl0J3MgYSBmdW5jdGlvbiwgaXQncyB0aGUgZW5oYW5jZXJcclxuICAgIGVuaGFuY2VyID0gc3RvcmVTZXR0aW5nc09yRW5oYW5jZXI7XHJcbiAgICBzZXR0aW5ncyA9IGRlZmF1bHRTdG9yZVNldHRpbmdzOyAvLyBVc2UgZGVmYXVsdCBzZXR0aW5ncyBpZiBub3QgcHJvdmlkZWRcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gT3RoZXJ3aXNlLCBpdCdzIHN0b3JlU2V0dGluZ3NcclxuICAgIHNldHRpbmdzID0geyAuLi5zdG9yZVNldHRpbmdzT3JFbmhhbmNlciwgLi4uZGVmYXVsdFN0b3JlU2V0dGluZ3MgfTtcclxuICB9XHJcblxyXG4gIC8vIENvbmZpZ3VyZSBzdG9yZSBwaXBlbGluZVxyXG4gIGxldCBwaXBlbGluZSA9IHtcclxuICAgIHJlZHVjZXI6IGNvbWJpbmVSZWR1Y2Vycyh7IFttYWluLnNsaWNlIV06IG1haW4ucmVkdWNlciB9KSxcclxuICAgIGRlcGVuZGVuY2llczoge30sXHJcbiAgICBzdHJhdGVneTogc2V0dGluZ3MuZXhjbHVzaXZlQWN0aW9uUHJvY2Vzc2luZyA/IFwiZXhjbHVzaXZlXCIgOiBcImNvbmN1cnJlbnRcIlxyXG4gIH07XHJcblxyXG4gIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8YW55Pih7fSk7XHJcbiAgY29uc3QgdHJhY2tlciA9IGNyZWF0ZVRyYWNrZXIoKTtcclxuICBjb25zdCBsb2NrID0gY3JlYXRlTG9jaygpO1xyXG4gIGNvbnN0IHN0YWNrID0gY3JlYXRlRXhlY3V0aW9uU3RhY2soKTtcclxuXHJcbiAgLyoqXHJcbiAgICogRGlzcGF0Y2hlcyBhbiBhY3Rpb24gdG8gdXBkYXRlIHRoZSBnbG9iYWwgc3RhdGUuXHJcbiAgICpcclxuICAgKiBUaGUgZnVuY3Rpb24gdmFsaWRhdGVzIHRoZSBhY3Rpb24gdG8gZW5zdXJlIGl0IGlzIGEgcGxhaW4gb2JqZWN0IHdpdGggYSBkZWZpbmVkIGFuZCBzdHJpbmcgdHlwZSBwcm9wZXJ0eS5cclxuICAgKiBJZiBhbnkgdmFsaWRhdGlvbiBmYWlscywgYSB3YXJuaW5nIGlzIGxvZ2dlZCB0byB0aGUgY29uc29sZSBhbmQgdGhlIGFjdGlvbiBpcyBub3QgZGlzcGF0Y2hlZC5cclxuICAgKiBBZnRlciB2YWxpZGF0aW9uLCB0aGUgYWN0aW9uIGlzIHByb2Nlc3NlZCBieSB0aGUgcmVkdWNlciwgYW5kIHRoZSBnbG9iYWwgc3RhdGUgaXMgdXBkYXRlZCBhY2NvcmRpbmdseS5cclxuICAgKi9cclxuICBsZXQgZGlzcGF0Y2ggPSBhc3luYyAoYWN0aW9uOiBBY3Rpb24gfCBhbnkpID0+IHtcclxuICAgIGlmICghaXNQbGFpbk9iamVjdChhY3Rpb24pKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihgQWN0aW9ucyBtdXN0IGJlIHBsYWluIG9iamVjdHMuIEluc3RlYWQsIHRoZSBhY3R1YWwgdHlwZSB3YXM6ICcke2tpbmRPZihhY3Rpb24pfScuYCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIGlmICh0eXBlb2YgYWN0aW9uLnR5cGUgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignQWN0aW9ucyBtYXkgbm90IGhhdmUgYW4gdW5kZWZpbmVkIFwidHlwZVwiIHByb3BlcnR5LicpO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBpZiAodHlwZW9mIGFjdGlvbi50eXBlICE9PSAnc3RyaW5nJykge1xyXG4gICAgICBjb25zb2xlLndhcm4oYEFjdGlvbiBcInR5cGVcIiBwcm9wZXJ0eSBtdXN0IGJlIGEgc3RyaW5nLiBJbnN0ZWFkLCB0aGUgYWN0dWFsIHR5cGUgd2FzOiAnJHtraW5kT2YoYWN0aW9uLnR5cGUpfScuYCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB1cGRhdGVTdGF0ZSgnQGdsb2JhbCcsIGFzeW5jIChzdGF0ZTogYW55KSA9PiBhd2FpdCBwaXBlbGluZS5yZWR1Y2VyKHN0YXRlLCBhY3Rpb24pLCBhY3Rpb24pO1xyXG4gICAgfSBjYXRjaCB7XHJcbiAgICAgIGNvbnNvbGUud2FybignRXJyb3IgZHVyaW5nIHByb2Nlc3NpbmcgdGhlIGFjdGlvbicpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gKiBSZWN1cnNpdmVseSBwcm9jZXNzZXMgYSBuZXN0ZWQgc3RydWN0dXJlIG9mIGRlcGVuZGVuY2llcywgaGFuZGxpbmcgYXJyYXlzLCBvYmplY3RzLCBhbmQgY2xhc3MgaW5zdGFuY2VzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge2FueX0gc291cmNlIFRoZSBzb3VyY2Ugb2JqZWN0IHRvIHByb2Nlc3MuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBwcm9jZXNzZWQgVGhlIG9iamVjdCB0byBhY2N1bXVsYXRlIHByb2Nlc3NlZCB2YWx1ZXMuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBvcmlnaW4gVGhlIG9yaWdpbiBvZiB0aGUgY3VycmVudCBzb3VyY2Ugb2JqZWN0IChlLmcuLCBtb2R1bGUgbmFtZSkuXHJcbiAqIEByZXR1cm5zIHthbnl9IFRoZSBwcm9jZXNzZWQgb2JqZWN0LlxyXG4gKlxyXG4gKiBAZGVzY3JpcHRpb25cclxuICogVGhpcyBmdW5jdGlvbiByZWN1cnNpdmVseSB0cmF2ZXJzZXMgdGhlIGBzb3VyY2VgIG9iamVjdCwgcHJvY2Vzc2luZyBpdHMgcHJvcGVydGllcyBhbmQgaGFuZGxpbmcgYXJyYXlzLCBvYmplY3RzLCBhbmQgY2xhc3MgaW5zdGFuY2VzLiBJdCBtZXJnZXMgb3ZlcmxhcHBpbmcgcHJvcGVydGllcyBmcm9tIGRpZmZlcmVudCBzb3VyY2VzLCBsb2dnaW5nIGEgd2FybmluZyBmb3IgZWFjaCBjb25mbGljdC5cclxuICpcclxuICogLSAqKkFycmF5IEhhbmRsaW5nOioqIFJlY3Vyc2l2ZWx5IHByb2Nlc3NlcyBlYWNoIGVsZW1lbnQgb2YgYW4gYXJyYXkuXHJcbiAqIC0gKipQbGFpbiBPYmplY3QgSGFuZGxpbmc6KiogSXRlcmF0ZXMgb3ZlciB0aGUgcHJvcGVydGllcyBvZiBhIHBsYWluIG9iamVjdCwgcmVjdXJzaXZlbHkgcHJvY2Vzc2luZyBlYWNoIHZhbHVlIGFuZCBtZXJnaW5nIHRoZW0gaW50byB0aGUgYHByb2Nlc3NlZGAgb2JqZWN0LiBMb2dzIGEgd2FybmluZyBmb3Igb3ZlcmxhcHBpbmcgcHJvcGVydGllcy5cclxuICogLSAqKkNsYXNzIEluc3RhbmNlIEhhbmRsaW5nOioqIFJldHVybnMgdGhlIG9yaWdpbmFsIGNsYXNzIGluc3RhbmNlIHdpdGhvdXQgbW9kaWZpY2F0aW9uIHRvIGF2b2lkIHVuaW50ZW5kZWQgc2lkZSBlZmZlY3RzLlxyXG4gKlxyXG4gKiBAZXhhbXBsZVxyXG4gKiBjb25zdCBkZXBlbmRlbmNpZXMgPSB7XHJcbiAqICAgYTogeyBiOiAxLCBjOiBbMiwgeyBkOiAzIH1dIH0sXHJcbiAqICAgZTogbmV3IFNvbWVDbGFzcygpLFxyXG4gKiB9O1xyXG4gKlxyXG4gKiBjb25zdCBwcm9jZXNzZWREZXBlbmRlbmNpZXMgPSBwcm9jZXNzRGVwZW5kZW5jaWVzKGRlcGVuZGVuY2llcyk7XHJcbiAqL1xyXG4gIGNvbnN0IHByb2Nlc3NEZXBlbmRlbmNpZXMgPSAoc291cmNlOiBhbnksIHByb2Nlc3NlZDogYW55ID0ge30sIG9yaWdpbjogc3RyaW5nID0gJycpOiBhbnkgPT4ge1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc291cmNlKSkge1xyXG4gICAgICByZXR1cm4gc291cmNlLm1hcChpdGVtID0+IHByb2Nlc3NEZXBlbmRlbmNpZXMoaXRlbSwgcHJvY2Vzc2VkKSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHNvdXJjZSAmJiB0eXBlb2Ygc291cmNlID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAvLyBDaGVjayBpZiB0aGUgc291cmNlIGlzIGEgcGxhaW4gb2JqZWN0XHJcbiAgICAgIGlmICh0eXBlb2Ygc291cmNlLmNvbnN0cnVjdG9yID09PSAnZnVuY3Rpb24nICYmIHNvdXJjZS5jb25zdHJ1Y3RvciAhPT0gT2JqZWN0KSB7XHJcbiAgICAgICAgcmV0dXJuIHNvdXJjZTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhzb3VyY2UpKSB7XHJcbiAgICAgICAgICBpZiAoIXByb2Nlc3NlZC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XHJcbiAgICAgICAgICAgIHByb2Nlc3NlZFtrZXldID0gcHJvY2Vzc0RlcGVuZGVuY2llcyh2YWx1ZSwgcHJvY2Vzc2VkLCBvcmlnaW4pO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKGBPdmVybGFwcGluZyBwcm9wZXJ0eSAnJHtrZXl9JyBmb3VuZCBpbiBkZXBlbmRlbmNpZXMgZnJvbSBtb2R1bGU6ICR7b3JpZ2lufS4gVGhlIGV4aXN0aW5nIHZhbHVlIHdpbGwgYmUgcHJlc2VydmVkLmApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gcHJvY2Vzc2VkOy8vIEFzc3VtZSBpdCdzIGEgY2xhc3MgaW5zdGFuY2Ugb3Igb3RoZXIgbm9uLXBsYWluIG9iamVjdFxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHNvdXJjZTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBNZXJnZXMgYW5kIGluamVjdHMgZGVwZW5kZW5jaWVzIGZyb20gdGhlIG1haW4gbW9kdWxlIGFuZCBhbGwgZmVhdHVyZSBtb2R1bGVzXHJcbiAgICogaW50byB0aGUgcGlwZWxpbmUncyBkZXBlbmRlbmN5IG9iamVjdC4gSGFuZGxlcyBjbGFzcyBpbnN0YW50aWF0aW9uLlxyXG4gICAqL1xyXG4gIGNvbnN0IGluamVjdERlcGVuZGVuY2llcyA9ICgpOiB2b2lkID0+IHtcclxuICAgIGNvbnN0IGFsbERlcGVuZGVuY2llcyA9IFttYWluTW9kdWxlLCAuLi5tb2R1bGVzXS5yZWR1Y2UoKGFjYywgbW9kdWxlKSA9PiB7XHJcbiAgICAgIHJldHVybiBwcm9jZXNzRGVwZW5kZW5jaWVzKG1vZHVsZS5kZXBlbmRlbmNpZXMsIGFjYywgbW9kdWxlLnNsaWNlKTtcclxuICAgIH0sIHt9KTtcclxuXHJcbiAgICBwaXBlbGluZS5kZXBlbmRlbmNpZXMgPSBhbGxEZXBlbmRlbmNpZXM7XHJcbiAgfTtcclxuXHJcbiAgLyoqXHJcbiAgICogUmVtb3ZlcyB0aGUgc3BlY2lmaWVkIG1vZHVsZSdzIGRlcGVuZGVuY2llcyBmcm9tIHRoZSBwaXBlbGluZSBhbmQgdXBkYXRlc1xyXG4gICAqIHRoZSBnbG9iYWwgZGVwZW5kZW5jaWVzIG9iamVjdCwgZW5zdXJpbmcgcHJvcGVyIGhhbmRsaW5nIG9mIG5lc3RlZCBzdHJ1Y3R1cmVzLlxyXG4gICAqL1xyXG4gIGNvbnN0IGVqZWN0RGVwZW5kZW5jaWVzID0gKG1vZHVsZTogRmVhdHVyZU1vZHVsZSk6IHZvaWQgPT4ge1xyXG4gICAgY29uc3Qgb3RoZXJNb2R1bGVzID0gW21haW5Nb2R1bGUsIC4uLm1vZHVsZXNdLmZpbHRlcihtID0+IG0gIT09IG1vZHVsZSk7XHJcbiAgICBjb25zdCByZW1haW5pbmdEZXBlbmRlbmNpZXMgPSBvdGhlck1vZHVsZXMucmVkdWNlKChhY2MsIG1vZHVsZSkgPT4ge1xyXG4gICAgICByZXR1cm4gcHJvY2Vzc0RlcGVuZGVuY2llcyhtb2R1bGUuZGVwZW5kZW5jaWVzLCBhY2MsIG1vZHVsZS5zbGljZSk7XHJcbiAgICB9LCB7fSk7XHJcblxyXG4gICAgcGlwZWxpbmUuZGVwZW5kZW5jaWVzID0gcmVtYWluaW5nRGVwZW5kZW5jaWVzO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIExvYWRzIGEgbmV3IGZlYXR1cmUgbW9kdWxlIGludG8gdGhlIHN0b3JlIGlmIGl0IGlzbid0IGFscmVhZHkgbG9hZGVkLlxyXG4gICAqIEl0IGVuc3VyZXMgdGhhdCBkZXBlbmRlbmNpZXMgYXJlIGluamVjdGVkLCB0aGUgZ2xvYmFsIHN0YXRlIGlzIHVwZGF0ZWQsXHJcbiAgICogYW5kIGEgYG1vZHVsZUxvYWRlZGAgYWN0aW9uIGlzIGRpc3BhdGNoZWQgb25jZSB0aGUgbW9kdWxlIGlzIHN1Y2Nlc3NmdWxseSBsb2FkZWQuXHJcbiAgICovXHJcbiAgY29uc3QgbG9hZE1vZHVsZSA9IChtb2R1bGU6IEZlYXR1cmVNb2R1bGUpOiBQcm9taXNlPHZvaWQ+ID0+IHtcclxuICAgIC8vIENoZWNrIGlmIHRoZSBtb2R1bGUgYWxyZWFkeSBleGlzdHNcclxuICAgIGlmIChtb2R1bGVzLnNvbWUobSA9PiBtLnNsaWNlID09PSBtb2R1bGUuc2xpY2UpKSB7XHJcbiAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTsgLy8gTW9kdWxlIGFscmVhZHkgZXhpc3RzLCByZXR1cm4gd2l0aG91dCBjaGFuZ2VzXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcHJvbWlzZSA9IGxvY2suYWNxdWlyZSgpXHJcbiAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAvLyBDcmVhdGUgYSBuZXcgYXJyYXkgd2l0aCB0aGUgbW9kdWxlIGFkZGVkXHJcbiAgICAgICAgbW9kdWxlcyA9IFsuLi5tb2R1bGVzLCBtb2R1bGVdO1xyXG5cclxuICAgICAgICAvLyBJbmplY3QgZGVwZW5kZW5jaWVzXHJcbiAgICAgICAgcmV0dXJuIGluamVjdERlcGVuZGVuY2llcygpO1xyXG4gICAgICB9KVxyXG4gICAgICAudGhlbigoKSA9PiB1cGRhdGVTdGF0ZShcIkBnbG9iYWxcIiwgc3RhdGUgPT4gc2V0dXBSZWR1Y2VyKHN0YXRlKSkpXHJcbiAgICAgIC5maW5hbGx5KCgpID0+IGxvY2sucmVsZWFzZSgpKTtcclxuXHJcbiAgICAvLyBEaXNwYXRjaCBtb2R1bGUgbG9hZGVkIGFjdGlvblxyXG4gICAgc3lzdGVtQWN0aW9ucy5tb2R1bGVMb2FkZWQobW9kdWxlKTtcclxuICAgIHJldHVybiBwcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVW5sb2FkcyBhIGZlYXR1cmUgbW9kdWxlIGZyb20gdGhlIHN0b3JlLCBvcHRpb25hbGx5IGNsZWFyaW5nIGl0cyBzdGF0ZS5cclxuICAgKiBJdCByZW1vdmVzIHRoZSBtb2R1bGUsIGVqZWN0cyBpdHMgZGVwZW5kZW5jaWVzLCBhbmQgdXBkYXRlcyB0aGUgZ2xvYmFsIHN0YXRlLlxyXG4gICAqIEEgYG1vZHVsZVVubG9hZGVkYCBhY3Rpb24gaXMgZGlzcGF0Y2hlZCBhZnRlciB0aGUgbW9kdWxlIGlzIHVubG9hZGVkLlxyXG4gICAqL1xyXG4gIGNvbnN0IHVubG9hZE1vZHVsZSA9IChtb2R1bGU6IEZlYXR1cmVNb2R1bGUsIGNsZWFyU3RhdGU6IGJvb2xlYW4gPSBmYWxzZSk6IFByb21pc2U8dm9pZD4gPT4ge1xyXG4gICAgLy8gRmluZCB0aGUgbW9kdWxlIGluZGV4IGluIHRoZSBtb2R1bGVzIGFycmF5XHJcbiAgICBjb25zdCBtb2R1bGVJbmRleCA9IG1vZHVsZXMuZmluZEluZGV4KG0gPT4gbS5zbGljZSA9PT0gbW9kdWxlLnNsaWNlKTtcclxuXHJcbiAgICAvLyBDaGVjayBpZiB0aGUgbW9kdWxlIGV4aXN0c1xyXG4gICAgaWYgKG1vZHVsZUluZGV4ID09PSAtMSkge1xyXG4gICAgICBjb25zb2xlLndhcm4oYE1vZHVsZSAke21vZHVsZS5zbGljZX0gbm90IGZvdW5kLCBjYW5ub3QgdW5sb2FkLmApO1xyXG4gICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7IC8vIE1vZHVsZSBub3QgZm91bmQsIG5vdGhpbmcgdG8gdW5sb2FkXHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcHJvbWlzZSA9IGxvY2suYWNxdWlyZSgpXHJcbiAgICAgIC50aGVuKCgpID0+IHtcclxuICAgICAgICAvLyBSZW1vdmUgdGhlIG1vZHVsZSBmcm9tIHRoZSBpbnRlcm5hbCBzdGF0ZVxyXG4gICAgICAgIG1vZHVsZXMuc3BsaWNlKG1vZHVsZUluZGV4LCAxKTtcclxuXHJcbiAgICAgICAgLy8gRWplY3QgZGVwZW5kZW5jaWVzXHJcbiAgICAgICAgcmV0dXJuIGVqZWN0RGVwZW5kZW5jaWVzKG1vZHVsZSk7XHJcbiAgICAgIH0pXHJcbiAgICAgIC50aGVuKCgpID0+IHVwZGF0ZVN0YXRlKFwiQGdsb2JhbFwiLCBhc3luYyAoc3RhdGUpID0+IHtcclxuICAgICAgICBpZiAoY2xlYXJTdGF0ZSkge1xyXG4gICAgICAgICAgc3RhdGUgPSB7IC4uLnN0YXRlIH07XHJcbiAgICAgICAgICBkZWxldGUgc3RhdGVbbW9kdWxlLnNsaWNlXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHNldHVwUmVkdWNlcihzdGF0ZSk7XHJcbiAgICAgIH0pKVxyXG4gICAgICAuZmluYWxseSgoKSA9PiBsb2NrLnJlbGVhc2UoKSk7XHJcblxyXG4gICAgLy8gRGlzcGF0Y2ggbW9kdWxlIHVubG9hZGVkIGFjdGlvblxyXG4gICAgc3lzdGVtQWN0aW9ucy5tb2R1bGVVbmxvYWRlZChtb2R1bGUpO1xyXG4gICAgcmV0dXJuIHByb21pc2U7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZWxlY3RzIGEgc3BlY2lmaWMgdmFsdWUgZnJvbSB0aGUgc3RhdGUgdXNpbmcgdGhlIHByb3ZpZGVkIHNlbGVjdG9yIGZ1bmN0aW9uLlxyXG4gICAqIFRoZSBmdW5jdGlvbiByZXR1cm5zIGFuIG9ic2VydmFibGUgdGhhdCBlbWl0cyB0aGUgc2VsZWN0ZWQgdmFsdWUgd2hlbmV2ZXIgdGhlIHN0YXRlIGNoYW5nZXMuXHJcbiAgICogT3B0aW9uYWxseSwgYSBkZWZhdWx0IHZhbHVlIGNhbiBiZSBwcm92aWRlZCBpZiB0aGUgc2VsZWN0b3IgcmV0dXJucyBgdW5kZWZpbmVkYC5cclxuICAgKi9cclxuICBjb25zdCBnZXRTdGF0ZSA9IChzbGljZT86IGtleW9mIFQgfCBzdHJpbmdbXSB8IFwiQGdsb2JhbFwiKTogYW55ID0+IHtcclxuICAgIGlmIChjdXJyZW50U3RhdGUudmFsdWUgPT09IHVuZGVmaW5lZCB8fCBzbGljZSA9PT0gdW5kZWZpbmVkIHx8IHR5cGVvZiBzbGljZSA9PT0gXCJzdHJpbmdcIiAmJiBzbGljZSA9PSBcIkBnbG9iYWxcIikge1xyXG4gICAgICByZXR1cm4gY3VycmVudFN0YXRlLnZhbHVlIGFzIFQ7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzbGljZSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICByZXR1cm4gY3VycmVudFN0YXRlLnZhbHVlW3NsaWNlXSBhcyBUO1xyXG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KHNsaWNlKSkge1xyXG4gICAgICByZXR1cm4gc2xpY2UucmVkdWNlKChhY2MsIGtleSkgPT4ge1xyXG4gICAgICAgIGlmIChhY2MgPT09IHVuZGVmaW5lZCB8fCBhY2MgPT09IG51bGwpIHtcclxuICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KGFjYykpIHtcclxuICAgICAgICAgIHJldHVybiBhY2NbcGFyc2VJbnQoa2V5KV07XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHJldHVybiBhY2Nba2V5XTtcclxuICAgICAgICB9XHJcbiAgICAgIH0sIGN1cnJlbnRTdGF0ZS52YWx1ZSkgYXMgVDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihcIlVuc3VwcG9ydGVkIHR5cGUgb2Ygc2xpY2UgcGFyYW1ldGVyXCIpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2V0cyB0aGUgc3RhdGUgZm9yIGEgc3BlY2lmaWVkIHNsaWNlIG9mIHRoZSBnbG9iYWwgc3RhdGUsIHVwZGF0aW5nIGl0IHdpdGggdGhlIGdpdmVuIHZhbHVlLlxyXG4gICAqIEhhbmRsZXMgZGlmZmVyZW50IHNsaWNlIHR5cGVzLCBpbmNsdWRpbmcgYSBzcGVjaWZpYyBrZXksIGFuIGFycmF5IG9mIHBhdGgga2V5cywgb3IgdGhlIGVudGlyZSBnbG9iYWwgc3RhdGUuXHJcbiAgICovXHJcbiAgY29uc3Qgc2V0U3RhdGUgPSBhc3luYyA8VCA9IGFueT4oc2xpY2U6IGtleW9mIFQgfCBzdHJpbmdbXSB8IFwiQGdsb2JhbFwiIHwgdW5kZWZpbmVkLCB2YWx1ZTogYW55LCBhY3Rpb24gPSBzeXN0ZW1BY3Rpb25zLnVwZGF0ZVN0YXRlKCkgYXMgQWN0aW9uKTogUHJvbWlzZTxhbnk+ID0+IHtcclxuICAgIGxldCBuZXdTdGF0ZTogYW55O1xyXG4gICAgaWYgKHNsaWNlID09PSB1bmRlZmluZWQgfHwgdHlwZW9mIHNsaWNlID09PSBcInN0cmluZ1wiICYmIHNsaWNlID09IFwiQGdsb2JhbFwiKSB7XHJcbiAgICAgIC8vIFVwZGF0ZSB0aGUgd2hvbGUgc3RhdGUgd2l0aCBhIHNoYWxsb3cgY29weSBvZiB0aGUgdmFsdWVcclxuICAgICAgbmV3U3RhdGUgPSAoey4uLnZhbHVlfSk7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBzbGljZSA9PT0gXCJzdHJpbmdcIikge1xyXG4gICAgICAvLyBVcGRhdGUgdGhlIHN0YXRlIHByb3BlcnR5IHdpdGggdGhlIGdpdmVuIGtleSB3aXRoIGEgc2hhbGxvdyBjb3B5IG9mIHRoZSB2YWx1ZVxyXG4gICAgICBuZXdTdGF0ZSA9IHsuLi5jdXJyZW50U3RhdGUudmFsdWUsIFtzbGljZV06IHsgLi4udmFsdWUgfX07XHJcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoc2xpY2UpKSB7XHJcbiAgICAgIC8vIEFwcGx5IGNoYW5nZSB0byB0aGUgc3RhdGUgYmFzZWQgb24gdGhlIHByb3ZpZGVkIHBhdGggYW5kIHZhbHVlXHJcbiAgICAgIG5ld1N0YXRlID0gYXBwbHlDaGFuZ2UoY3VycmVudFN0YXRlLnZhbHVlLCB7cGF0aDogc2xpY2UsIHZhbHVlfSwge30pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gVW5zdXBwb3J0ZWQgdHlwZSBvZiBzbGljZSBwYXJhbWV0ZXJcclxuICAgICAgY29uc29sZS53YXJuKFwiVW5zdXBwb3J0ZWQgdHlwZSBvZiBzbGljZSBwYXJhbWV0ZXJcIik7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcblxyXG4gICAgY3VycmVudFN0YXRlLm5leHQobmV3U3RhdGUpO1xyXG5cclxuICAgIGlmIChzZXR0aW5ncy5hd2FpdFN0YXRlUHJvcGFnYXRpb24pIHtcclxuICAgICAgYXdhaXQgdHJhY2tlci5hbGxFeGVjdXRlZDtcclxuICAgICAgdHJhY2tlci5yZXNldCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZXdTdGF0ZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZXMgdGhlIHN0YXRlIGZvciBhIHNwZWNpZmllZCBzbGljZSBieSBleGVjdXRpbmcgdGhlIHByb3ZpZGVkIGNhbGxiYWNrIGZ1bmN0aW9uLFxyXG4gICAqIHdoaWNoIHJlY2VpdmVzIHRoZSBjdXJyZW50IHN0YXRlIGFzIGl0cyBhcmd1bWVudCBhbmQgcmV0dXJucyB0aGUgdXBkYXRlZCBzdGF0ZS5cclxuICAgKiBUaGUgcmVzdWx0aW5nIHN0YXRlIGlzIHRoZW4gc2V0IHVzaW5nIHRoZSBgc2V0U3RhdGVgIGZ1bmN0aW9uLlxyXG4gICAqL1xyXG4gIGNvbnN0IHVwZGF0ZVN0YXRlID0gYXN5bmMgKHNsaWNlOiBrZXlvZiBUIHwgc3RyaW5nW10gfCBcIkBnbG9iYWxcIiB8IHVuZGVmaW5lZCwgY2FsbGJhY2s6IEFueUZuLCBhY3Rpb24gPSBzeXN0ZW1BY3Rpb25zLnVwZGF0ZVN0YXRlKCkgYXMgQWN0aW9uKTogUHJvbWlzZTxhbnk+ID0+IHtcclxuICAgIGlmKGNhbGxiYWNrID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdDYWxsYmFjayBmdW5jdGlvbiBpcyBtaXNzaW5nLiBTdGF0ZSB3aWxsIG5vdCBiZSB1cGRhdGVkLicpXHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgc3RhdGUgPSBnZXRTdGF0ZShzbGljZSk7XHJcbiAgICBsZXQgcmVzdWx0ID0gYXdhaXQgY2FsbGJhY2soc3RhdGUpO1xyXG4gICAgYXdhaXQgc2V0U3RhdGUoc2xpY2UsIHJlc3VsdCwgYWN0aW9uKTtcclxuXHJcbiAgICByZXR1cm4gYWN0aW9uO1xyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlYWRzIHRoZSBzdGF0ZSBzbGljZSBhbmQgZXhlY3V0ZXMgdGhlIHByb3ZpZGVkIGNhbGxiYWNrIHdpdGggdGhlIGN1cnJlbnQgc3RhdGUuXHJcbiAgICogVGhlIGZ1bmN0aW9uIGVuc3VyZXMgdGhhdCBzdGF0ZSBpcyBhY2Nlc3NlZCBpbiBhIHRocmVhZC1zYWZlIG1hbm5lciBieSBhY3F1aXJpbmcgYSBsb2NrLlxyXG4gICAqL1xyXG4gIGNvbnN0IHJlYWRTYWZlID0gKHNsaWNlOiBrZXlvZiBUIHwgc3RyaW5nW10sIGNhbGxiYWNrOiAoc3RhdGU6ICBSZWFkb25seTxUPikgPT4gdm9pZCB8IFByb21pc2U8dm9pZD4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcclxuICAgIGNvbnN0IHByb21pc2UgPSAoYXN5bmMgKCkgPT4ge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IGxvY2suYWNxdWlyZSgpOyAvL1BvdGVudGlhbGx5IHdlIGNhbiBjaGVjayBoZXJlIGZvciBhbiBpZGxlIG9mIHRoZSBwaXBlbGluZVxyXG4gICAgICAgIGNvbnN0IHN0YXRlID0gYXdhaXQgZ2V0U3RhdGUoc2xpY2UpOyAvLyBHZXQgc3RhdGUgYWZ0ZXIgYWNxdWlyaW5nIGxvY2tcclxuICAgICAgICBjYWxsYmFjayhzdGF0ZSk7XHJcbiAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgbG9jay5yZWxlYXNlKCk7IC8vIFJlbGVhc2UgbG9jayByZWdhcmRsZXNzIG9mIHN1Y2Nlc3Mgb3IgZmFpbHVyZVxyXG4gICAgICB9XHJcbiAgICB9KSgpO1xyXG5cclxuICAgIHJldHVybiBwcm9taXNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VsZWN0cyBhIHZhbHVlIGZyb20gdGhlIHN0b3JlJ3Mgc3RhdGUgdXNpbmcgdGhlIHByb3ZpZGVkIHNlbGVjdG9yIGZ1bmN0aW9uLlxyXG4gICAqL1xyXG4gIGZ1bmN0aW9uIHNlbGVjdDxULCBSID0gYW55PihcclxuICAgIHNlbGVjdG9yOiAob2JzOiBPYnNlcnZhYmxlPFQ+LCB0cmFja2VyPzogVHJhY2tlcikgPT4gT2JzZXJ2YWJsZTxSPixcclxuICAgIGRlZmF1bHRWYWx1ZT86IFIsXHJcbiAgICB0cmFja2VyPzogVHJhY2tlcixcclxuICApOiBPYnNlcnZhYmxlPFI+IHtcclxuICAgIGNvbnN0IHN1YmplY3QgPSBuZXcgU3ViamVjdDxSPigpO1xyXG4gICAgbGV0IHNlbGVjdGVkJCA9IHNlbGVjdG9yKGN1cnJlbnRTdGF0ZSwgdHJhY2tlcik7XHJcbiAgICB0cmFja2VyPy50cmFjayhzZWxlY3RlZCQpO1xyXG5cclxuICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IHNlbGVjdGVkJCAvLyBDcmVhdGUgYW4gaW5uZXIgc3Vic2NyaXB0aW9uXHJcbiAgICAgIC5zdWJzY3JpYmUoe1xyXG4gICAgICAgIG5leHQ6ICh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgY29uc3QgZmlsdGVyZWRWYWx1ZSA9IHZhbHVlID09PSB1bmRlZmluZWQgPyBkZWZhdWx0VmFsdWUgOiB2YWx1ZTtcclxuICAgICAgICAgIGlmIChmaWx0ZXJlZFZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgc3ViamVjdC5uZXh0KGZpbHRlcmVkVmFsdWUpO1xyXG4gICAgICAgICAgICB0cmFja2VyPy5zZXRTdGF0dXMoc2VsZWN0ZWQkLCB0cnVlKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGVycm9yOiAoZXJyKSA9PiB7XHJcbiAgICAgICAgICBzdWJqZWN0LmVycm9yKGVycilcclxuICAgICAgICAgIHRyYWNrZXI/LnNldFN0YXR1cyhzZWxlY3RlZCQsIHRydWUpO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY29tcGxldGU6ICgpID0+IHtcclxuICAgICAgICAgIHRyYWNrZXI/LmNvbXBsZXRlKHNlbGVjdGVkJCk7XHJcbiAgICAgICAgICBzdWJqZWN0LmNvbXBsZXRlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICBpZiAoc3Vic2NyaXB0aW9uKSB7IC8vIEFkZCBpbm5lciBzdWJzY3JpcHRpb24gdG8gdGhlIG91dGVyIHN1YnNjcmlwdGlvblxyXG4gICAgICBzdWJzY3JpcHRpb24uYWRkKHN1YnNjcmlwdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHN1YmplY3QuYXNPYnNlcnZhYmxlKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZXRzIHVwIGFuZCBhcHBsaWVzIHJlZHVjZXJzIGZvciB0aGUgZmVhdHVyZSBtb2R1bGVzLCBjb21iaW5pbmcgdGhlbSBpbnRvIGEgc2luZ2xlIHJlZHVjZXIgZnVuY3Rpb24uXHJcbiAgICogT3B0aW9uYWxseSBhcHBsaWVzIG1ldGEgcmVkdWNlcnMgaWYgZW5hYmxlZC5cclxuICAgKi9cclxuICBjb25zdCBzZXR1cFJlZHVjZXIgPSBhc3luYyAoc3RhdGU6IGFueSA9IHt9KTogUHJvbWlzZTxhbnk+ID0+IHtcclxuXHJcbiAgICBsZXQgZmVhdHVyZVJlZHVjZXJzID0gW3tzbGljZTogbWFpbk1vZHVsZS5zbGljZSEsIHJlZHVjZXI6IG1haW5Nb2R1bGUucmVkdWNlcn0sIC4uLm1vZHVsZXNdLnJlZHVjZSgocmVkdWNlcnMsIG1vZHVsZSkgPT4ge1xyXG4gICAgICBsZXQgbW9kdWxlUmVkdWNlcjogYW55ID0gbW9kdWxlLnJlZHVjZXIgaW5zdGFuY2VvZiBGdW5jdGlvbiA/IG1vZHVsZS5yZWR1Y2VyIDogey4uLm1vZHVsZS5yZWR1Y2VyfTtcclxuICAgICAgcmVkdWNlcnMgPSB7Li4ucmVkdWNlcnMsIFttb2R1bGUuc2xpY2VdOiBtb2R1bGVSZWR1Y2VyfTtcclxuICAgICAgcmV0dXJuIHJlZHVjZXJzO1xyXG4gICAgfSwge30gYXMgVHJlZTxSZWR1Y2VyPik7XHJcblxyXG4gICAgbGV0IHJlZHVjZXIgPSBjb21iaW5lUmVkdWNlcnMoZmVhdHVyZVJlZHVjZXJzKTtcclxuXHJcbiAgICAvLyBEZWZpbmUgYXN5bmMgY29tcG9zZSBmdW5jdGlvbiB0byBhcHBseSBtZXRhIHJlZHVjZXJzXHJcbiAgICBjb25zdCBhc3luY0NvbXBvc2UgPSAoLi4uZm5zOiBNZXRhUmVkdWNlcltdKSA9PiBhc3luYyAocmVkdWNlcjogQXN5bmNSZWR1Y2VyKSA9PiB7XHJcbiAgICAgIGZvciAobGV0IGkgPSBmbnMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgcmVkdWNlciA9IGF3YWl0IGZuc1tpXShyZWR1Y2VyKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oYEVycm9yIGluIG1ldGFyZWR1Y2VyICR7aX06YCwgZXJyb3IubWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiByZWR1Y2VyO1xyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBcHBseSBtZXRhIHJlZHVjZXJzIGlmIGVuYWJsZWRcclxuICAgIGlmIChzZXR0aW5ncy5lbmFibGVNZXRhUmVkdWNlcnMgJiYgbWFpbk1vZHVsZS5tZXRhUmVkdWNlcnMgJiYgbWFpbk1vZHVsZS5tZXRhUmVkdWNlcnMubGVuZ3RoKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgcmVkdWNlciA9IGF3YWl0IGFzeW5jQ29tcG9zZSguLi5tYWluTW9kdWxlLm1ldGFSZWR1Y2VycykocmVkdWNlcik7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oJ0Vycm9yIGFwcGx5aW5nIG1ldGEgcmVkdWNlcnM6JywgZXJyb3IubWVzc2FnZSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBwaXBlbGluZS5yZWR1Y2VyID0gcmVkdWNlcjtcclxuXHJcbiAgICAvLyBVcGRhdGUgc3RvcmUgc3RhdGVcclxuICAgIHJldHVybiBhd2FpdCByZWR1Y2VyKHN0YXRlLCBzeXN0ZW1BY3Rpb25zLnVwZGF0ZVN0YXRlKCkgYXMgQWN0aW9uKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZXMgdGhlIG1pZGRsZXdhcmUgQVBJIG9iamVjdCBmb3IgdXNlIGluIHRoZSBtaWRkbGV3YXJlIHBpcGVsaW5lLlxyXG4gICAqL1xyXG4gIGNvbnN0IGdldE1pZGRsZXdhcmVBUEkgPSAoKSA9PiAoe1xyXG4gICAgZ2V0U3RhdGU6IChzbGljZT86IGFueSkgPT4gZ2V0U3RhdGUoc2xpY2UpLFxyXG4gICAgZGlzcGF0Y2g6IChhY3Rpb246IGFueSkgPT4gZGlzcGF0Y2goYWN0aW9uKSxcclxuICAgIGRlcGVuZGVuY2llczogKCkgPT4gcGlwZWxpbmUuZGVwZW5kZW5jaWVzLFxyXG4gICAgc3RyYXRlZ3k6ICgpID0+IHBpcGVsaW5lLnN0cmF0ZWd5LFxyXG4gICAgbG9jazogbG9jayxcclxuICAgIHN0YWNrOiBzdGFjayxcclxuICB9IGFzIE1pZGRsZXdhcmVBUEkpO1xyXG5cclxuICAvLyBBcHBseSBlbmhhbmNlciBpZiBwcm92aWRlZFxyXG4gIGlmICh0eXBlb2YgZW5oYW5jZXIgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgLy8gQ2hlY2sgaWYgdGhlIGVuaGFuY2VyIGNvbnRhaW5zIGFwcGx5TWlkZGxld2FyZVxyXG4gICAgY29uc3QgaGFzTWlkZGxld2FyZUVuaGFuY2VyID0gZW5oYW5jZXIubmFtZSA9PT0gJ2FwcGx5TWlkZGxld2FyZScgfHwgKGVuaGFuY2VyIGFzIGFueSkubmFtZXM/LmluY2x1ZGVzKCdhcHBseU1pZGRsZXdhcmUnKTtcclxuXHJcbiAgICAvLyBJZiBubyBtaWRkbGV3YXJlIGVuaGFuY2VyIGlzIHByZXNlbnQsIGFwcGx5IGFwcGx5TWlkZGxld2FyZSBleHBsaWNpdGx5IHdpdGggYW4gZW1wdHkgYXJyYXlcclxuICAgIGlmICghaGFzTWlkZGxld2FyZUVuaGFuY2VyKSB7XHJcbiAgICAgIGVuaGFuY2VyID0gY29tYmluZUVuaGFuY2VycyhlbmhhbmNlciwgYXBwbHlNaWRkbGV3YXJlKCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlbmhhbmNlcihjcmVhdGVTdG9yZSkobWFpbiwgc2V0dGluZ3MpO1xyXG4gIH1cclxuXHJcbiAgLy8gQmluZCBzeXN0ZW0gYWN0aW9uc1xyXG4gIHN5c0FjdGlvbnMgPSBiaW5kQWN0aW9uQ3JlYXRvcnMoc3lzdGVtQWN0aW9ucywgKGFjdGlvbjogQWN0aW9uKSA9PiBzZXR0aW5ncy5kaXNwYXRjaFN5c3RlbUFjdGlvbnMgJiYgZGlzcGF0Y2goYWN0aW9uKSk7XHJcblxyXG4gIC8vIEluaXRpYWxpemUgc3RhdGUgYW5kIG1hcmsgc3RvcmUgYXMgaW5pdGlhbGl6ZWRcclxuICBzeXNBY3Rpb25zLmluaXRpYWxpemVTdGF0ZSgpO1xyXG5cclxuICBjb25zb2xlLmxvZyhcIiVjWW91IGFyZSB1c2luZyBBY3Rpb25TdGFjay4gSGFwcHkgY29kaW5nISDwn46JXCIsIFwiZm9udC13ZWlnaHQ6IGJvbGQ7XCIpO1xyXG5cclxuICBsb2NrLmFjcXVpcmUoKVxyXG4gICAgLnRoZW4oKCkgPT4gaW5qZWN0RGVwZW5kZW5jaWVzKCkpXHJcbiAgICAudGhlbigoKSA9PiBzZXR1cFJlZHVjZXIoKSlcclxuICAgIC50aGVuKHN0YXRlID0+IHNldFN0YXRlKFwiQGdsb2JhbFwiLCBzdGF0ZSkpXHJcbiAgICAuZmluYWxseSgoKSA9PiBsb2NrLnJlbGVhc2UoKSk7XHJcblxyXG4gIHN5c0FjdGlvbnMuc3RvcmVJbml0aWFsaXplZCgpO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgc3RhcnRlcixcclxuICAgIGRpc3BhdGNoLFxyXG4gICAgZ2V0U3RhdGUsXHJcbiAgICByZWFkU2FmZSxcclxuICAgIHNlbGVjdCxcclxuICAgIGxvYWRNb2R1bGUsXHJcbiAgICB1bmxvYWRNb2R1bGUsXHJcbiAgICBnZXRNaWRkbGV3YXJlQVBJLFxyXG4gIH0gYXMgU3RvcmU8YW55PjtcclxufVxyXG4iXX0=