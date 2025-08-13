import { createLock } from './lock';
import { createInstruction } from './stack';
/**
 * Functional handler for managing actions within middleware.
 *
 * @param {MiddlewareConfig} config - Configuration object for the middleware.
 * @returns {Function} - A function to handle actions.
 */
export function createActionHandler(config) {
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
export const createStarter = () => {
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
export const starter = createStarter();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2xpYnJhcmllcy9hY3Rpb25zdGFjay9zdG9yZS9zcmMvbGliL3N0YXJ0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFVBQVUsRUFBYyxNQUFNLFFBQVEsQ0FBQztBQUNoRCxPQUFPLEVBQUUsaUJBQWlCLEVBQXFELE1BQU0sU0FBUyxDQUFDO0FBcUIvRjs7Ozs7R0FLRztBQUNILE1BQU0sVUFBVSxtQkFBbUIsQ0FBQyxNQUF3QjtJQUMxRCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO0lBQzNCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7SUFDakMsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQztJQUV6Qzs7Ozs7OztPQU9HO0lBQ0gsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLE1BQTRCLEVBQUUsSUFBYyxFQUFFLElBQWdCLEVBQWlCLEVBQUU7UUFDM0csTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFckIsTUFBTSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzVDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFZCxJQUFJO1lBQ0YsSUFBSSxPQUFPLE1BQU0sS0FBSyxVQUFVLEVBQUU7Z0JBQ2hDLE1BQU0sU0FBUyxHQUFHLFVBQVUsRUFBRSxDQUFDO2dCQUUvQixzREFBc0Q7Z0JBQ3RELE1BQU0sTUFBTSxDQUNWLEtBQUssRUFBRSxVQUFrQixFQUFFLEVBQUU7b0JBQzNCLE1BQU0sWUFBWSxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQ2xELENBQUMsRUFDRCxRQUFRLEVBQ1IsWUFBWSxFQUFFLENBQ2YsQ0FBQzthQUNIO2lCQUFNO2dCQUNMLHNDQUFzQztnQkFD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TG9jaywgU2ltcGxlTG9jayB9IGZyb20gJy4vbG9jayc7XHJcbmltcG9ydCB7IGNyZWF0ZUluc3RydWN0aW9uLCBjcmVhdGVFeGVjdXRpb25TdGFjaywgSW5zdHJ1Y3Rpb24sIEV4ZWN1dGlvblN0YWNrIH0gZnJvbSAnLi9zdGFjayc7XHJcbmltcG9ydCB7IEFjdGlvbiwgQXN5bmNBY3Rpb24gfSBmcm9tICcuL3R5cGVzJztcclxuXHJcbi8qKlxyXG4gKiBDb25maWd1cmF0aW9uIG9iamVjdCBmb3IgdGhlIG1pZGRsZXdhcmUuXHJcbiAqXHJcbiAqIEB0eXBlZGVmIHtPYmplY3R9IE1pZGRsZXdhcmVDb25maWdcclxuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZGlzcGF0Y2ggLSBGdW5jdGlvbiB0byBkaXNwYXRjaCBhY3Rpb25zLlxyXG4gKiBAcHJvcGVydHkge0Z1bmN0aW9ufSBnZXRTdGF0ZSAtIEZ1bmN0aW9uIHRvIGdldCB0aGUgY3VycmVudCBzdGF0ZS5cclxuICogQHByb3BlcnR5IHtGdW5jdGlvbn0gZGVwZW5kZW5jaWVzIC0gRnVuY3Rpb24gdG8gZ2V0IGRlcGVuZGVuY2llcy5cclxuICogQHByb3BlcnR5IHtTaW1wbGVMb2NrfSBsb2NrIC0gTG9jayBpbnN0YW5jZSB0byBtYW5hZ2UgYWN0aW9uIHByb2Nlc3NpbmcgY29uY3VycmVuY3kuXHJcbiAqIEBwcm9wZXJ0eSB7RXhlY3V0aW9uU3RhY2t9IHN0YWNrIC0gU3RhY2sgaW5zdGFuY2UgdG8gdHJhY2sgYWN0aW9uIGV4ZWN1dGlvbi5cclxuICovXHJcbmludGVyZmFjZSBNaWRkbGV3YXJlQ29uZmlnIHtcclxuICBkaXNwYXRjaDogRnVuY3Rpb247XHJcbiAgZ2V0U3RhdGU6IEZ1bmN0aW9uO1xyXG4gIGRlcGVuZGVuY2llczogRnVuY3Rpb247XHJcbiAgbG9jazogU2ltcGxlTG9jaztcclxuICBzdGFjazogRXhlY3V0aW9uU3RhY2s7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGdW5jdGlvbmFsIGhhbmRsZXIgZm9yIG1hbmFnaW5nIGFjdGlvbnMgd2l0aGluIG1pZGRsZXdhcmUuXHJcbiAqXHJcbiAqIEBwYXJhbSB7TWlkZGxld2FyZUNvbmZpZ30gY29uZmlnIC0gQ29uZmlndXJhdGlvbiBvYmplY3QgZm9yIHRoZSBtaWRkbGV3YXJlLlxyXG4gKiBAcmV0dXJucyB7RnVuY3Rpb259IC0gQSBmdW5jdGlvbiB0byBoYW5kbGUgYWN0aW9ucy5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVBY3Rpb25IYW5kbGVyKGNvbmZpZzogTWlkZGxld2FyZUNvbmZpZykge1xyXG4gIGNvbnN0IHN0YWNrID0gY29uZmlnLnN0YWNrO1xyXG4gIGNvbnN0IGdldFN0YXRlID0gY29uZmlnLmdldFN0YXRlO1xyXG4gIGNvbnN0IGRlcGVuZGVuY2llcyA9IGNvbmZpZy5kZXBlbmRlbmNpZXM7XHJcblxyXG4gIC8qKlxyXG4gICAqIEhhbmRsZXMgdGhlIGdpdmVuIGFjdGlvbiwgcHJvY2Vzc2luZyBpdCBlaXRoZXIgc3luY2hyb25vdXNseSBvciBhc3luY2hyb25vdXNseS5cclxuICAgKlxyXG4gICAqIEBwYXJhbSB7QWN0aW9uIHwgQXN5bmNBY3Rpb259IGFjdGlvbiAtIFRoZSBhY3Rpb24gdG8gYmUgcHJvY2Vzc2VkLlxyXG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IG5leHQgLSBUaGUgbmV4dCBtaWRkbGV3YXJlIGZ1bmN0aW9uIGluIHRoZSBjaGFpbi5cclxuICAgKiBAcGFyYW0ge1NpbXBsZUxvY2t9IGxvY2sgLSBUaGUgbG9jayBpbnN0YW5jZSB0byBtYW5hZ2UgY29uY3VycmVuY3kgZm9yIHRoaXMgYWN0aW9uLlxyXG4gICAqIEByZXR1cm5zIHtQcm9taXNlPHZvaWQ+IHwgdm9pZH0gLSBBIHByb21pc2UgaWYgdGhlIGFjdGlvbiBpcyBhc3luY2hyb25vdXMsIG90aGVyd2lzZSB2b2lkLlxyXG4gICAqL1xyXG4gIGNvbnN0IGhhbmRsZUFjdGlvbiA9IGFzeW5jIChhY3Rpb246IEFjdGlvbiB8IEFzeW5jQWN0aW9uLCBuZXh0OiBGdW5jdGlvbiwgbG9jazogU2ltcGxlTG9jayk6IFByb21pc2U8dm9pZD4gPT4ge1xyXG4gICAgYXdhaXQgbG9jay5hY3F1aXJlKCk7XHJcblxyXG4gICAgY29uc3Qgb3AgPSBjcmVhdGVJbnN0cnVjdGlvbi5hY3Rpb24oYWN0aW9uKTtcclxuICAgIHN0YWNrLmFkZChvcCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgaWYgKHR5cGVvZiBhY3Rpb24gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICBjb25zdCBpbm5lckxvY2sgPSBjcmVhdGVMb2NrKCk7XHJcblxyXG4gICAgICAgIC8vIFByb2Nlc3MgYXN5bmMgYWN0aW9ucyBhc3luY2hyb25vdXNseSBhbmQgdHJhY2sgdGhlbVxyXG4gICAgICAgIGF3YWl0IGFjdGlvbihcclxuICAgICAgICAgIGFzeW5jIChzeW5jQWN0aW9uOiBBY3Rpb24pID0+IHtcclxuICAgICAgICAgICAgYXdhaXQgaGFuZGxlQWN0aW9uKHN5bmNBY3Rpb24sIG5leHQsIGlubmVyTG9jayk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZ2V0U3RhdGUsXHJcbiAgICAgICAgICBkZXBlbmRlbmNpZXMoKVxyXG4gICAgICAgICk7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gUHJvY2VzcyByZWd1bGFyIHN5bmNocm9ub3VzIGFjdGlvbnNcclxuICAgICAgICBhd2FpdCBuZXh0KGFjdGlvbik7XHJcbiAgICAgIH1cclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgIHN0YWNrLnJlbW92ZShvcCk7XHJcbiAgICAgIGxvY2sucmVsZWFzZSgpO1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHJldHVybiBoYW5kbGVBY3Rpb247XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBGdW5jdGlvbiB0byBjcmVhdGUgdGhlIHN0YXJ0ZXIgbWlkZGxld2FyZSBmYWN0b3J5LlxyXG4gKiBUaGlzIGZhY3RvcnkgZnVuY3Rpb24gcmV0dXJucyBhIG1pZGRsZXdhcmUgY3JlYXRvciB0aGF0IHRha2VzIHN0cmF0ZWd5IGluZm9ybWF0aW9uIGFzIGFyZ3VtZW50cyBhbmQgcmV0dXJucyB0aGUgYWN0dWFsIG1pZGRsZXdhcmUgZnVuY3Rpb24uXHJcbiAqXHJcbiAqIEByZXR1cm5zIEZ1bmN0aW9uIC0gVGhlIG1pZGRsZXdhcmUgY3JlYXRvciBmdW5jdGlvbi5cclxuICovXHJcbmV4cG9ydCBjb25zdCBjcmVhdGVTdGFydGVyID0gKCkgPT4ge1xyXG4gIC8qKlxyXG4gICAqIE1pZGRsZXdhcmUgZnVuY3Rpb24gZm9yIGhhbmRsaW5nIGFjdGlvbnMgZXhjbHVzaXZlbHkuXHJcbiAgICpcclxuICAgKiBUaGlzIG1pZGRsZXdhcmUgZW5zdXJlcyBvbmx5IG9uZSBhY3Rpb24gaXMgcHJvY2Vzc2VkIGF0IGEgdGltZSBhbmQgcXVldWVzIG5ldyBhY3Rpb25zIHVudGlsIHRoZSBjdXJyZW50IG9uZSBmaW5pc2hlcy5cclxuICAgKlxyXG4gICAqIEBwYXJhbSBhcmdzIC0gQXJndW1lbnRzIHByb3ZpZGVkIGJ5IHRoZSBtaWRkbGV3YXJlIHBpcGVsaW5lLlxyXG4gICAqICAgKiBkaXNwYXRjaCAtIEZ1bmN0aW9uIHRvIGRpc3BhdGNoIGFjdGlvbnMuXHJcbiAgICogICAqIGdldFN0YXRlIC0gRnVuY3Rpb24gdG8gZ2V0IHRoZSBjdXJyZW50IHN0YXRlLlxyXG4gICAqICAgKiBkZXBlbmRlbmNpZXMgLSBGdW5jdGlvbiB0byBnZXQgZGVwZW5kZW5jaWVzLlxyXG4gICAqIEBwYXJhbSBuZXh0IC0gRnVuY3Rpb24gdG8gY2FsbCB0aGUgbmV4dCBtaWRkbGV3YXJlIGluIHRoZSBjaGFpbi5cclxuICAgKiBAcmV0dXJucyBGdW5jdGlvbiAtIFRoZSBhY3R1YWwgbWlkZGxld2FyZSBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgYWN0aW9ucy5cclxuICAgKi9cclxuICBjb25zdCBleGNsdXNpdmUgPSAoY29uZmlnOiBNaWRkbGV3YXJlQ29uZmlnKSA9PiAobmV4dDogRnVuY3Rpb24pID0+IGFzeW5jIChhY3Rpb246IEFjdGlvbiB8IEFzeW5jQWN0aW9uKSA9PiB7XHJcbiAgICBjb25zdCBoYW5kbGVyID0gY3JlYXRlQWN0aW9uSGFuZGxlcihjb25maWcpO1xyXG4gICAgY29uc3QgbG9ja0luc3RhbmNlID0gY29uZmlnLmxvY2s7XHJcbiAgICBhd2FpdCBoYW5kbGVyKGFjdGlvbiwgbmV4dCwgbG9ja0luc3RhbmNlKTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBNaWRkbGV3YXJlIGZ1bmN0aW9uIGZvciBoYW5kbGluZyBhY3Rpb25zIGNvbmN1cnJlbnRseS5cclxuICAgKlxyXG4gICAqIFRoaXMgbWlkZGxld2FyZSBhbGxvd3MgbXVsdGlwbGUgYXN5bmMgYWN0aW9ucyB0byBiZSBwcm9jZXNzZWQgc2ltdWx0YW5lb3VzbHkuXHJcbiAgICpcclxuICAgKiBAcGFyYW0gYXJncyAtIEFyZ3VtZW50cyBwcm92aWRlZCBieSB0aGUgbWlkZGxld2FyZSBwaXBlbGluZSAoc2FtZSBhcyBleGNsdXNpdmUpLlxyXG4gICAqIEBwYXJhbSBuZXh0IC0gRnVuY3Rpb24gdG8gY2FsbCB0aGUgbmV4dCBtaWRkbGV3YXJlIGluIHRoZSBjaGFpbi5cclxuICAgKiBAcmV0dXJucyBGdW5jdGlvbiAtIFRoZSBhY3R1YWwgbWlkZGxld2FyZSBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgYWN0aW9ucy5cclxuICAgKi9cclxuICBjb25zdCBjb25jdXJyZW50ID0gKGNvbmZpZzogTWlkZGxld2FyZUNvbmZpZykgPT4gKG5leHQ6IEZ1bmN0aW9uKSA9PiBhc3luYyAoYWN0aW9uOiBBY3Rpb24gfCBBc3luY0FjdGlvbikgPT4ge1xyXG4gICAgbGV0IGFzeW5jQWN0aW9uczogUHJvbWlzZTx2b2lkPltdID0gW107XHJcbiAgICBjb25zdCBoYW5kbGVyID0gY3JlYXRlQWN0aW9uSGFuZGxlcihjb25maWcpO1xyXG4gICAgY29uc3QgbG9ja0luc3RhbmNlID0gY29uZmlnLmxvY2s7XHJcblxyXG4gICAgY29uc3QgYXN5bmNGdW5jID0gaGFuZGxlcihhY3Rpb24sIG5leHQsIGxvY2tJbnN0YW5jZSk7XHJcbiAgICBpZiAoYXN5bmNGdW5jKSB7XHJcbiAgICAgIGFzeW5jQWN0aW9ucy5wdXNoKGFzeW5jRnVuYyk7XHJcbiAgICAgIGFzeW5jRnVuYy5maW5hbGx5KCgpID0+IHtcclxuICAgICAgICBhc3luY0FjdGlvbnMgPSBhc3luY0FjdGlvbnMuZmlsdGVyKGZ1bmMgPT4gZnVuYyAhPT0gYXN5bmNGdW5jKTtcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfTtcclxuXHJcbiAgLy8gTWFwIHN0cmF0ZWd5IG5hbWVzIHRvIGZ1bmN0aW9uc1xyXG4gIGNvbnN0IHN0cmF0ZWdpZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAnZXhjbHVzaXZlJzogZXhjbHVzaXZlLFxyXG4gICAgJ2NvbmN1cnJlbnQnOiBjb25jdXJyZW50XHJcbiAgfTtcclxuXHJcbiAgY29uc3QgZGVmYXVsdFN0cmF0ZWd5ID0gJ2NvbmN1cnJlbnQnO1xyXG5cclxuICAvLyBDcmVhdGUgYSBtZXRob2QgdG8gc2VsZWN0IHRoZSBzdHJhdGVneVxyXG4gIGNvbnN0IHNlbGVjdFN0cmF0ZWd5ID0gKHsgZGlzcGF0Y2gsIGdldFN0YXRlLCBkZXBlbmRlbmNpZXMsIHN0cmF0ZWd5LCBsb2NrLCBzdGFjayB9OiBhbnkpID0+IChuZXh0OiBGdW5jdGlvbikgPT4gYXN5bmMgKGFjdGlvbjogQWN0aW9uKSA9PiB7XHJcbiAgICBsZXQgc3RyYXRlZ3lGdW5jID0gc3RyYXRlZ2llc1tzdHJhdGVneSgpXTtcclxuICAgIGlmICghc3RyYXRlZ3lGdW5jKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihgVW5rbm93biBzdHJhdGVneTogJHtzdHJhdGVneX0sIGRlZmF1bHQgaXMgdXNlZDogJHtkZWZhdWx0U3RyYXRlZ3l9YCk7XHJcbiAgICAgIHN0cmF0ZWd5RnVuYyA9IHN0cmF0ZWdpZXNbZGVmYXVsdFN0cmF0ZWd5XTtcclxuICAgIH1cclxuICAgIHJldHVybiBzdHJhdGVneUZ1bmMoeyBkaXNwYXRjaCwgZ2V0U3RhdGUsIGRlcGVuZGVuY2llcywgbG9jaywgc3RhY2sgfSkobmV4dCkoYWN0aW9uKTtcclxuICB9O1xyXG5cclxuICBzZWxlY3RTdHJhdGVneS5zaWduYXR1cmUgPSAnaS5wLjUuai43LjAuMi4xLjguYic7XHJcbiAgcmV0dXJuIHNlbGVjdFN0cmF0ZWd5O1xyXG59O1xyXG5cclxuLy8gQ3JlYXRlIHRoZSBzdGFydGVyIG1pZGRsZXdhcmVcclxuZXhwb3J0IGNvbnN0IHN0YXJ0ZXIgPSBjcmVhdGVTdGFydGVyKCk7XHJcbiJdfQ==