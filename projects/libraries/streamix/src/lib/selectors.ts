import { EMPTY, Stream, createSubject, eachValueFrom } from '@actioncrew/streamix';
import { Tracker } from './tracker';
import { ProjectionFunction, SelectorFunction } from './types';

export {
  createFeatureSelector as featureSelector,
  createSelector as selector,
  createSelectorAsync as selectorAsync
};

/**
 * Creates a selector function that selects a specific feature slice from a larger state object.
 *
 * This function is generic, allowing you to specify the types of the state object (T) and the selected feature data (U).
 *
 * @param slice - This can be either:
 *                 * A string key representing the property name of the feature slice within the state object.
 *                 * An array of strings representing a path of keys to navigate within the state object to reach the desired feature slice.
 * @returns A function that takes a Stream of the entire state object and returns a Stream of the selected feature data.
 */
export function createFeatureSelector<U = any, T = any>(
  slice: keyof T | string[]
): (state$: Stream<T>) => Stream<U> {
  let lastValue: U | undefined;

  return (source: Stream<T>) => {
    const outputStream = createSubject<U>();

    // Emit the last value immediately
    outputStream.next(lastValue!);

    const subscription = source.subscribe({
      next: (state: T) => {
        const selectedValue = (Array.isArray(slice)
          ? slice.reduce((acc, key) => {
              return (acc && Array.isArray(acc) ? acc[parseInt(key)] : (acc as any)[key]);
            }, state)
          : state && state[slice]) as unknown as U;

        lastValue = selectedValue;
        outputStream.next(selectedValue);
      },
      error: (err) => outputStream.error(err),
      complete: () => {
        outputStream.complete();
        subscription.unsubscribe();
      },
    });

    return outputStream;
  };
}

/**
 * Creates a selector function for composing smaller selectors and projecting their results.
 *
 * This function is generic, allowing you to specify the types of the state object (T) and the selected feature data (U).
 *
 * @param featureSelector$ - This can be either:
 *                             * A selector function that retrieves a slice of the state based on the entire state object.
 *                             * The string "*" indicating the entire state object should be used.
 * @param selectors - This can be either:
 *                    * A single selector function that takes the state slice and optional props as arguments.
 *                    * An array of selector functions, each taking the state slice and a corresponding prop (from props argument) as arguments.
 * @param projectionOrOptions - This can be either:
 *                             * A projection function that takes an array of results from the selector(s) and optional projection props as arguments and returns the final result.
 *                             * An options object (not currently implemented).
 * @returns A function that takes optional props and projection props as arguments and returns another function that takes the state Stream as input and returns a Stream of the projected data.
 */
export function createSelector<
  FeatureState = any,
  RootState = any,
  Result = any
>(
  featureSelector$: ((state: Stream<RootState>) => Stream<FeatureState | undefined>) | "*",
  selectors: SelectorFunction<FeatureState, any>[] | SelectorFunction<FeatureState, any>,
  projection?: ProjectionFunction<Result, any>
): (
  props?: any[] | any,
  projectionProps?: any
) => (
  state$: Stream<RootState>,
  tracker?: Tracker
) => Stream<Result | undefined> {
  const isSelectorArray = Array.isArray(selectors);

  if (isSelectorArray && typeof projection !== "function") {
    console.warn("When passing multiple selectors, a projection function is required.");
    return () => () => EMPTY;
  }

  return (props?: any[] | any, projectionProps?: any) => {
    if (isSelectorArray && Array.isArray(props) && props.length !== selectors.length) {
      console.warn("Mismatch: number of props doesn't match number of selectors.");
      return () => EMPTY;
    }

    return (state$: Stream<RootState>, tracker?: Tracker): Stream<Result | undefined> => {
      const output = createSubject<Result | undefined>();
      let lastSliceState: FeatureState | undefined;

      (async () => {
        const sliceState$: Stream<FeatureState | undefined> =
          featureSelector$ === "*" ? (state$ as any) : featureSelector$(state$);

        for await (const sliceState of eachValueFrom(sliceState$)) {
          if (sliceState === undefined) {
            output.next(undefined);
            continue;
          }

          if (lastSliceState === sliceState) {
            continue;
          }

          lastSliceState = sliceState;

          try {
            if (isSelectorArray) {
              const results = await Promise.all(
                (selectors as SelectorFunction<FeatureState, any>[]).map((fn, i) =>
                  fn(sliceState, Array.isArray(props) ? props[i] : undefined)
                )
              );

              if (results.some(r => r === undefined)) {
                output.next(undefined);
              } else {
                output.next(projection!(results, projectionProps));
              }
            } else {
              const result = await (selectors as SelectorFunction<FeatureState, any>)(sliceState, props);
              output.next(
                result === undefined
                  ? undefined
                  : projection
                  ? projection([result], projectionProps)
                  : result
              );
            }

            tracker?.setStatus(output, true);
          } catch (err: any) {
            console.warn("Selector error:", err.message);
            output.next(undefined);
          }
        }

        tracker?.complete(output);
      })();

      return output;
    };
  };
}

