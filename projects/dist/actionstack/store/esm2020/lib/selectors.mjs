export { createFeatureSelector as featureSelector, createSelector as selector, createSelectorAsync as selectorAsync };
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
export function createFeatureSelector(slice) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3JzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vbGlicmFyaWVzL2FjdGlvbnN0YWNrL3N0b3JlL3NyYy9saWIvc2VsZWN0b3JzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUVBLE9BQU8sRUFDTCxxQkFBcUIsSUFBSSxlQUFlLEVBQ3hDLGNBQWMsSUFBSSxRQUFRLEVBQzFCLG1CQUFtQixJQUFJLGFBQWEsRUFDckMsQ0FBQztBQWlCRjs7Ozs7Ozs7O0dBU0c7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBSW5DLEtBQVE7SUFRUixPQUFPLENBQUMsS0FBUSxFQUFFLEVBQUU7UUFDbEIsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO1lBQ3hCLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1NBQzNEO2FBQU07WUFDTCxPQUFPLEtBQUssQ0FBQyxLQUFnQixDQUFDLENBQUM7U0FDaEM7SUFDSCxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxTQUFTLGNBQWMsQ0FDckIsZUFBNEQsRUFDNUQsU0FBZ0QsRUFDaEQsbUJBQXdDO0lBR3hDLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDakQsTUFBTSxVQUFVLEdBQUcsT0FBTyxtQkFBbUIsS0FBSyxVQUFVLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7SUFFL0YsT0FBTyxDQUFDLEtBQW1CLEVBQUUsZUFBcUIsRUFBRSxFQUFFO1FBQ3BELE9BQU8sQ0FBQyxLQUFVLEVBQWlCLEVBQUU7WUFDbkMsTUFBTSxVQUFVLEdBQUcsZUFBZSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMs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QVUsRUFBRTtnQkFDbkIsT0FBTyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3JELE9BQU8sU0FBUyxDQUFDO2FBQ2xCO1FBQ0gsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFByb2plY3Rpb25GdW5jdGlvbiwgU2VsZWN0b3JGdW5jdGlvbiB9IGZyb20gJy4vdHlwZXMnO1xyXG5cclxuZXhwb3J0IHtcclxuICBjcmVhdGVGZWF0dXJlU2VsZWN0b3IgYXMgZmVhdHVyZVNlbGVjdG9yLFxyXG4gIGNyZWF0ZVNlbGVjdG9yIGFzIHNlbGVjdG9yLFxyXG4gIGNyZWF0ZVNlbGVjdG9yQXN5bmMgYXMgc2VsZWN0b3JBc3luY1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlY3Vyc2l2ZWx5IHJlc29sdmVzIHRoZSB0eXBlIG9mIGEgZGVlcGx5IG5lc3RlZCBwcm9wZXJ0eSBiYXNlZCBvbiBhIHBhdGggYXJyYXkuXHJcbiAqXHJcbiAqIEB0ZW1wbGF0ZSBUIC0gVGhlIHJvb3Qgb2JqZWN0IHR5cGUgKGUuZy4sIGZ1bGwgc3RhdGUpLlxyXG4gKiBAdGVtcGxhdGUgUCAtIEEgc3RyaW5nIGFycmF5IHJlcHJlc2VudGluZyB0aGUgcGF0aCB0byB0aGUgbmVzdGVkIHZhbHVlLlxyXG4gKi9cclxuZXhwb3J0IHR5cGUgVmFsdWVBdFBhdGg8VCwgUCBleHRlbmRzIHJlYWRvbmx5IGFueVtdPiA9XHJcbiAgUCBleHRlbmRzIFtpbmZlciBLLCAuLi5pbmZlciBSZXN0XVxyXG4gICAgPyBLIGV4dGVuZHMga2V5b2YgVFxyXG4gICAgICA/IFJlc3QgZXh0ZW5kcyBbXVxyXG4gICAgICAgID8gVFtLXVxyXG4gICAgICAgIDogVmFsdWVBdFBhdGg8VFtLXSwgUmVzdD5cclxuICAgICAgOiB1bmtub3duXHJcbiAgICA6IHVua25vd247XHJcblxyXG4vKipcclxuICogU2VsZWN0cyBhIG5lc3RlZCBwcm9wZXJ0eSBmcm9tIGEgcGxhaW4gb2JqZWN0IHN0YXRlIHVzaW5nIGEgcGF0aCBvZiBrZXlzLlxyXG4gKlxyXG4gKiBAdGVtcGxhdGUgVCBUaGUgcm9vdCBzdGF0ZSBvYmplY3QgdHlwZS5cclxuICogQHRlbXBsYXRlIFAgQSBrZXkgb2YgdGhlIG9iamVjdCBvciBhIHBhdGggYXJyYXkuXHJcbiAqXHJcbiAqIEBwYXJhbSBzbGljZSBUaGUga2V5IG9yIHBhdGggdG8gdGhlIGRlc2lyZWQgbmVzdGVkIHZhbHVlLlxyXG4gKlxyXG4gKiBAcmV0dXJucyBBIHNlbGVjdG9yIGZ1bmN0aW9uIHRoYXQgdGFrZXMgYSBwbGFpbiBvYmplY3Qgc3RhdGUgYW5kIHJldHVybnMgdGhlIG5lc3RlZCB2YWx1ZS5cclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVGZWF0dXJlU2VsZWN0b3I8XHJcbiAgVCA9IGFueSxcclxuICBQIGV4dGVuZHMga2V5b2YgVCB8IHJlYWRvbmx5IHN0cmluZ1tdID0ga2V5b2YgVFxyXG4+KFxyXG4gIHNsaWNlOiBQXHJcbik6IChzdGF0ZTogVCkgPT5cclxuICAoUCBleHRlbmRzIGtleW9mIFRcclxuICAgID8gVFtQXVxyXG4gICAgOiBQIGV4dGVuZHMgcmVhZG9ubHkgc3RyaW5nW11cclxuICAgICAgPyBWYWx1ZUF0UGF0aDxULCBQPlxyXG4gICAgICA6IHVua25vd24pIHwgdW5kZWZpbmVkIHtcclxuXHJcbiAgcmV0dXJuIChzdGF0ZTogVCkgPT4ge1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoc2xpY2UpKSB7XHJcbiAgICAgIHJldHVybiBzbGljZS5yZWR1Y2U8YW55PigoYWNjLCBrZXkpID0+IGFjYz8uW2tleV0sIHN0YXRlKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiBzdGF0ZVtzbGljZSBhcyBrZXlvZiBUXTtcclxuICAgIH1cclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogQ29tcG9zZXMgbXVsdGlwbGUgc2VsZWN0b3JzIGludG8gb25lLCBhcHBseWluZyBhbiBvcHRpb25hbCBwcm9qZWN0aW9uIGZ1bmN0aW9uLlxyXG4gKlxyXG4gKiBAdGVtcGxhdGUgVCBTbGljZSB0eXBlIGV4dHJhY3RlZCBmcm9tIHN0YXRlLlxyXG4gKiBAdGVtcGxhdGUgVSBGaW5hbCByZXR1cm4gdHlwZSBhZnRlciBwcm9qZWN0aW9uLlxyXG4gKlxyXG4gKiBAcGFyYW0gZmVhdHVyZVNlbGVjdG9yIFNlbGVjdG9yIGZvciBleHRyYWN0aW5nIHRoZSBzbGljZSBmcm9tIGZ1bGwgc3RhdGUsIG9yIFwiQGdsb2JhbFwiIGZvciBlbnRpcmUgc3RhdGUuXHJcbiAqIEBwYXJhbSBzZWxlY3RvcnMgQSBzZWxlY3RvciBvciBhcnJheSBvZiBzZWxlY3RvcnMgZm9yIGV4dHJhY3RpbmcgaW50ZXJtZWRpYXRlIHZhbHVlcy5cclxuICogQHBhcmFtIHByb2plY3Rpb24gT3B0aW9uYWwgZnVuY3Rpb24gdG8gcHJvamVjdCBpbnRlcm1lZGlhdGUgdmFsdWVzIGludG8gYSBmaW5hbCByZXN1bHQuXHJcbiAqXHJcbiAqIEByZXR1cm5zIEEgc2VsZWN0b3IgdGhhdCBjb21wdXRlcyBhIGRlcml2ZWQgdmFsdWUgZnJvbSB0aGUgc2xpY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBzZWxlY3RvcnMuXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVTZWxlY3RvcjxUID0gYW55LCBVID0gYW55PihcclxuICBmZWF0dXJlU2VsZWN0b3I6ICgoc3RhdGU6IGFueSkgPT4gVCB8IHVuZGVmaW5lZCkgfCBcIkBnbG9iYWxcIixcclxuICBzZWxlY3RvcnM6IFNlbGVjdG9yRnVuY3Rpb24gfCBTZWxlY3RvckZ1bmN0aW9uW10sXHJcbiAgcHJvamVjdGlvbk9yT3B0aW9ucz86IFByb2plY3Rpb25GdW5jdGlvblxyXG4pOiAocHJvcHM/OiBhbnlbXSB8IGFueSwgcHJvamVjdGlvblByb3BzPzogYW55KSA9PiAoc3RhdGU6IGFueSkgPT4gVSB8IHVuZGVmaW5lZCB7XHJcblxyXG4gIGNvbnN0IGlzU2VsZWN0b3JBcnJheSA9IEFycmF5LmlzQXJyYXkoc2VsZWN0b3JzKTtcclxuICBjb25zdCBwcm9qZWN0aW9uID0gdHlwZW9mIHByb2plY3Rpb25Pck9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIiA/IHByb2plY3Rpb25Pck9wdGlvbnMgOiB1bmRlZmluZWQ7XHJcblxyXG4gIHJldHVybiAocHJvcHM/OiBhbnlbXSB8IGFueSwgcHJvamVjdGlvblByb3BzPzogYW55KSA9PiB7XHJcbiAgICByZXR1cm4gKHN0YXRlOiBhbnkpOiBVIHwgdW5kZWZpbmVkID0+IHtcclxuICAgICAgY29uc3Qgc2xpY2VTdGF0ZSA9IGZlYXR1cmVTZWxlY3RvciA9PT0gXCJAZ2xvYmFsXCIgPyBzdGF0ZSA6IGZlYXR1cmVTZWxlY3RvcihzdGF0ZSk7XHJcbiAgICAgIGlmIChzbGljZVN0YXRlID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGlmIChpc1NlbGVjdG9yQXJyYXkpIHtcclxuICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBzZWxlY3RvcnMubWFwKChzZWxlY3RvciwgaSkgPT5cclxuICAgICAgICAgICAgc2VsZWN0b3Ioc2xpY2VTdGF0ZSwgcHJvcHM/LltpXSlcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBpZiAocmVzdWx0cy5zb21lKHIgPT4gciA9PT0gdW5kZWZpbmVkKSkgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgICAgICAgIHJldHVybiBwcm9qZWN0aW9uIShyZXN1bHRzLCBwcm9qZWN0aW9uUHJvcHMpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBzZWxlY3RvcnMoc2xpY2VTdGF0ZSwgcHJvcHMpO1xyXG4gICAgICAgICAgcmV0dXJuIHJlc3VsdCA9PT0gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgID8gdW5kZWZpbmVkXHJcbiAgICAgICAgICAgIDogcHJvamVjdGlvblxyXG4gICAgICAgICAgICAgID8gcHJvamVjdGlvbihyZXN1bHQsIHByb2plY3Rpb25Qcm9wcylcclxuICAgICAgICAgICAgICA6IHJlc3VsdDtcclxuICAgICAgICB9XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oXCJTZWxlY3RvciBleGVjdXRpb24gZXJyb3I6XCIsIGVycm9yLm1lc3NhZ2UpO1xyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNpbWlsYXIgdG8gYGNyZWF0ZVNlbGVjdG9yYCBidXQgc3VwcG9ydHMgYXN5bmNocm9ub3VzIHNlbGVjdG9yIGZ1bmN0aW9ucy5cclxuICpcclxuICogQHRlbXBsYXRlIFQgU2xpY2UgdHlwZSBleHRyYWN0ZWQgZnJvbSBzdGF0ZS5cclxuICogQHRlbXBsYXRlIFUgRmluYWwgcmV0dXJuIHR5cGUgYWZ0ZXIgcHJvamVjdGlvbi5cclxuICpcclxuICogQHBhcmFtIGZlYXR1cmVTZWxlY3RvciBTZWxlY3RvciBmb3IgZXh0cmFjdGluZyB0aGUgc2xpY2UgZnJvbSBmdWxsIHN0YXRlLCBvciBcIkBnbG9iYWxcIiBmb3IgZW50aXJlIHN0YXRlLlxyXG4gKiBAcGFyYW0gc2VsZWN0b3JzIEEgc2VsZWN0b3Igb3IgYXJyYXkgb2Ygc2VsZWN0b3JzIHJldHVybmluZyBhIHZhbHVlLCBQcm9taXNlLCBvciBPYnNlcnZhYmxlLWxpa2UuXHJcbiAqIEBwYXJhbSBwcm9qZWN0aW9uIE9wdGlvbmFsIGZ1bmN0aW9uIHRvIHByb2plY3QgaW50ZXJtZWRpYXRlIHZhbHVlcyBpbnRvIGEgZmluYWwgcmVzdWx0LlxyXG4gKlxyXG4gKiBAcmV0dXJucyBBIHNlbGVjdG9yIHRoYXQgcmV0dXJucyBhIFByb21pc2Ugb2YgYSBkZXJpdmVkIHZhbHVlIGZyb20gdGhlIHN0YXRlLlxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlU2VsZWN0b3JBc3luYzxUID0gYW55LCBVID0gYW55PihcclxuICBmZWF0dXJlU2VsZWN0b3I6ICgoc3RhdGU6IGFueSkgPT4gVCB8IHVuZGVmaW5lZCkgfCBcIkBnbG9iYWxcIixcclxuICBzZWxlY3RvcnM6IFNlbGVjdG9yRnVuY3Rpb24gfCBTZWxlY3RvckZ1bmN0aW9uW10sXHJcbiAgcHJvamVjdGlvbk9yT3B0aW9ucz86IFByb2plY3Rpb25GdW5jdGlvblxyXG4pOiAocHJvcHM/OiBhbnlbXSB8IGFueSwgcHJvamVjdGlvblByb3BzPzogYW55KSA9PiAoc3RhdGU6IGFueSkgPT4gUHJvbWlzZTxVIHwgdW5kZWZpbmVkPiB7XHJcblxyXG4gIGNvbnN0IGlzU2VsZWN0b3JBcnJheSA9IEFycmF5LmlzQXJyYXkoc2VsZWN0b3JzKTtcclxuICBjb25zdCBwcm9qZWN0aW9uID0gdHlwZW9mIHByb2plY3Rpb25Pck9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIiA/IHByb2plY3Rpb25Pck9wdGlvbnMgOiB1bmRlZmluZWQ7XHJcblxyXG4gIHJldHVybiAocHJvcHM/OiBhbnlbXSB8IGFueSwgcHJvamVjdGlvblByb3BzPzogYW55KSA9PiB7XHJcbiAgICByZXR1cm4gYXN5bmMgKHN0YXRlOiBhbnkpOiBQcm9taXNlPFUgfCB1bmRlZmluZWQ+ID0+IHtcclxuICAgICAgY29uc3Qgc2xpY2VTdGF0ZSA9IGZlYXR1cmVTZWxlY3RvciA9PT0gXCJAZ2xvYmFsXCIgPyBzdGF0ZSA6IGZlYXR1cmVTZWxlY3RvcihzdGF0ZSk7XHJcbiAgICAgIGlmIChzbGljZVN0YXRlID09PSB1bmRlZmluZWQpIHJldHVybiB1bmRlZmluZWQ7XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGlmIChpc1NlbGVjdG9yQXJyYXkpIHtcclxuICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChcclxuICAgICAgICAgICAgc2VsZWN0b3JzLm1hcCgoc2VsZWN0b3IsIGkpID0+IHNlbGVjdG9yKHNsaWNlU3RhdGUsIHByb3BzPy5baV0pKVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICAgIGlmIChyZXN1bHRzLnNvbWUociA9PiByID09PSB1bmRlZmluZWQpKSByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgcmV0dXJuIHByb2plY3Rpb24hKHJlc3VsdHMsIHByb2plY3Rpb25Qcm9wcyk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlbGVjdG9ycyhzbGljZVN0YXRlLCBwcm9wcyk7XHJcbiAgICAgICAgICByZXR1cm4gcmVzdWx0ID09PSB1bmRlZmluZWRcclxuICAgICAgICAgICAgPyB1bmRlZmluZWRcclxuICAgICAgICAgICAgOiBwcm9qZWN0aW9uXHJcbiAgICAgICAgICAgICAgPyBwcm9qZWN0aW9uKHJlc3VsdCwgcHJvamVjdGlvblByb3BzKVxyXG4gICAgICAgICAgICAgIDogcmVzdWx0O1xyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihcIkFzeW5jIHNlbGVjdG9yIGVycm9yOlwiLCBlcnJvci5tZXNzYWdlKTtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH07XHJcbn1cclxuIl19