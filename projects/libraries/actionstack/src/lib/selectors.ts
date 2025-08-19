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
 * @param selectors A selector or array of selectors for extracting intermediate values.
 * @param projection Optional function to project intermediate values into a final result.
 *
 * @returns A selector that computes a derived value from the slice using the specified selectors.
 */
function createSelector<T = any, U = any>(
  selectors: SelectorFunction | SelectorFunction[],
  projection?: ProjectionFunction
): (props?: any[] | any) => (state: T) => U | undefined {
  const isSelectorArray = Array.isArray(selectors);

  return (props?: any[] | any) => {
    return (state: T) => {
      try {
        if (state === undefined) {
          return state;
        }
        if (isSelectorArray) {
          const results = (selectors as SelectorFunction[]).map((sel, i) =>
            sel(state, props?.[i])
          );
          if (results.some(r => r === undefined)) return undefined;
          return projection ? projection(results, props) : results as any;
        } else {
          const result = (selectors as SelectorFunction)(state, props);
          return result === undefined ? undefined : (projection ? projection(result) : result);
        }
      } catch (err) {
        console.warn('Selector error:', (err as Error).message);
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
 * @param selectors A selector or array of selectors returning a value, Promise, or Observable-like.
 * @param projection Optional function to project intermediate values into a final result.
 *
 * @returns A selector that returns a Promise of a derived value from the state.
 */
export function createSelectorAsync<T = any, U = any>(
  selectors: SelectorFunction | SelectorFunction[],
  projection?: ProjectionFunction
): (props?: any[] | any) => (state: T) => Promise<U | undefined> {
  const isSelectorArray = Array.isArray(selectors);

  return (props?: any[] | any) => {
    return async (state: T) => {
      try {
        if (state === undefined) {
          return state;
        }
        if (isSelectorArray) {
          const results = await Promise.all(
            (selectors as SelectorFunction[]).map((sel, i) =>
              sel(state, props?.[i])
            )
          );
          if (results.some(r => r === undefined)) return undefined;
          return projection ? await projection(results, props) : results as any;
        } else {
          const result = await (selectors as SelectorFunction)(state, props);
          if (result === undefined) return undefined;
          return projection ? await projection(result, props) : result;
        }
      } catch (err) {
        console.warn('Async selector error:', (err as Error).message);
        return undefined;
      }
    };
  };
}
