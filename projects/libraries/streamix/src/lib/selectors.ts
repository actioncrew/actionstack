import { Observable } from 'rxjs/internal/Observable';
import { Subscription } from 'rxjs/internal/Subscription';

import { Tracker } from './tracker';
import { EMPTY, Observer, ProjectionFunction, SelectorFunction } from './types';

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
 * Creates a selector function that extracts a nested property from a state object
 * using a path of string keys.
 *
 * @template T - The type of the root state.
 * @template P - A string array representing the path to the desired slice.
 *
 * @param {P} slice - An array of string keys representing the path to the feature slice.
 *
 * @returns {(state$: Observable<T>) => Observable<ValueAtPath<T, P>>}
 *   A function that takes a state observable and returns an observable of the selected slice.
 *
 * @example
 * ```ts
 * type State = {
 *   user: { profile: { name: string } };
 *   todos: { title: string }[];
 * };
 *
 * const selectUserName = createFeatureSelector<State, ['user', 'profile', 'name']>(['user', 'profile', 'name']);
 * // Observable<string>
 * ```
 */
/**
 * Creates a selector function that extracts a nested property from a state object,
 * using either a single key or a path of string keys.
 *
 * @template T - The type of the root state.
 * @template P - A key of T or a string[] representing a nested path.
 *
 * @param {P} slice - A key of the state or an array of string keys for nested selection.
 *
 * @returns {(state$: Observable<T>) => Observable<any>}
 *   A function that takes a state observable and returns an observable of the selected slice.
 *
 * @example
 * ```ts
 * type State = {
 *   user: { name: string };
 *   todos: { title: string }[];
 * };
 *
 * // Single key:
 * const selectUser = createFeatureSelector<State, 'user'>('user');
 * // Observable<{ name: string }>
 *
 * // Path to nested value:
 * const selectFirstTodoTitle = createFeatureSelector<State, ['todos', '0', 'title']>(['todos', '0', 'title']);
 * // Observable<string>
 * ```
 */
export function createFeatureSelector<
  T = any,
  P extends keyof T | readonly string[] = keyof T
>(
  slice: P
): (state$: Observable<T>) => Observable<
  (P extends keyof T
    ? T[P]
    : P extends readonly string[]
      ? ValueAtPath<T, P>
      : unknown) | undefined
> {
  type Result =
    (P extends keyof T
      ? T[P]
      : P extends readonly string[]
        ? ValueAtPath<T, P>
        : unknown) | undefined;

  let lastValue: Result;

  return (state$: Observable<T>) =>
    new Observable<Result>(subscriber => {
      const subscription = state$.subscribe(state => {
        let selectedValue: Result;

        if (Array.isArray(slice)) {
          selectedValue = slice.reduce<any>((acc, key) => acc?.[key], state);
        } else {
          selectedValue = state[slice as keyof T] as Result;
        }

        if (selectedValue !== lastValue) {
          lastValue = selectedValue;
          subscriber.next(selectedValue);
        }
      });

      return () => subscription.unsubscribe();
    });
}

/**
 * Creates a selector function for composing smaller selectors and projecting their results.
 *
 * This function is generic, allowing you to specify the types of:
 * - `T`: the full state object type,
 * - `U`: the selected feature slice type,
 * - `R`: the resulting projected type.
 *
 * @template U The selected feature slice type
 * @template T The resulting projected output type
 *
 * @param {(state$: Observable<any>) => Observable<T | undefined> | "@global"} featureSelector$
 *   Either a selector function that extracts a feature slice observable from the full state observable,
 *   or the string "@global" to indicate the entire state observable should be used.
 *
 * @param {SelectorFunction | SelectorFunction[]} selectors
 *   Either a single selector function or an array of selector functions.
 *   Each selector takes the state slice and optional props and returns a value.
 *
 * @param {ProjectionFunction | undefined} [projectionOrOptions]
 *   A projection function that takes the array of selector results and optional projection props and returns the final projected result,
 *   or an options object (not currently implemented).
 *
 * @returns {(props?: any[] | any, projectionProps?: any) => (state$: Observable<any>) => Observable<U | undefined>}
 *   A function that takes optional props and projection props, returning a function that takes the state observable
 *   and returns an observable of the projected data.
 */
