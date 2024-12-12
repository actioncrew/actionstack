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
 * Creates a selector function that selects a specific feature slice from a larger state object.
 *
 * This function is generic, allowing you to specify the types of the state object (T) and the selected feature data (U).
 *
 * @param slice - This can be either:
 *                 * A string key representing the property name of the feature slice within the state object.
 *                 * An array of strings representing a path of keys to navigate within the state object to reach the desired feature slice.
 * @returns A function that takes an Observable of the entire state object and returns an Observable of the selected feature data.
 */
function createFeatureSelector<U = any, T = any> (
  slice: keyof T | string[]
): (state$: Observable<T>) => Observable<U> {
  let lastValue: U | undefined;
  return (source: Observable<T>) => new Observable<U>(subscriber => {
    subscriber.next(lastValue!);
    const subscription = source.subscribe((state: T) => {
      const selectedValue = (Array.isArray(slice)
      ? slice.reduce((acc, key) => (acc && Array.isArray(acc) ? acc[parseInt(key)] : (acc as any)[key]) || undefined, state)
      : state && state[slice]) as unknown as U;
      lastValue = selectedValue;
      subscriber.next(selectedValue);
    });

    return () => subscription.unsubscribe();
  });
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
 * @returns A function that takes optional props and projection props as arguments and returns another function that takes the state observable as input and returns an observable of the projected data.
 */
function createSelector<U = any, T = any>(
  featureSelector$: ((state: Observable<T>) => Observable<U>) | "@global",
  selectors: SelectorFunction | SelectorFunction[],
  projectionOrOptions?: ProjectionFunction
): (props?: any[] | any, projectionProps?: any) => (state$: Observable<T>, tracker?: Tracker) => Observable<U> {

  const isSelectorArray = Array.isArray(selectors);
  const projection = typeof projectionOrOptions === "function" ? projectionOrOptions : undefined;

  if (isSelectorArray && !projection) {
    console.warn("Invalid parameters: When 'selectors' is an array, 'projection' function should be provided.");
    return () => () => EMPTY;
  }

  return (props?: any[] | any, projectionProps?: any) => {
    if(Array.isArray(props) && Array.isArray(selectors) && props.length !== selectors.length) {
      console.warn('Not all selectors are parameterized. The number of props does not match the number of selectors.');
      return () => EMPTY;
    }

    let lastSliceState: any, emitted = false;
    return (state$: Observable<T>, tracker?: Tracker) => {
      const trackable = new Observable<U>((observer: Observer<U | undefined>) => {
        let sliceState$: Observable<U>;
        if (featureSelector$ === "@global") {
          sliceState$ = state$ as any;
        } else {
          sliceState$ = (featureSelector$ as Function)(state$);
        }

        const subscription: Subscription = sliceState$.subscribe(sliceState => {
          if (sliceState === undefined) {
            observer.next(undefined);
          } else if (lastSliceState !== sliceState) {
            lastSliceState = sliceState;
            let selectorResults: U[] | U;
            try {
              if (Array.isArray(selectors)) {
                selectorResults = selectors.map((selector, index) => selector(sliceState, props[index]));

                // Check if any result is undefined and emit undefined immediately
                if (selectorResults.some(result => result === undefined)) {
                  subscription.unsubscribe(); // Unsubscribe immediately to prevent further emissions
                  observer.next(undefined);
                } else {
                  // If all results are defined, continue with projection or emit results directly
                  observer.next(projection ? projection(selectorResults, projectionProps) : selectorResults);
                }
              } else {
                selectorResults = selectors && selectors(sliceState, props);

                if (selectorResults === undefined) {
                  observer.next(undefined);
                } else {
                  observer.next(projection ? projection(projectionProps) : selectorResults);
                }
              }
            } catch(error: any) {
              console.warn("Error during selector execution:", error.message);
            }
          }
        }, error => tracker?.setStatus(trackable, true), () => tracker?.setCompletion(trackable));

        return () => subscription.unsubscribe();
      });

      tracker?.setStatus(trackable, true);
      return trackable as Observable<U>;
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
 *                    * A single selector function that takes the state slice and optional props as arguments and can return a Promise or Observable.
 *                    * An array of selector functions, each taking the state slice and a corresponding prop (from props argument) as arguments and can return a Promise or Observable.
 * @param projectionOrOptions - This can be either:
 *                             * A projection function that takes an array of results from the selector(s) and optional projection props as arguments and returns the final result.
 *                             * An options object (not currently implemented).
 * @returns A function that takes optional props and projection props as arguments and returns another function that takes the state observable as input and returns an observable of the projected data.
 */
function createSelectorAsync<U = any, T = any>(
  featureSelector$: ((state: Observable<T>) => Observable<U>) | "@global",
  selectors: SelectorFunction | SelectorFunction[],
  projectionOrOptions?: ProjectionFunction
): (props?: any[] | any, projectionProps?: any) => (state$: Observable<T>, tracker?: Tracker) => Observable<U> {

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
    return (state$: Observable<T>, tracker?: Tracker) => {
      const trackable = new Observable<U>((observer: Observer<U>) => {

        let unsubscribed = false;
        let didCancel = false;

        const runSelectors = async (sliceState: any) => {
          if (sliceState === undefined) {
            observer.next(undefined as any);
            return;
          }

          if (lastSliceState === sliceState) {
            return;
          } else {
            lastSliceState = sliceState;
          }

          let selectorResults: U[] | U;

          try {
            if (Array.isArray(selectors)) {
              const promises = selectors.map(async (selector, index) => {
                if (unsubscribed || didCancel) {
                  return;
                }
                return selector(sliceState, props ? props[index] : undefined);
              });

              selectorResults = await Promise.all(promises);

              if (unsubscribed || didCancel) {
                return;
              }

              const isUndefined = selectorResults.some(result => result === undefined);

              observer.next(
                isUndefined
                  ? undefined
                  : projection
                    ? projection(selectorResults as U[], projectionProps)
                    : selectorResults
              );
            } else {
              selectorResults = await selectors(sliceState, props);

              if (unsubscribed || didCancel) {
                return;
              }

              observer.next(
                selectorResults === undefined
                  ? undefined
                  : projection
                    ? projection(selectorResults, projectionProps)
                    : selectorResults
              );
            }
          } catch (error: any) {
            if (!unsubscribed && !didCancel) {
              console.warn("Error during selector execution:", error.message);
            }
          }
        };

        const subscription = (featureSelector$ === "@global" ? state$ : (featureSelector$(state$)) as any).subscribe({
          next: (sliceState: any) => {
            runSelectors(sliceState);
            tracker?.setStatus(trackable, true);
          },
          error: (error: any) => {
            if (!unsubscribed && !didCancel) {
              console.warn("Error during selector execution:", error.message);
              tracker?.setStatus(trackable, true);
            }
          },
          complete: () => {
            if (!unsubscribed && !didCancel) {
              tracker?.setCompletion(trackable);
              observer.complete();
            }
          },
        });

        return () => {
          unsubscribed = true;
          subscription.unsubscribe();
        };
      });

      return trackable;
    };
  };
}
