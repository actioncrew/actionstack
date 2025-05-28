import { ProjectionFunction, SelectorFunction } from './types';

export {
  createFeatureSelector as featureSelector,
  createSelector as selector,
  createSelectorAsync as selectorAsync
};

/**
 * Recursively resolves the type of a deeply nested property based on a path array.
 *
 * @template T - The root object type (e.g., full state).
 * @template P - A string array representing the path to the nested value.
 */
export type ValueAtPath<T, P extends readonly any[]> =
  P extends [infer K, ...infer Rest]
    ? K extends keyof T
      ? Rest extends []
        ? T[K]
        : ValueAtPath<T[K], Rest>
      : unknown
    : unknown;

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
export function createFeatureSelector<
  T = any,
  P extends keyof T | readonly string[] = keyof T
>(
  slice: P
): (state: T) =>
  (P extends keyof T
    ? T[P]
    : P extends readonly string[]
      ? ValueAtPath<T, P>
      : unknown) | undefined {

  return (state: T) => {
    if (Array.isArray(slice)) {
      return slice.reduce<any>((acc, key) => acc?.[key], state);
    } else {
      return state[slice as keyof T];
    }
  };
}

/**
 * Composes multiple selectors into one, applying an optional projection function.
 *
 * @template T Slice type extracted from state.
 * @template U Final return type after projection.
 *
 * @param featureSelector Selector for extracting the slice from full state, or "*" for entire state.
 * @param selectors A selector or array of selectors for extracting intermediate values.
 * @param projection Optional function to project intermediate values into a final result.
 *
 * @returns A selector that computes a derived value from the slice using the specified selectors.
 */
function createSelector<T = any, U = any>(
  featureSelector: ((state: any) => T | undefined) | "*",
  selectors: SelectorFunction | SelectorFunction[],
  projectionOrOptions?: ProjectionFunction
): (props?: any[] | any, projectionProps?: any) => (state: any) => U | undefined {

  const isSelectorArray = Array.isArray(selectors);
  const projection = typeof projectionOrOptions === "function" ? projectionOrOptions : undefined;

  return (props?: any[] | any, projectionProps?: any) => {
    return (state: any): U | undefined => {
      const sliceState = featureSelector === "*" ? state : featureSelector(state);
      if (sliceState === undefined) return undefined;

      try {
        if (isSelectorArray) {
          const results = selectors.map((selector, i) =>
            selector(sliceState, props?.[i])
          );
          if (results.some(r => r === undefined)) return undefined;
          return projection!(results, projectionProps);
        } else {
          const result = selectors(sliceState, props);
          return result === undefined
            ? undefined
            : projection
              ? projection(result, projectionProps)
              : result;
        }
      } catch (error: any) {
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
 * @param featureSelector Selector for extracting the slice from full state, or "*" for entire state.
 * @param selectors A selector or array of selectors returning a value, Promise, or Observable-like.
 * @param projection Optional function to project intermediate values into a final result.
 *
 * @returns A selector that returns a Promise of a derived value from the state.
 */
function createSelectorAsync<T = any, U = any>(
  featureSelector: ((state: any) => T | undefined) | "*",
  selectors: SelectorFunction | SelectorFunction[],
  projectionOrOptions?: ProjectionFunction
): (props?: any[] | any, projectionProps?: any) => (state: any) => Promise<U | undefined> {

  const isSelectorArray = Array.isArray(selectors);
  const projection = typeof projectionOrOptions === "function" ? projectionOrOptions : undefined;

  return (props?: any[] | any, projectionProps?: any) => {
    return async (state: any): Promise<U | undefined> => {
      const sliceState = featureSelector === "*" ? state : featureSelector(state);
      if (sliceState === undefined) return undefined;

      try {
        if (isSelectorArray) {
          const results = await Promise.all(
            selectors.map((selector, i) => selector(sliceState, props?.[i]))
          );
          if (results.some(r => r === undefined)) return undefined;
          return projection!(results, projectionProps);
        } else {
          const result = await selectors(sliceState);
          return result === undefined
            ? undefined
            : projection
              ? projection(result, projectionProps)
              : result;
        }
      } catch (error: any) {
        console.warn("Async selector error:", error.message);
        return undefined;
      }
    };
  };
}
