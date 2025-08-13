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
export { applyChange, applyMiddleware, combineEnhancers, combineReducers, };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9saWJyYXJpZXMvYWN0aW9uc3RhY2svc3RvcmUvc3JjL2xpYi91dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFHQTs7OztLQUlLO0FBQ0wsU0FBUyxXQUFXLENBQUMsWUFBaUIsRUFBRSxFQUFDLElBQUksRUFBRSxLQUFLLEVBQStCLEVBQUUsT0FBc0I7SUFDekcsSUFBSSxZQUFZLEdBQVEsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUEsQ0FBQyxDQUFDLEVBQUMsR0FBRyxZQUFZLEVBQUMsQ0FBQztJQUMxRixJQUFJLFVBQVUsR0FBUSxZQUFZLENBQUM7SUFFbkMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDcEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1lBQ3pCLDBDQUEwQztZQUMxQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQ3hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7U0FDckI7YUFBTTtZQUNMLHFCQUFxQjtZQUNyQixVQUFVLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkYsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMs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RyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQVUsQ0FBQztRQUVuSCwrREFBK0Q7UUFDL0QsSUFBSSxRQUFRLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FDOUIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQ3RDLEtBQUssQ0FBQyxRQUFRLENBQ2YsQ0FBQztRQUVGLDRCQUE0QjtRQUM1QixPQUFPO1lBQ0wsR0FBRyxLQUFLO1lBQ1IsUUFBUSxFQUFFLGdEQUFnRDtTQUMzRCxDQUFDO0lBQ0osQ0FBQyxDQUFDO0lBRUYsOERBQThEO0lBQzlELE1BQU0sQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7SUFDdEUsT0FBTyxRQUFRLENBQUM7QUFDbEIsQ0FBQyxDQUFDO0FBRUYsT0FBTyxFQUNMLFdBQVcsRUFDWCxlQUFlLEVBQ2YsZ0JBQWdCLEVBQ2hCLGVBQWUsR0FDaEIsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFjdGlvbiwgQXN5bmNSZWR1Y2VyLCBSZWR1Y2VyLCBTdG9yZUNyZWF0b3IsIFN0b3JlRW5oYW5jZXIsIFRyZWUgfSBmcm9tIFwiLi90eXBlc1wiO1xyXG5cclxuXHJcbi8qKlxyXG4gICAqIFVwZGF0ZXMgYSBuZXN0ZWQgc3RhdGUgb2JqZWN0IGJ5IGFwcGx5aW5nIGEgY2hhbmdlIHRvIHRoZSBzcGVjaWZpZWQgcGF0aCBhbmQgdmFsdWUuXHJcbiAgICogRW5zdXJlcyB0aGF0IGludGVybWVkaWF0ZSBub2RlcyBpbiB0aGUgc3RhdGUgYXJlIHByb3Blcmx5IGNsb25lZCBvciBjcmVhdGVkLCBwcmVzZXJ2aW5nIGltbXV0YWJpbGl0eVxyXG4gICAqIGZvciB1bmNoYW5nZWQgYnJhbmNoZXMuIFRyYWNrcyB2aXNpdGVkIG5vZGVzIGluIHRoZSBwcm92aWRlZCBvYmplY3QgdHJlZSB0byBhdm9pZCByZWR1bmRhbnQgdXBkYXRlcy5cclxuICAgKi9cclxuZnVuY3Rpb24gYXBwbHlDaGFuZ2UoaW5pdGlhbFN0YXRlOiBhbnksIHtwYXRoLCB2YWx1ZX06IHtwYXRoOiBzdHJpbmdbXSwgdmFsdWU6IGFueX0sIG9ialRyZWU6IFRyZWU8Ym9vbGVhbj4pOiBhbnkge1xyXG4gIGxldCBjdXJyZW50U3RhdGU6IGFueSA9IE9iamVjdC5rZXlzKG9ialRyZWUpLmxlbmd0aCA+IDAgPyBpbml0aWFsU3RhdGU6IHsuLi5pbml0aWFsU3RhdGV9O1xyXG4gIGxldCBjdXJyZW50T2JqOiBhbnkgPSBjdXJyZW50U3RhdGU7XHJcblxyXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xyXG4gICAgY29uc3Qga2V5ID0gcGF0aFtpXTtcclxuICAgIGlmIChpID09PSBwYXRoLmxlbmd0aCAtIDEpIHtcclxuICAgICAgLy8gUmVhY2hlZCB0aGUgbGVhZiBub2RlLCB1cGRhdGUgaXRzIHZhbHVlXHJcbiAgICAgIGN1cnJlbnRPYmpba2V5XSA9IHZhbHVlO1xyXG4gICAgICBvYmpUcmVlW2tleV0gPSB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gQ29udGludWUgdHJhdmVyc2FsXHJcbiAgICAgIGN1cnJlbnRPYmogPSBjdXJyZW50T2JqW2tleV0gPSBvYmpUcmVlW2tleV0gPyBjdXJyZW50T2JqW2tleV0gOiB7IC4uLmN1cnJlbnRPYmpba2V5XSB9O1xyXG4gICAgICBvYmpUcmVlID0gKG9ialRyZWVba2V5XSA9IG9ialRyZWVba2V5XSA/PyB7fSkgYXMgYW55O1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gY3VycmVudFN0YXRlO1xyXG59XHJcblxyXG4vKipcclxuICogQ29tYmluZXMgbXVsdGlwbGUgc3RvcmUgZW5oYW5jZXJzIGludG8gYSBzaW5nbGUgZW5oYW5jZXIgZnVuY3Rpb24uXHJcbiAqIFRoaXMgYWxsb3dzIG11bHRpcGxlIGVuaGFuY2VycyB0byBiZSBhcHBsaWVkIGluIHNlcXVlbmNlIHRvIHRoZSBzdG9yZS5cclxuICogVHlwaWNhbGx5IHVzZWQgZm9yIGNvbWJpbmluZyBtaWRkbGV3YXJlLCBsb2dnaW5nLCBvciBvdGhlciBzdG9yZSBjdXN0b21pemF0aW9ucy5cclxuICpcclxuICogQHBhcmFtIGVuaGFuY2VycyAtIEFuIGFycmF5IG9mIHN0b3JlIGVuaGFuY2VycyB0byBiZSBjb21iaW5lZC5cclxuICogQHJldHVybnMgQSBzaW5nbGUgc3RvcmUgZW5oYW5jZXIgdGhhdCBhcHBsaWVzIGFsbCBwcm92aWRlZCBlbmhhbmNlcnMuXHJcbiAqL1xyXG5mdW5jdGlvbiBjb21iaW5lRW5oYW5jZXJzKC4uLmVuaGFuY2VyczogU3RvcmVFbmhhbmNlcltdKTogU3RvcmVFbmhhbmNlciB7XHJcbiAgLy8gQ29sbGVjdCB0aGUgbmFtZXMgb2YgdGhlIGVuaGFuY2VycyBmb3IgbGF0ZXIgYWNjZXNzXHJcbiAgY29uc3QgbWV0aG9kTmFtZXMgPSBlbmhhbmNlcnMubWFwKGVuaGFuY2VyID0+IGVuaGFuY2VyLm5hbWUpO1xyXG5cclxuICAvLyBDcmVhdGUgYSBuZXcgY29tYmluZWQgZW5oYW5jZXIgdGhhdCB3cmFwcyB0aGUgZW5oYW5jZXJzXHJcbiAgY29uc3QgY29tYmluZWRFbmhhbmNlciA9IChuZXh0OiBTdG9yZUNyZWF0b3IpID0+IHtcclxuICAgIC8vIEFwcGx5IGVhY2ggZW5oYW5jZXIgaW4gdGhlIGNoYWluXHJcbiAgICByZXR1cm4gZW5oYW5jZXJzLnJlZHVjZVJpZ2h0KFxyXG4gICAgICAoYWNjLCBlbmhhbmNlcikgPT4gZW5oYW5jZXIoYWNjKSxcclxuICAgICAgbmV4dFxyXG4gICAgKTtcclxuICB9O1xyXG5cclxuICAvLyBBdHRhY2ggdGhlIG5hbWVzIG9mIHRoZSBlbmhhbmNlcnMgdG8gdGhlIGNvbWJpbmVkIGVuaGFuY2VyXHJcbiAgY29tYmluZWRFbmhhbmNlci5uYW1lcyA9IG1ldGhvZE5hbWVzO1xyXG5cclxuICByZXR1cm4gY29tYmluZWRFbmhhbmNlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvbWJpbmVzIHJlZHVjZXJzIGludG8gYSBzaW5nbGUgcmVkdWNlciBmdW5jdGlvbi5cclxuICogSW5pdGlhbGl6ZXMgdGhlIGRlZmF1bHQgc3RhdGUgYnkgaW52b2tpbmcgZWFjaCByZWR1Y2VyIHdpdGggYHVuZGVmaW5lZGAgYW5kIGEgc3BlY2lhbCBgQEBJTklUYCBhY3Rpb24uXHJcbiAqL1xyXG5jb25zdCBjb21iaW5lUmVkdWNlcnMgPSAocmVkdWNlcnM6IFRyZWU8UmVkdWNlciB8IEFzeW5jUmVkdWNlcj4pOiBBc3luY1JlZHVjZXIgPT4ge1xyXG4gIC8qKlxyXG4gICAqIEhlbHBlciB0byB2YWxpZGF0ZSByZWR1Y2VycyBhbmQgZmxhdHRlbiB0aGVtIGludG8gYSBzaW5nbGUgbWFwLlxyXG4gICAqXHJcbiAgICogVGhpcyByZWN1cnNpdmVseSBmbGF0dGVucyB0aGUgbmVzdGVkIHJlZHVjZXIgdHJlZSBhbmQgZW5zdXJlcyBhbGwgcmVkdWNlciBwYXRocyBhcmUgY2FwdHVyZWQgaW4gdGhlIG1hcC5cclxuICAgKi9cclxuICBjb25zdCBmbGF0dGVuUmVkdWNlcnMgPSAodHJlZTogVHJlZTxSZWR1Y2VyIHwgQXN5bmNSZWR1Y2VyPiwgcGF0aDogc3RyaW5nW10gPSBbXSk6IE1hcDxzdHJpbmcsIHsgcmVkdWNlcjogQXN5bmNSZWR1Y2VyOyBwYXRoOiBzdHJpbmdbXSB9PiA9PiB7XHJcbiAgICBjb25zdCByZWR1Y2VyTWFwID0gbmV3IE1hcDxzdHJpbmcsIHsgcmVkdWNlcjogQXN5bmNSZWR1Y2VyOyBwYXRoOiBzdHJpbmdbXSB9PigpO1xyXG5cclxuICAgIGZvciAoY29uc3Qga2V5IGluIHRyZWUpIHtcclxuICAgICAgY29uc3QgcmVkdWNlciA9IHRyZWVba2V5XTtcclxuICAgICAgY29uc3QgY3VycmVudFBhdGggPSBbLi4ucGF0aCwga2V5XTtcclxuXHJcbiAgICAgIGlmICh0eXBlb2YgcmVkdWNlciA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgcmVkdWNlck1hcC5zZXQoY3VycmVudFBhdGguam9pbihcIi5cIiksIHsgcmVkdWNlciwgcGF0aDogY3VycmVudFBhdGggfSk7XHJcbiAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJlZHVjZXIgPT09IFwib2JqZWN0XCIgJiYgcmVkdWNlciAhPT0gbnVsbCkge1xyXG4gICAgICAgIC8vIFJlY3Vyc2l2ZWx5IGZsYXR0ZW4gdGhlIG5lc3RlZCByZWR1Y2Vycy5cclxuICAgICAgICBjb25zdCBjaGlsZFJlZHVjZXJzID0gZmxhdHRlblJlZHVjZXJzKHJlZHVjZXIsIGN1cnJlbnRQYXRoKTtcclxuICAgICAgICBjaGlsZFJlZHVjZXJzLmZvckVhY2goKGNoaWxkUmVkdWNlciwgY2hpbGRLZXkpID0+IHtcclxuICAgICAgICAgIHJlZHVjZXJNYXAuc2V0KGNoaWxkS2V5LCBjaGlsZFJlZHVjZXIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCByZWR1Y2VyIGF0IHBhdGg6ICR7Y3VycmVudFBhdGguam9pbihcIi5cIil9YCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gcmVkdWNlck1hcDtcclxuICB9O1xyXG5cclxuICBjb25zdCByZWR1Y2VyTWFwID0gZmxhdHRlblJlZHVjZXJzKHJlZHVjZXJzKTtcclxuXHJcbiAgLyoqXHJcbiAgICogSGVscGVyIHRvIGJ1aWxkIHRoZSBpbml0aWFsIHN0YXRlIGJ5IGNhbGxpbmcgcmVkdWNlcnMgd2l0aCB1bmRlZmluZWQgc3RhdGUgYW5kIGEgc3BlY2lhbCBgQEBJTklUYCBhY3Rpb24uXHJcbiAgICpcclxuICAgKiBJdCBnYXRoZXJzIHRoZSBpbml0aWFsIHN0YXRlIGZvciBlYWNoIHJlZHVjZXIsIGVuc3VyaW5nIHRoZSBuZXN0ZWQgc3RydWN0dXJlIGlzIHJlc3BlY3RlZC5cclxuICAgKi9cclxuICBjb25zdCBnYXRoZXJJbml0aWFsU3RhdGUgPSBhc3luYyAoKTogUHJvbWlzZTxhbnk+ID0+IHtcclxuICAgIGNvbnN0IGluaXRpYWxTdGF0ZTogYW55ID0ge307XHJcblxyXG4gICAgZm9yIChjb25zdCB7IHJlZHVjZXIsIHBhdGggfSBvZiByZWR1Y2VyTWFwLnZhbHVlcygpKSB7XHJcbiAgICAgIGNvbnN0IGtleSA9IHBhdGhbcGF0aC5sZW5ndGggLSAxXTsgLy8gR2V0IHRoZSBsYXN0IGtleSBpbiB0aGUgcGF0aCBhcyB0aGUgc3RhdGUgc2xpY2VcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBpbml0U3RhdGUgPSBhd2FpdCByZWR1Y2VyKHVuZGVmaW5lZCwgeyB0eXBlOiBcIkBASU5JVFwiIH0gYXMgQWN0aW9uKTtcclxuICAgICAgICBsZXQgY3Vyc29yID0gaW5pdGlhbFN0YXRlO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGF0aC5sZW5ndGggLSAxOyBpKyspIHtcclxuICAgICAgICAgIGN1cnNvcltwYXRoW2ldXSA9IGN1cnNvcltwYXRoW2ldXSB8fCB7fTtcclxuICAgICAgICAgIGN1cnNvciA9IGN1cnNvcltwYXRoW2ldXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY3Vyc29yW2tleV0gPSBpbml0U3RhdGU7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBpbml0aWFsaXppbmcgc3RhdGUgYXQgcGF0aCBcIiR7cGF0aC5qb2luKCcuJyl9XCIgd2l0aCBhY3Rpb24gXCJAQElOSVRcIjogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGluaXRpYWxTdGF0ZTtcclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb21iaW5lZCByZWR1Y2VyIGZ1bmN0aW9uLlxyXG4gICAqXHJcbiAgICogSXQgcHJvY2Vzc2VzIGVhY2ggcmVkdWNlciBhc3luY2hyb25vdXNseSBhbmQgZW5zdXJlcyB0aGUgc3RhdGUgaXMgb25seSB1cGRhdGVkIGlmIG5lY2Vzc2FyeS5cclxuICAgKi9cclxuICByZXR1cm4gYXN5bmMgKHN0YXRlOiBhbnksIGFjdGlvbjogQWN0aW9uKTogUHJvbWlzZTxhbnk+ID0+IHtcclxuICAgIGlmIChzdGF0ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHN0YXRlID0gYXdhaXQgZ2F0aGVySW5pdGlhbFN0YXRlKCk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGhhc0NoYW5nZWQgPSBmYWxzZTtcclxuICAgIGNvbnN0IG1vZGlmaWVkOiBhbnkgPSB7fTsgLy8gVG8gdHJhY2sgdGhlIG1vZGlmaWNhdGlvbnNcclxuICAgIGNvbnN0IG5leHRTdGF0ZSA9IHsgLi4uc3RhdGUgfTtcclxuXHJcbiAgICAvLyBQcm9jZXNzIGVhY2ggcmVkdWNlciBpbiB0aGUgZmxhdHRlbmVkIHJlZHVjZXIgbWFwXHJcbiAgICBmb3IgKGNvbnN0IHsgcmVkdWNlciwgcGF0aCB9IG9mIHJlZHVjZXJNYXAudmFsdWVzKCkpIHtcclxuICAgICAgY29uc3Qga2V5ID0gcGF0aFtwYXRoLmxlbmd0aCAtIDFdO1xyXG4gICAgICBjb25zdCBjdXJyZW50U3RhdGUgPSBwYXRoLnJlZHVjZSgoYWNjLCBrZXkpID0+IGFjY1trZXldLCBzdGF0ZSk7XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IHVwZGF0ZWRTdGF0ZSA9IGF3YWl0IHJlZHVjZXIoY3VycmVudFN0YXRlLCBhY3Rpb24pO1xyXG4gICAgICAgIGlmIChjdXJyZW50U3RhdGUgIT09IHVwZGF0ZWRTdGF0ZSkge1xyXG4gICAgICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgICAvLyBBcHBseSB0aGUgY2hhbmdlIHRvIHRoZSBzdGF0ZSB1c2luZyBhcHBseUNoYW5nZVxyXG4gICAgICAgICAgc3RhdGUgPSBhd2FpdCBhcHBseUNoYW5nZShzdGF0ZSwgeyBwYXRoLCB2YWx1ZTogdXBkYXRlZFN0YXRlIH0sIG1vZGlmaWVkKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKFxyXG4gICAgICAgICAgYEVycm9yIHByb2Nlc3NpbmcgcmVkdWNlciBhdCBcIiR7cGF0aC5qb2luKFwiLlwiKX1cIiB3aXRoIGFjdGlvbiBcIiR7YWN0aW9uLnR5cGV9XCI6ICR7ZXJyb3IubWVzc2FnZX1gXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIFJldHVybiB0aGUgc3RhdGUgb25seSBpZiBpdCBoYXMgY2hhbmdlZCwgb3RoZXJ3aXNlIHJldHVybiB0aGUgcHJldmlvdXMgc3RhdGUuXHJcbiAgICByZXR1cm4gaGFzQ2hhbmdlZCA/IHN0YXRlIDogbmV4dFN0YXRlO1xyXG4gIH07XHJcbn07XHJcblxyXG4vKipcclxuICogQXBwbGllcyBtaWRkbGV3YXJlIHRvIHRoZSBzdG9yZSdzIGRpc3BhdGNoIGZ1bmN0aW9uLlxyXG4gKiBNaWRkbGV3YXJlIGVuaGFuY2VzIHRoZSBkaXNwYXRjaCBmdW5jdGlvbiwgYWxsb3dpbmcgYWN0aW9ucyB0byBiZSBpbnRlcmNlcHRlZCBhbmQgbW9kaWZpZWQuXHJcbiAqXHJcbiAqIEBwYXJhbSB7Li4uRnVuY3Rpb25bXX0gbWlkZGxld2FyZXMgTWlkZGxld2FyZSBmdW5jdGlvbnMgdG8gYXBwbHkuXHJcbiAqIEByZXR1cm5zIEEgc3RvcmUgZW5oYW5jZXIgdGhhdCBhcHBsaWVzIHRoZSBtaWRkbGV3YXJlIHRvIHRoZSBzdG9yZS5cclxuICovXHJcbmNvbnN0IGFwcGx5TWlkZGxld2FyZSA9ICguLi5taWRkbGV3YXJlczogRnVuY3Rpb25bXSk6IFN0b3JlRW5oYW5jZXIgPT4ge1xyXG4gIGNvbnN0IGVuaGFuY2VyOiBTdG9yZUVuaGFuY2VyID0gKG5leHQpID0+IChtYWluTW9kdWxlLCBzZXR0aW5ncywgZW5oYW5jZXIpID0+IHtcclxuICAgIC8vIENyZWF0ZSB0aGUgc3RvcmUgd2l0aCB0aGUgb3JpZ2luYWwgcmVkdWNlciBhbmQgZW5oYW5jZXJcclxuICAgIGNvbnN0IHN0b3JlID0gbmV4dChtYWluTW9kdWxlLCBzZXR0aW5ncywgZW5oYW5jZXIpO1xyXG5cclxuICAgIC8vIERlZmluZSBzdGFydGVyIGFuZCBtaWRkbGV3YXJlIEFQSXNcclxuICAgIGNvbnN0IG1pZGRsZXdhcmVBUEkgPSBzdG9yZS5nZXRNaWRkbGV3YXJlQVBJKCk7XHJcblxyXG4gICAgLy8gQnVpbGQgbWlkZGxld2FyZSBjaGFpblxyXG4gICAgY29uc3QgY2hhaW4gPSBbc3RvcmUuc3RhcnRlcihtaWRkbGV3YXJlQVBJKSwgLi4ubWlkZGxld2FyZXMubWFwKG1pZGRsZXdhcmUgPT4gbWlkZGxld2FyZShtaWRkbGV3YXJlQVBJKSldIGFzIGFueVtdO1xyXG5cclxuICAgIC8vIENvbXBvc2UgdGhlIG1pZGRsZXdhcmUgY2hhaW4gaW50byBhIHNpbmdsZSBkaXNwYXRjaCBmdW5jdGlvblxyXG4gICAgbGV0IGRpc3BhdGNoID0gY2hhaW4ucmVkdWNlUmlnaHQoXHJcbiAgICAgIChuZXh0LCBtaWRkbGV3YXJlKSA9PiBtaWRkbGV3YXJlKG5leHQpLFxyXG4gICAgICBzdG9yZS5kaXNwYXRjaFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIGVuaGFuY2VkIHN0b3JlXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAuLi5zdG9yZSxcclxuICAgICAgZGlzcGF0Y2gsIC8vIE92ZXJ3cml0ZSBkaXNwYXRjaCB3aXRoIHRoZSBlbmhhbmNlZCBkaXNwYXRjaFxyXG4gICAgfTtcclxuICB9O1xyXG5cclxuICAvLyBFbnN1cmUgdGhlICduYW1lJyBwcm9wZXJ0eSBpcyBwcm9wZXJseSBzZXQgZm9yIHRoZSBlbmhhbmNlclxyXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShlbmhhbmNlciwgJ25hbWUnLCB7IHZhbHVlOiAnYXBwbHlNaWRkbGV3YXJlJyB9KTtcclxuICByZXR1cm4gZW5oYW5jZXI7XHJcbn07XHJcblxyXG5leHBvcnQge1xyXG4gIGFwcGx5Q2hhbmdlLFxyXG4gIGFwcGx5TWlkZGxld2FyZSxcclxuICBjb21iaW5lRW5oYW5jZXJzLFxyXG4gIGNvbWJpbmVSZWR1Y2VycyxcclxufVxyXG4iXX0=