import { isAction, kindOf } from './types';
export { createAction as action };
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
export function createAction(typeOrThunk, payloadCreator) {
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
export function bindActionCreator(actionCreator, dispatch) {
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
export function bindActionCreators(actionCreators, dispatch) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2xpYnJhcmllcy9hY3Rpb25zdGFjay9zdG9yZS9zcmMvbGliL2FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUF5QixRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sU0FBUyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxZQUFZLElBQUksTUFBTSxFQUFFLENBQUM7QUFFbEM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUNHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBQyxXQUE4QixFQUFFLGNBQXlCO0lBQ3BGLFNBQVMsYUFBYSxDQUFDLEdBQUcsSUFBVztRQUNuQyxJQUFJLE1BQU0sR0FBVztZQUNuQixJQUFJLEVBQUUsV0FBcUI7U0FDNUIsQ0FBQztRQUVGLElBQUksT0FBTyxXQUFXLEtBQUssVUFBVSxFQUFFO1lBQ3JDLE9BQU8sS0FBSyxFQUFFLFFBQWtCLEVBQUUsUUFBa0IsRUFBRSxZQUFpQixFQUFFLEVBQUU7Z0JBQ3pFLElBQUk7b0JBQ0YsT0FBTyxNQUFNLFdBQVcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDLENBQUM7aUJBQ3JFO2dCQUFDLE9BQU8sS0FBVSxFQUFFO29CQUNuQixPQUFPLENBQUMsSUFBSSxDQUFDLG9CQUFvQixLQUFLLENBQUMsT0FBTyx3TEFBd0wsQ0FBQyxDQUFDO2lCQUN6TztZQUNILENBQUMsQ0FBQTtTQUNGO2FBQU0sSUFBSSxjQUFjLEVBQUU7WUFDekIsSUFBSSxNQUFNLEdBQUcsY0FBYyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDckMsSUFBSSxNQUFNLEtBQUssU0FBUyxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUU7Z0JBQzNDLE9BQU8sQ0FBQyxJQUFJLENBQUMsOEZBQThGLENBQUMsQ0FBQzthQUM5RztZQUVELDJDQUEyQztZQUMzQyxJQUFJLE1BQU0sS0FBSyxTQUFTLElBQUksTUFBTSxLQUFLLElBQUksRUFBRTtnQkFDM0MsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7Z0JBQ3hCLE1BQU0sSUFBSSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDaEQsT0FBTyxJQUFJLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO2FBQ3BEO1NBQ0Y7YUFDSTtZQUNILDJDQUEyQztZQUMzQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLEVBQUU7Z0JBQ3pCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQzFCO1NBQ0Y7UUFFRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQsYUFBYSxDQUFDLFFBQVEsR0FBRyxHQUFHLEVBQUUsQ0FBQyxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQ2hELGFBQWEsQ0FBQyxJQUFJLEdBQUcsT0FBTyxXQUFXLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQztJQUNuRixhQUFhLENBQUMsS0FBSyxHQUFHLENBQUMsTUFBVyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxXQUFXLENBQUM7SUFFdkYsT0FBTyxhQUFhLENBQUM7QUFDdkIsQ0FBQztBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsYUFBdUIsRUFBRSxRQUFrQjtJQUMzRSxPQUFPLFVBQW9CLEdBQUcsSUFBVztRQUN2QyxPQUFPLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ25ELENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBcUJHO0FBQ0gsTUFBTSxVQUFVLGtCQUFrQixDQUFDLGNBQW1ELEVBQUUsUUFBa0I7SUFDeEcsSUFBSSxPQUFPLGNBQWMsS0FBSyxRQUFRLElBQUksY0FBYyxLQUFLLElBQUksRUFBRTtRQUNqRSxPQUFPLENBQUMsSUFBSSxDQUFDLCtFQUErRSxNQUFNLENBQUMsY0FBYyxDQUFDLDZGQUE2RixDQUFDLENBQUM7UUFDak4sT0FBTyxTQUFTLENBQUM7S0FDbEI7SUFFRCxjQUFjLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxDQUFDO0lBQ3ZDLElBQUksT0FBTyxjQUFjLEtBQUssVUFBVSxFQUFFO1FBQ3hDLE9BQU8saUJBQWlCLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0tBQ3BEO0lBRUQsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUN6QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBRTVCLElBQUksT0FBTyxLQUFLLENBQUMsRUFBRTtRQUNqQixNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFOUMsSUFBSSxPQUFPLGFBQWEsS0FBSyxVQUFVLEVBQUU7WUFDdkMsT0FBTyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsUUFBUSxDQUFDLENBQUM7U0FDbkQ7S0FDRjtJQUVELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDaEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sYUFBYSxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUUxQyxJQUFJLE9BQU8sYUFBYSxLQUFLLFVBQVUsRUFBRTtZQUN2QyxjQUFjLENBQUMsR0FBRyxDQUFDLEdBQUcsaUJBQWlCLENBQUMsYUFBYSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1NBQ2xFO0tBQ0Y7SUFFRCxPQUFPLGNBQWMsQ0FBQztBQUN4QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQWN0aW9uLCBBY3Rpb25DcmVhdG9yLCBpc0FjdGlvbiwga2luZE9mIH0gZnJvbSAnLi90eXBlcyc7XHJcblxyXG5leHBvcnQgeyBjcmVhdGVBY3Rpb24gYXMgYWN0aW9uIH07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhbiBhY3Rpb24gY3JlYXRvciBmdW5jdGlvbiBmb3IgQWN0aW9uc3RhY2sgYWN0aW9ucywgc3VwcG9ydGluZyBib3RoIHN5bmNocm9ub3VzIGFuZCBhc3luY2hyb25vdXMgdXNlIGNhc2VzLlxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ3xGdW5jdGlvbn0gdHlwZU9yVGh1bmsgICAtIEEgc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgYWN0aW9uIHR5cGUgZm9yIHN5bmNocm9ub3VzIGFjdGlvbnMsXHJcbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3IgYSBmdW5jdGlvbiByZXByZXNlbnRpbmcgYSB0aHVuayBmb3IgYXN5bmNocm9ub3VzIGFjdGlvbnMuXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtwYXlsb2FkQ3JlYXRvcl0gICAgIC0gKE9wdGlvbmFsKSBBIGZ1bmN0aW9uIHRvIGdlbmVyYXRlIHRoZSBwYXlsb2FkIGZvciB0aGUgYWN0aW9uLlxyXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259ICAgICAgICAgICAgICAgICAgICAtIEFuIGFjdGlvbiBjcmVhdG9yIGZ1bmN0aW9uIHRoYXQgZ2VuZXJhdGVzIGFjdGlvbiBvYmplY3RzIG9yIGRpc3BhdGNoYWJsZSB0aHVua3MuXHJcbiAqXHJcbiAqIFRoaXMgZnVuY3Rpb24gYWxsb3dzIHRoZSBjcmVhdGlvbiBvZiBhY3Rpb24gY3JlYXRvcnMgZm9yIGJvdGggc3luY2hyb25vdXMgYW5kIGFzeW5jaHJvbm91cyB3b3JrZmxvd3M6XHJcbiAqXHJcbiAqIC0gKipTeW5jaHJvbm91cyBBY3Rpb25zKio6IFdoZW4gYHR5cGVPclRodW5rYCBpcyBhIHN0cmluZywgdGhlIHJldHVybmVkIGFjdGlvbiBjcmVhdG9yIGdlbmVyYXRlcyBvYmplY3RzXHJcbiAqICAgd2l0aCBhIGB0eXBlYCBwcm9wZXJ0eSBhbmQgb3B0aW9uYWxseSBhIGBwYXlsb2FkYCwgYG1ldGFgLCBhbmQgYGVycm9yYCBwcm9wZXJ0eS5cclxuICogICAtIElmIGEgYHBheWxvYWRDcmVhdG9yYCBpcyBwcm92aWRlZCwgaXQgaXMgdXNlZCB0byBnZW5lcmF0ZSB0aGUgcGF5bG9hZC5cclxuICogICAtIElmIG5vIGBwYXlsb2FkQ3JlYXRvcmAgaXMgcHJvdmlkZWQsIHRoZSBmaXJzdCBhcmd1bWVudCBwYXNzZWQgdG8gdGhlIGFjdGlvbiBjcmVhdG9yIGlzIHVzZWQgYXMgdGhlIHBheWxvYWQuXHJcbiAqXHJcbiAqIC0gKipBc3luY2hyb25vdXMgQWN0aW9ucyAoVGh1bmtzKSoqOiBXaGVuIGB0eXBlT3JUaHVua2AgaXMgYSBmdW5jdGlvbiwgdGhlIHJldHVybmVkIGFjdGlvbiBjcmVhdG9yIGNyZWF0ZXNcclxuICogICBhIGRpc3BhdGNoYWJsZSB0aHVuay4gVGhlIHRodW5rIHJlY2VpdmVzIGBkaXNwYXRjaGAsIGBnZXRTdGF0ZWAsIGFuZCBvcHRpb25hbCBgZGVwZW5kZW5jaWVzYCBhcyBhcmd1bWVudHMsXHJcbiAqICAgYWxsb3dpbmcgZm9yIGFzeW5jaHJvbm91cyBsb2dpYy5cclxuICogICAtIEVycm9ycyBpbiB0aGUgdGh1bmsgYXJlIGNhdWdodCBhbmQgbG9nZ2VkIHdpdGggYSB3YXJuaW5nLlxyXG4gKlxyXG4gKiAqKkV4YW1wbGUgVXNhZ2U6KipcclxuICpcclxuICogU3luY2hyb25vdXM6XHJcbiAqIGBgYHR5cGVzY3JpcHRcclxuICogY29uc3QgaW5jcmVtZW50ID0gY3JlYXRlQWN0aW9uKCdJTkNSRU1FTlQnLCAoYW1vdW50KSA9PiAoeyBhbW91bnQgfSkpO1xyXG4gKiBkaXNwYXRjaChpbmNyZW1lbnQoMSkpO1xyXG4gKiAvLyBPdXRwdXQ6IHsgdHlwZTogJ0lOQ1JFTUVOVCcsIHBheWxvYWQ6IHsgYW1vdW50OiAxIH0gfVxyXG4gKiBgYGBcclxuICpcclxuICogQXN5bmNocm9ub3VzOlxyXG4gKiBgYGB0eXBlc2NyaXB0XHJcbiAqIGNvbnN0IGZldGNoRGF0YSA9IGNyZWF0ZUFjdGlvbihhc3luYyAoZGlzcGF0Y2gsIGdldFN0YXRlKSA9PiB7XHJcbiAqICAgY29uc3QgZGF0YSA9IGF3YWl0IGZldGNoKCcvYXBpL2RhdGEnKTtcclxuICogICBkaXNwYXRjaCh7IHR5cGU6ICdEQVRBX0ZFVENIRUQnLCBwYXlsb2FkOiBhd2FpdCBkYXRhLmpzb24oKSB9KTtcclxuICogfSk7XHJcbiAqIGRpc3BhdGNoKGZldGNoRGF0YSk7XHJcbiAqIGBgYFxyXG4gKlxyXG4gKiBXYXJuaW5nczpcclxuICogLSBJZiBgcGF5bG9hZENyZWF0b3JgIHJldHVybnMgYHVuZGVmaW5lZGAgb3IgYG51bGxgLCBhIHdhcm5pbmcgaXMgaXNzdWVkLlxyXG4gKiAtIEZvciB0aHVua3MsIGFuIGVycm9yIGluIGV4ZWN1dGlvbiBsb2dzIGEgd2FybmluZy5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBY3Rpb24odHlwZU9yVGh1bms6IHN0cmluZyB8IEZ1bmN0aW9uLCBwYXlsb2FkQ3JlYXRvcj86IEZ1bmN0aW9uKTogQWN0aW9uQ3JlYXRvciB7XHJcbiAgZnVuY3Rpb24gYWN0aW9uQ3JlYXRvciguLi5hcmdzOiBhbnlbXSkge1xyXG4gICAgbGV0IGFjdGlvbjogQWN0aW9uID0ge1xyXG4gICAgICB0eXBlOiB0eXBlT3JUaHVuayBhcyBzdHJpbmcsXHJcbiAgICB9O1xyXG5cclxuICAgIGlmICh0eXBlb2YgdHlwZU9yVGh1bmsgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgcmV0dXJuIGFzeW5jIChkaXNwYXRjaDogRnVuY3Rpb24sIGdldFN0YXRlOiBGdW5jdGlvbiwgZGVwZW5kZW5jaWVzOiBhbnkpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHR5cGVPclRodW5rKC4uLmFyZ3MpKGRpc3BhdGNoLCBnZXRTdGF0ZSwgZGVwZW5kZW5jaWVzKTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oYEVycm9yIGluIGFjdGlvbjogJHtlcnJvci5tZXNzYWdlfS4gSWYgZGVwZW5kZW5jaWVzIG9iamVjdCBwcm92aWRlZCBkb2VzIG5vdCBjb250YWluIHJlcXVpcmVkIHByb3BlcnR5LCBpdCBpcyBwb3NzaWJsZSB0aGF0IHRoZSBzbGljZSBuYW1lIG9idGFpbmVkIGZyb20gdGhlIHRhZyBuYW1lIGRvZXMgbm90IG1hdGNoIHRoZSBvbmUgZGVjbGFyZWQgaW4gdGhlIHNsaWNlIGZpbGUuYCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGVsc2UgaWYgKHBheWxvYWRDcmVhdG9yKSB7XHJcbiAgICAgIGxldCByZXN1bHQgPSBwYXlsb2FkQ3JlYXRvciguLi5hcmdzKTtcclxuICAgICAgaWYgKHJlc3VsdCA9PT0gdW5kZWZpbmVkIHx8IHJlc3VsdCA9PT0gbnVsbCkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybigncGF5bG9hZENyZWF0b3IgZGlkIG5vdCByZXR1cm4gYW4gb2JqZWN0LiBEaWQgeW91IGZvcmdldCB0byBpbml0aWFsaXplIGFuIGFjdGlvbiB3aXRoIHBhcmFtcz8nKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRG8gbm90IHJldHVybiBwYXlsb2FkIGlmIGl0IGlzIHVuZGVmaW5lZFxyXG4gICAgICBpZiAocmVzdWx0ICE9PSB1bmRlZmluZWQgJiYgcmVzdWx0ICE9PSBudWxsKSB7XHJcbiAgICAgICAgYWN0aW9uLnBheWxvYWQgPSByZXN1bHQ7XHJcbiAgICAgICAgJ21ldGEnIGluIHJlc3VsdCAmJiAoYWN0aW9uLm1ldGEgPSByZXN1bHQubWV0YSk7XHJcbiAgICAgICAgJ2Vycm9yJyBpbiByZXN1bHQgJiYgKGFjdGlvbi5lcnJvciA9IHJlc3VsdC5lcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAvLyBEbyBub3QgcmV0dXJuIHBheWxvYWQgaWYgaXQgaXMgdW5kZWZpbmVkXHJcbiAgICAgIGlmIChhcmdzWzBdICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBhY3Rpb24ucGF5bG9hZCA9IGFyZ3NbMF07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gYWN0aW9uO1xyXG4gIH1cclxuXHJcbiAgYWN0aW9uQ3JlYXRvci50b1N0cmluZyA9ICgpID0+IGAke3R5cGVPclRodW5rfWA7XHJcbiAgYWN0aW9uQ3JlYXRvci50eXBlID0gdHlwZW9mIHR5cGVPclRodW5rID09PSAnc3RyaW5nJyA/IHR5cGVPclRodW5rIDogJ2FzeW5jQWN0aW9uJztcclxuICBhY3Rpb25DcmVhdG9yLm1hdGNoID0gKGFjdGlvbjogYW55KSA9PiBpc0FjdGlvbihhY3Rpb24pICYmIGFjdGlvbi50eXBlID09PSB0eXBlT3JUaHVuaztcclxuXHJcbiAgcmV0dXJuIGFjdGlvbkNyZWF0b3I7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCaW5kcyBhbiBhY3Rpb24gY3JlYXRvciB0byB0aGUgZGlzcGF0Y2ggZnVuY3Rpb24uXHJcbiAqXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGFjdGlvbkNyZWF0b3IgICAtIFRoZSBhY3Rpb24gY3JlYXRvciBmdW5jdGlvbiB0byBiZSBib3VuZC5cclxuICogQHBhcmFtIHtGdW5jdGlvbn0gZGlzcGF0Y2ggICAgICAgIC0gVGhlIGRpc3BhdGNoIGZ1bmN0aW9uLlxyXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259ICAgICAgICAgICAgICAgLSBBIG5ldyBmdW5jdGlvbiB0aGF0IGRpc3BhdGNoZXMgdGhlIGFjdGlvbiBjcmVhdGVkIGJ5IHRoZSBwcm92aWRlZCBhY3Rpb24gY3JlYXRvci5cclxuICpcclxuICogVGhpcyBmdW5jdGlvbiB0YWtlcyBhbiBhY3Rpb24gY3JlYXRvciBmdW5jdGlvbiBhbmQgdGhlIGRpc3BhdGNoIGZ1bmN0aW9uLlxyXG4gKiBJdCByZXR1cm5zIGEgbmV3IGZ1bmN0aW9uIHRoYXQsIHdoZW4gY2FsbGVkLCB3aWxsIGRpc3BhdGNoIHRoZSBhY3Rpb24gY3JlYXRlZCBieSB0aGUgcHJvdmlkZWQgYWN0aW9uIGNyZWF0b3IuXHJcbiAqIFRoZSBuZXcgZnVuY3Rpb24gY2FuIGJlIGNhbGxlZCB3aXRoIGFueSBhcmd1bWVudHMsIHdoaWNoIHdpbGwgYmUgcGFzc2VkIG9uIHRvIHRoZSBvcmlnaW5hbCBhY3Rpb24gY3JlYXRvciBmdW5jdGlvbi5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBiaW5kQWN0aW9uQ3JlYXRvcihhY3Rpb25DcmVhdG9yOiBGdW5jdGlvbiwgZGlzcGF0Y2g6IEZ1bmN0aW9uKTogRnVuY3Rpb24ge1xyXG4gIHJldHVybiBmdW5jdGlvbih0aGlzOiBhbnksIC4uLmFyZ3M6IGFueVtdKTogYW55IHtcclxuICAgIHJldHVybiBkaXNwYXRjaChhY3Rpb25DcmVhdG9yLmFwcGx5KHRoaXMsIGFyZ3MpKTtcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogQmluZHMgb25lIG9yIG1vcmUgYWN0aW9uIGNyZWF0b3JzIHRvIGEgZGlzcGF0Y2ggZnVuY3Rpb24sIG1ha2luZyBpdCBlYXNpZXIgdG8gY2FsbCBhY3Rpb25zIGRpcmVjdGx5LlxyXG4gKlxyXG4gKiBAcGFyYW0ge09iamVjdHxGdW5jdGlvbn0gYWN0aW9uQ3JlYXRvcnMgLSBBbiBvYmplY3QgY29udGFpbmluZyBtdWx0aXBsZSBhY3Rpb24gY3JlYXRvciBmdW5jdGlvbnNcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3IgYSBzaW5nbGUgYWN0aW9uIGNyZWF0b3IgZnVuY3Rpb24uXHJcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGRpc3BhdGNoICAgICAgICAgICAgICAtIFRoZSBkaXNwYXRjaCBmdW5jdGlvbiB0byBiaW5kIHRoZSBhY3Rpb24gY3JlYXRvcnMgdG8uXHJcbiAqIEByZXR1cm5zIHtPYmplY3R8RnVuY3Rpb259ICAgICAgICAgICAgICAtIEFuIG9iamVjdCB3aXRoIHRoZSBib3VuZCBhY3Rpb24gY3JlYXRvciBmdW5jdGlvbnNcclxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3IgYSBzaW5nbGUgYm91bmQgYWN0aW9uIGNyZWF0b3IgZnVuY3Rpb24uXHJcbiAqXHJcbiAqIFRoaXMgZnVuY3Rpb24gYWNjZXB0cyBlaXRoZXI6XHJcbiAqIC0gQW4gb2JqZWN0IGNvbnRhaW5pbmcgbXVsdGlwbGUgYWN0aW9uIGNyZWF0b3IgZnVuY3Rpb25zOlxyXG4gKiAgIEVhY2ggZnVuY3Rpb24gaW4gdGhlIG9iamVjdCB3aWxsIGJlIHdyYXBwZWQgYnkgYGJpbmRBY3Rpb25DcmVhdG9yYCB0byBhdXRvbWF0aWNhbGx5IGRpc3BhdGNoXHJcbiAqICAgYWN0aW9ucyB3aGVuIGNhbGxlZCwgYW5kIHRoZSByZXN1bHRpbmcgb2JqZWN0IHdpbGwgYmUgcmV0dXJuZWQuXHJcbiAqIC0gQSBzaW5nbGUgYWN0aW9uIGNyZWF0b3IgZnVuY3Rpb246XHJcbiAqICAgVGhlIGZ1bmN0aW9uIHdpbGwgYmUgd3JhcHBlZCBhbmQgcmV0dXJuZWQgYXMgYSBib3VuZCBhY3Rpb24gY3JlYXRvci5cclxuICpcclxuICogSXQgYWxzbyBwZXJmb3JtcyB0eXBlLWNoZWNraW5nIHRvIGVuc3VyZSB0aGUgcHJvdmlkZWQgYGFjdGlvbkNyZWF0b3JzYCBwYXJhbWV0ZXIgaXMgZWl0aGVyXHJcbiAqIGFuIG9iamVjdCBvciBhIGZ1bmN0aW9uLCBpc3N1aW5nIGEgd2FybmluZyBpZiB0aGUgaW5wdXQgdHlwZSBpcyBpbmNvcnJlY3QuXHJcbiAqXHJcbiAqIFRoaXMgdXRpbGl0eSBzaW1wbGlmaWVzIHRoZSBwcm9jZXNzIG9mIGJpbmRpbmcgYWxsIGFjdGlvbiBjcmVhdG9ycyBmcm9tIGEgbW9kdWxlIG9yIGZpbGVcclxuICogdG8gdGhlIGRpc3BhdGNoIGZ1bmN0aW9uLCByZXN1bHRpbmcgaW4gY2xlYW5lciBhbmQgbW9yZSBjb25jaXNlIGNvbXBvbmVudCBjb2RlLlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGJpbmRBY3Rpb25DcmVhdG9ycyhhY3Rpb25DcmVhdG9yczogUmVjb3JkPHN0cmluZywgRnVuY3Rpb24+IHwgRnVuY3Rpb24sIGRpc3BhdGNoOiBGdW5jdGlvbik6IGFueSB7XHJcbiAgaWYgKHR5cGVvZiBhY3Rpb25DcmVhdG9ycyAhPT0gXCJvYmplY3RcIiB8fCBhY3Rpb25DcmVhdG9ycyA9PT0gbnVsbCkge1xyXG4gICAgY29uc29sZS53YXJuKGBiaW5kQWN0aW9uQ3JlYXRvcnMgZXhwZWN0ZWQgYW4gb2JqZWN0IG9yIGEgZnVuY3Rpb24sIGJ1dCBpbnN0ZWFkIHJlY2VpdmVkOiAnJHtraW5kT2YoYWN0aW9uQ3JlYXRvcnMpfScuIERpZCB5b3Ugd3JpdGUgXCJpbXBvcnQgQWN0aW9uQ3JlYXRvcnMgZnJvbVwiIGluc3RlYWQgb2YgXCJpbXBvcnQgKiBhcyBBY3Rpb25DcmVhdG9ycyBmcm9tXCI/YCk7XHJcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIH1cclxuXHJcbiAgYWN0aW9uQ3JlYXRvcnMgPSB7IC4uLmFjdGlvbkNyZWF0b3JzIH07XHJcbiAgaWYgKHR5cGVvZiBhY3Rpb25DcmVhdG9ycyA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICByZXR1cm4gYmluZEFjdGlvbkNyZWF0b3IoYWN0aW9uQ3JlYXRvcnMsIGRpc3BhdGNoKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IGtleXMgPSBPYmplY3Qua2V5cyhhY3Rpb25DcmVhdG9ycyk7XHJcbiAgY29uc3QgbnVtS2V5cyA9IGtleXMubGVuZ3RoO1xyXG5cclxuICBpZiAobnVtS2V5cyA9PT0gMSkge1xyXG4gICAgY29uc3QgYWN0aW9uQ3JlYXRvciA9IGFjdGlvbkNyZWF0b3JzW2tleXNbMF1dO1xyXG5cclxuICAgIGlmICh0eXBlb2YgYWN0aW9uQ3JlYXRvciA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgIHJldHVybiBiaW5kQWN0aW9uQ3JlYXRvcihhY3Rpb25DcmVhdG9yLCBkaXNwYXRjaCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBmb3IgKGxldCBpID0gMDsgaSA8IG51bUtleXM7IGkrKykge1xyXG4gICAgY29uc3Qga2V5ID0ga2V5c1tpXTtcclxuICAgIGNvbnN0IGFjdGlvbkNyZWF0b3IgPSBhY3Rpb25DcmVhdG9yc1trZXldO1xyXG5cclxuICAgIGlmICh0eXBlb2YgYWN0aW9uQ3JlYXRvciA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgIGFjdGlvbkNyZWF0b3JzW2tleV0gPSBiaW5kQWN0aW9uQ3JlYXRvcihhY3Rpb25DcmVhdG9yLCBkaXNwYXRjaCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4gYWN0aW9uQ3JlYXRvcnM7XHJcbn1cclxuIl19