function createSelector<T = any, U = any>(
  featureSelector$: ((state: Observable<any>) => Observable<T | undefined>) | "@global",
  selectors: SelectorFunction | SelectorFunction[],
  projectionOrOptions?: ProjectionFunction
): (props?: any[] | any, projectionProps?: any) => (state$: Observable<any>) => Observable<U | undefined> {

  const isSelectorArray = Array.isArray(selectors);
  const projection = typeof projectionOrOptions === "function" ? projectionOrOptions : undefined;

  if (isSelectorArray && !projection) {
    console.warn("Invalid parameters: When 'selectors' is an array, 'projection' function should be provided.");
    return () => () => EMPTY;
  }

  return (props?: any[] | any, projectionProps?: any) => {
    if (Array.isArray(props) && Array.isArray(selectors) && props.length !== selectors.length) {
      console.warn("Not all selectors are parameterized. The number of props does not match the number of selectors.");
      return () => EMPTY;
    }

    let lastSliceState: any;

    return (state$: Observable<any>) => {
      return new Observable<U | undefined>((observer) => {
        const sliceState$: Observable<U | undefined> =
          featureSelector$ === "@global"
            ? (state$ as Observable<any>)
            : featureSelector$(state$);

        const subscription = sliceState$.subscribe((sliceState) => {
          if (sliceState === undefined) {
            observer.next(undefined);
            return;
          }

          if (lastSliceState === sliceState) return;
          lastSliceState = sliceState;

          try {
            if (isSelectorArray) {
              const results = selectors.map((selector, i) =>
                selector(sliceState, props?.[i])
              );

              if (results.some((r) => r === undefined)) {
                observer.next(undefined);
                return;
              }

              observer.next(projection!(results, projectionProps));
            } else {
              const result = selectors(sliceState, props);
              if (result === undefined) {
                observer.next(undefined);
              } else {
                observer.next(projection ? projection(result, projectionProps) : result);
              }
            }
          } catch (error: any) {
            console.warn("Error during selector execution:", error.message);
            observer.error(error);
          }
        });

        return () => subscription.unsubscribe();
      });
    };
  };
}


/**
 * Creates a selector function for composing smaller selectors and projecting their results,
 * handling asynchronous operations within selector functions.
 *
 * This function is similar to `createSelector` but supports selector functions
 * that return Promises or Observables, allowing for async computations.
 *
 * @template U The selected feature slice type
 * @template T The resulting projected output type
 *
 * @param {(state$: Observable<any>) => Observable<T | undefined> | "@global"} featureSelector$
 *   Either a selector function that extracts a feature slice observable from the full state observable,
 *   or the string "@global" to indicate the entire state observable should be used.
 *
 * @param {SelectorFunction | SelectorFunction[]} selectors
 *   Either a single selector function or an array of selector functions.
 *   Each selector takes the state slice and optional props and returns a value, Promise, or Observable.
 *
 * @param {ProjectionFunction | undefined} [projectionOrOptions]
 *   A projection function that takes the array of selector results and optional projection props and returns the final projected result,
 *   or an options object (not currently implemented).
 *
 * @returns {(props?: any[] | any, projectionProps?: any) => (state$: Observable<any>) => Observable<U | undefined>}
 *   A function that takes optional props and projection props, returning a function that takes the state observable
 *   and returns an observable of the projected data.
 */
function createSelectorAsync<T = any, U = any>(
  featureSelector$: ((state: Observable<any>) => Observable<T | undefined>) | "@global",
  selectors: SelectorFunction | SelectorFunction[],
  projectionOrOptions?: ProjectionFunction
): (props?: any[] | any, projectionProps?: any) => (state$: Observable<T>) => Observable<U | undefined> {

  const isSelectorArray = Array.isArray(selectors);
  const projection = typeof projectionOrOptions === "function" ? projectionOrOptions : undefined;

  if (isSelectorArray && !projection) {
    console.warn("Invalid parameters: When 'selectors' is an array, a 'projection' function should be provided.");
    return () => () => EMPTY;
  }

  return (props?: any[] | any, projectionProps?: any) => {
    if (Array.isArray(props) && isSelectorArray && props.length !== selectors.length) {
      console.warn("The number of 'props' does not match the number of selectors.");
      return () => EMPTY;
    }

    let lastSliceState: any;

    return (state$: Observable<any>) => {
      return new Observable<U | undefined>((observer) => {
        let unsubscribed = false;

        const runSelectors = async (sliceState: any) => {
          if (sliceState === undefined || sliceState === lastSliceState) return;
          lastSliceState = sliceState;

          try {
            if (isSelectorArray) {
              const results = await Promise.all(
                selectors.map((selector, i) => selector(sliceState, props?.[i]))
              );

              if (unsubscribed) return;
              if (results.some(r => r === undefined)) {
                observer.next(undefined);
              } else {
                observer.next(projection!(results, projectionProps));
              }

            } else {
              const result = await selectors(sliceState, props);
              if (unsubscribed) return;

              observer.next(
                result === undefined
                  ? undefined
                  : projection
                    ? projection(result, projectionProps)
                    : result
              );
            }
          } catch (error: any) {
            if (!unsubscribed) {
              console.warn("Error during selector execution:", error.message);
              observer.error(error);
            }
          }
        };

        const sliceState$: Observable<T | undefined> =
          featureSelector$ === "@global"
            ? (state$ as unknown as Observable<T | undefined>)
            : featureSelector$(state$);

        const subscription = sliceState$.subscribe({
          next: runSelectors,
          error: (err: any) => {
            if (!unsubscribed) {
              console.warn("Error in state stream:", err?.message || err);
              observer.error(err);
            }
          },
          complete: () => {
            if (!unsubscribed) {
              observer.complete();
            }
          },
        });

        return () => {
          unsubscribed = true;
          subscription.unsubscribe();
        };
      });
    };
  };
}