/**
 * Creates a selector function for composing smaller selectors and projecting their results, handling asynchronous operations within selectors.
 *
 * This function is similar to `createSelector` but allows asynchronous operations within the selector functions.
 *
 * @param featureSelector$ - This can be either:
 *                             * A selector function that retrieves a slice of the state based on the entire state object.
 *                             * The string "*" indicating the entire state object should be used.
 * @param selectors - This can be either:
 *                    * A single selector function that takes the state slice and optional props as arguments and can return a Promise or Stream.
 *                    * An array of selector functions, each taking the state slice and a corresponding prop (from props argument) as arguments and can return a Promise or Stream.
 * @param projectionOrOptions - This can be either:
 *                             * A projection function that takes an array of results from the selector(s) and optional projection props as arguments and returns the final result.
 *                             * An options object (not currently implemented).
 * @returns A function that takes optional props and projection props as arguments and returns another function that takes the state Stream as input and returns a Stream of the projected data.
 */
export function createSelectorAsync<
  FeatureState = any,
  RootState = any,
  Result = any
>(
  featureSelector$: ((state: Stream<RootState>) => Stream<FeatureState | undefined>) | "*",
  selectors: SelectorFunction<FeatureState, any>[] | SelectorFunction<FeatureState, any>,
  projection?: ProjectionFunction<Result, any>
): (
  props?: any[] | any,
  projectionProps?: any
) => (
  state$: Stream<RootState>,
  tracker?: Tracker
) => Stream<Result | undefined> {
  const isSelectorArray = Array.isArray(selectors);

  if (isSelectorArray && typeof projection !== "function") {
    console.warn("When using an array of selectors, a projection function must be provided.");
    return () => () => EMPTY;
  }

  return (props?: any[] | any, projectionProps?: any) => {
    if (isSelectorArray && Array.isArray(props) && props.length !== selectors.length) {
      console.warn("The number of props does not match the number of selectors.");
      return () => EMPTY;
    }

    return (state$: Stream<RootState>, tracker?: Tracker): Stream<Result | undefined> => {
      const output = createSubject<Result | undefined>();
      let lastSliceState: FeatureState | undefined;

      (async () => {
        const sliceState$: Stream<FeatureState | undefined> =
          featureSelector$ === "*" ? (state$ as any) : featureSelector$(state$);

        for await (const sliceState of eachValueFrom(sliceState$)) {
          if (sliceState === undefined) {
            output.next(undefined);
            continue;
          }

          if (lastSliceState === sliceState) {
            continue;
          }

          lastSliceState = sliceState;

          try {
            if (isSelectorArray) {
              const results = await Promise.all(
                (selectors as SelectorFunction<FeatureState, any>[]).map((fn, i) =>
                  fn(sliceState, Array.isArray(props) ? props[i] : undefined)
                )
              );

              if (results.some(r => r === undefined)) {
                output.next(undefined);
              } else {
                output.next(projection!(results, projectionProps));
              }
            } else {
              const result = await (selectors as SelectorFunction<FeatureState, any>)(sliceState, props);
              output.next(
                result === undefined
                  ? undefined
                  : projection
                  ? projection([result], projectionProps)
                  : result
              );
            }

            tracker?.setStatus(output, true);
          } catch (err: any) {
            console.warn("Error during async selector execution:", err.message);
            output.next(undefined);
          }
        }

        tracker?.complete(output);
      })();

      return output;
    };
  };
}
