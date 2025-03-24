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
 *                             * The string "@global" indicating the entire state object should be used.
 * @param selectors - This can be either:
 *                    * A single selector function that takes the state slice and optional props as arguments.
 *                    * An array of selector functions, each taking the state slice and a corresponding prop (from props argument) as arguments.
 * @param projectionOrOptions - This can be either:
 *                             * A projection function that takes an array of results from the selector(s) and optional projection props as arguments and returns the final result.
 *                             * An options object (not currently implemented).
 * @returns A function that takes optional props and projection props as arguments and returns another function that takes the state Stream as input and returns a Stream of the projected data.
 */
export function createSelector<U = any, T = any>(
  featureSelector$: ((state: Stream<T>) => Stream<U | undefined>) | "@global",
  selectors: SelectorFunction | SelectorFunction[],
  projectionOrOptions?: ProjectionFunction
): (props?: any[] | any, projectionProps?: any) => (state$: Stream<T>, tracker?: Tracker) => Stream<U | undefined> {

  const isSelectorArray = Array.isArray(selectors);
  const projection = typeof projectionOrOptions === "function" ? projectionOrOptions : undefined;

  if (isSelectorArray && !projection) {
    console.warn("Invalid parameters: When 'selectors' is an array, 'projection' function should be provided.");
    return () => () => EMPTY;
  }

  return (props?: any[] | any, projectionProps?: any) => {
    if (Array.isArray(props) && Array.isArray(selectors) && props.length !== selectors.length) {
      console.warn('Not all selectors are parameterized. The number of props does not match the number of selectors.');
      return () => EMPTY;
    }

    let lastSliceState: any;

    return (state$: Stream<T>, tracker?: Tracker) => {
      const outputStream = createSubject<U | undefined>();

      (async () => {
        let sliceState$: Stream<U>;

        if (featureSelector$ === "@global") {
          sliceState$ = state$ as any;
        } else {
          sliceState$ = (featureSelector$ as Function)(state$);
        }

        for await (const sliceState of eachValueFrom(sliceState$)) {
          if (sliceState === undefined) {
            outputStream.next(undefined);
          } else if (lastSliceState !== sliceState) {
            lastSliceState = sliceState;
            let selectorResults: U[] | U;

            try {
              if (Array.isArray(selectors)) {
                selectorResults = await Promise.all(selectors.map((selector, index) => selector(sliceState, props ? props[index] : undefined)));

                if (selectorResults.some(result => result === undefined)) {
                  outputStream.next(undefined);
                } else {
                  outputStream.next(projection ? projection(selectorResults as U[], projectionProps) : selectorResults);
                }
              } else {
                selectorResults = await selectors(sliceState, props);
                outputStream.next(selectorResults === undefined ? undefined : projection ? projection(selectorResults, projectionProps) : selectorResults);
              }
            } catch (error: any) {
              console.warn("Error during selector execution:", error.message);
              outputStream.next(undefined);
            }
          }

          tracker?.setStatus(outputStream, true);
        }

        tracker?.complete(outputStream);
      })();

      return outputStream;
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
 *                             * The string "@global" indicating the entire state object should be used.
 * @param selectors - This can be either:
 *                    * A single selector function that takes the state slice and optional props as arguments and can return a Promise or Stream.
 *                    * An array of selector functions, each taking the state slice and a corresponding prop (from props argument) as arguments and can return a Promise or Stream.
 * @param projectionOrOptions - This can be either:
 *                             * A projection function that takes an array of results from the selector(s) and optional projection props as arguments and returns the final result.
 *                             * An options object (not currently implemented).
 * @returns A function that takes optional props and projection props as arguments and returns another function that takes the state Stream as input and returns a Stream of the projected data.
 */
export function createSelectorAsync<U = any, T = any>(
  featureSelector$: ((state: Stream<T>) => Stream<U | undefined>) | "@global",
  selectors: SelectorFunction | SelectorFunction[],
  projectionOrOptions?: ProjectionFunction
): (props?: any[] | any, projectionProps?: any) => (state$: Stream<T>, tracker?: Tracker) => Stream<U | undefined> {

  const isSelectorArray = Array.isArray(selectors);
  const projection = typeof projectionOrOptions === "function" ? projectionOrOptions : undefined;

  if (isSelectorArray && !projection) {
    console.warn("Invalid parameters: When 'selectors' is an array, 'projection' function should be provided.");
    return () => () => EMPTY;
  }

  return (props?: any[] | any, projectionProps?: any) => {
    if (Array.isArray(props) && Array.isArray(selectors) && props.length !== selectors.length) {
      console.warn('Not all selectors are parameterized. The number of props does not match the number of selectors.');
      return () => EMPTY;
    }

    let lastSliceState: any;

    return (state$: Stream<T>, tracker?: Tracker) => {
      const outputStream = createSubject<U | undefined>();

      (async () => {
        let sliceState$: Stream<U>;

        if (featureSelector$ === "@global") {
          sliceState$ = state$ as any;
        } else {
          sliceState$ = (featureSelector$ as Function)(state$);
        }

        for await (const sliceState of eachValueFrom(sliceState$)) {
          if (sliceState === undefined) {
            outputStream.next(undefined);
          } else if (lastSliceState !== sliceState) {
            lastSliceState = sliceState;
            let selectorResults: U[] | U;

            try {
              if (Array.isArray(selectors)) {
                const promises = selectors.map((selector, index) => selector(sliceState, props ? props[index] : undefined));
                selectorResults = await Promise.all(promises);

                if (selectorResults.some(result => result === undefined)) {
                  outputStream.next(undefined);
                } else {
                  outputStream.next(projection ? projection(selectorResults as U[], projectionProps) : selectorResults);
                }
              } else {
                selectorResults = await selectors(sliceState, props);
                outputStream.next(selectorResults === undefined ? undefined : projection ? projection(selectorResults, projectionProps) : selectorResults);
              }
            } catch (error: any) {
              console.warn("Error during selector execution:", error.message);
              outputStream.next(undefined);
            }
          }

          tracker?.setStatus(outputStream, true);
        }

        tracker?.complete(outputStream);
      })();

      return outputStream;
    };
  };
}
