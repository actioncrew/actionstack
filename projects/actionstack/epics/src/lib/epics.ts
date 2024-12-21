import {
  Action,
  action,
  createInstruction,
  ExecutionStack,
  isAction,
  MainModule,
  Observer,
  Store,
  StoreSettings,
  StoreEnhancer,
} from '@actionstack/store';
import { Observable } from 'rxjs/internal/Observable';
import { Subject } from 'rxjs/internal/Subject';
import { Subscription } from 'rxjs/internal/Subscription';

/**
 * Type alias for an epic function.
 *
 * Epics are functions that can perform actions outside the core Actionstack dispatch cycle, such as:
 *  - Making network requests
 *  - Logging data
 *  - Persisting state to local storage
 * This type defines the expected signature for the epic function.
 *
 * @param {Observable<Action<any>>} action - An observable of the dispatched action object.
 * @param {Observable<any>} state - An observable of the current application state.
 * @param {Record<string, any>} dependencies - A record object containing any additional dependencies required by the epic.
 * @returns {Observable<Action<any>>} - An observable that emits new action objects to be dispatched.
 */
export type Epic = (action: Observable<Action<any>>, state: Observable<any>, dependencies: Record<string, any>) => Observable<Action<any>>;

/**
 * Concatenates multiple source Observables sequentially.
 *
 * @param {ExecutionStack} stack - The execution stack to track operation states.
 * @param {...Epic[]} sources - The source Observables (epics) to concatenate.
 * @returns {(action: Observable<Action<any>>, state: Observable<any>, dependencies: any) => Observable<Action<any>>}
 *   A function that returns an Observable which emits values from the source Observables in order as they are concatenated.
 */
function concat(stack: ExecutionStack, ...sources: Epic[]): (action: Observable<Action<any>>, state: Observable<any>, dependencies: any) => Observable<Action<any>> {
  return (action$: Observable<Action<any>>, state$: Observable<any>, dependencies: any) => {
    return new Observable<Action<any>>(subscriber => {
      let index = 0;
      let subscription: Subscription | null = null;

      const next = () => {
        if (subscriber.closed) {
          return;
        }

        if (index < sources.length) {
          const source = sources[index++];
          let effect = createInstruction.epic(source);
          stack.add(effect);
          subscription = source(action$, state$, dependencies).subscribe({
            next: value => subscriber.next(Object.assign({}, value, { source: effect })),
            error: error => {
              subscriber.error(error);
              stack.remove(effect);
            },
            complete: () => {
              subscription = null;
              stack.remove(effect);
              next();
            }
          });
        } else {
          subscriber.complete();
        }
      };

      next();

      return () => {
        // Unsubscribe if a source Observable is currently being subscribed to
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    });
  };
}

/**
 * Combines multiple source Observables into one Observable that emits all the values from each of the source Observables.
 *
 * @param {ExecutionStack} stack - The execution stack to track operation states.
 * @param {...Epic[]} sources - The source Observables (epics) to merge.
 * @returns {(action: Observable<Action<any>>, state: Observable<any>, dependencies: any) => Observable<Action<any>>}
 *   A function that returns an Observable which emits all the values from the source Observables.
 */
function merge(stack: ExecutionStack, ...sources: Epic[]): (action: Observable<Action<any>>, state: Observable<any>, dependencies: any) => Observable<Action<any>> {
  return (action$: Observable<Action<any>>, state$: Observable<any>, dependencies: any) => {
    return new Observable<Action<any>>(subscriber => {
      let completedCount = 0;
      let subscriptions: Subscription[] = [];

      const completeIfAllCompleted = () => {
        if (++completedCount === sources.length) {
          subscriber.complete();
        }
      };

      sources.forEach(source => {
        let effect = createInstruction.epic(source);
        stack.add(effect);
        const subscription = source(action$, state$, dependencies).subscribe({
          next: value => subscriber.next(Object.assign({}, value, { source: effect })),
          error: error => {
            // Unsubscribe from all source Observables when an error occurs
            if (subscriptions.length) {
              subscriptions.forEach(subscription => subscription.unsubscribe());
              subscriptions = [];
            }
            subscriber.error(error);
            stack.remove(effect);
          },
          complete: () => {
            stack.remove(effect);
            completeIfAllCompleted();
          }
        });

        subscriptions.push(subscription);
      });

      return () => {
        // Unsubscribe from all source Observables when the resulting Observable is unsubscribed
        if (subscriptions.length) {
          subscriptions.forEach(subscription => subscription.unsubscribe());
          subscriptions = [];
        }
      };
    });
  };
}

/**
 * Creates an RxJS operator function that filters actions based on their type.
 *
 * @param {string | string[]} types - A variable number of strings representing the action types to filter by.
 * @returns {(source: Observable<Action<any>>) => Observable<Action<any>>} - An RxJS operator function that filters actions.
 */
export function ofType(types: string | string[]): (source: Observable<Action<any>>) => Observable<Action<any>> {
  return (source: Observable<Action<any>>) => {
    return new Observable<Action<any>>(observer => {
      const subscription = source.subscribe({
        next: (action) => {
          if (isAction(action)) {
            if (typeof types === 'string') {
              if (types === action.type) {
                observer.next(action);
              }
            } else {
              if (types.includes(action.type)) {
                observer.next(action);
              }
            }
          }
        },
        error: (err) => observer.error(err),
        complete: () => observer.complete()
      });

      return () => {
        subscription.unsubscribe();
      };
    });
  };
}

/**
 * Creates middleware for handling epics.
 *
 * @returns {Function} - Middleware function for handling epics.
 */
export const createEpicsMiddleware = () => {
  let activeEpics: Epic[] = [];
  let currentAction = new Subject<Action<any>>();
  let currentState = new Subject<any>();
  let subscriptions: Subscription[] = [];

  return ({ dispatch, getState, dependencies, strategy, stack }: any) => (next: any) => async (action: any) => {
    // Proceed to the next action
    const result = await next(action);

    if (action.type === 'RUN_ENTITIES' || action.type === 'STOP_ENTITIES') {
      if (action.type === 'RUN_ENTITIES') {
        action.payload.epics.forEach((epic: Epic) => {
          if (!activeEpics.includes(epic)) {
            activeEpics.push(epic);
          }
        });
      } else if (action.type === 'STOP_ENTITIES') {
        action.payload.epics.forEach((epic: Epic) => {
          const epicIndex = activeEpics.indexOf(epic);
          if (epicIndex !== -1) {
            activeEpics.splice(epicIndex, 1);
          }
        });
      }

      // Unsubscribe from the previous subscription if it exists
      if (subscriptions.length) {
        subscriptions[0].unsubscribe();
        subscriptions.shift();
      }

      let subscription: Subscription;
      // Create a new subscription
      subscription = currentAction.pipe(
        () => (strategy === "concurrent" ? merge : concat)(stack, ...activeEpics)(currentAction, currentState, dependencies())
      ).subscribe({
        next: (childAction: any) => {
          if (isAction(childAction)) {
            dispatch(childAction);
          }
        },
        error: (err: any) => {
          console.warn("Error in epic:", err);
          if (subscription) {
            subscription.unsubscribe();
            subscriptions = subscriptions.filter(item => item === subscription);
          }
        },
        complete: () => {
          if (subscription) {
            subscription.unsubscribe();
            subscriptions = subscriptions.filter(item => item === subscription);
          }
        }
      });

      subscriptions.push(subscription);
    }

    currentAction.next(action);
    currentState.next(getState());

    return result;
  };
};

/**
 * Middleware for handling epics.
 */
export const epics = createEpicsMiddleware();

/**
 * Action creator for adding epics.
 *
 * @param {...Epic[]} epics - The epics to add.
 * @returns {Action<any>} - The action object.
 */
export const run = action("RUN_ENTITIES", (...epics: Epic[]) => ({ epics }));

/**
 * Action creator for removing epics.
 *
 * @param {...Epic[]} epics - The epics to remove.
 * @returns {Action<any>} - The action object.
 */
export const stop = action("STOP_ENTITIES", (...epics: Epic[]) => ({ epics }));

/**
 * A store enhancer that extends the store with support for epics.
 *
 * @param {Function} createStore - A function used to create the base store.
 * @returns {Function} - A function that takes the main module, optional settings, and an optional enhancer,
 * and returns an enhanced store with epic capabilities.
 */
export const storeEnhancer: StoreEnhancer = (createStore) => (module: MainModule, settings?: StoreSettings, enhancer?: StoreEnhancer): EpicStore => {
  const store = createStore(module, settings, enhancer) as EpicStore;

  /**
   * Spawns the given epics.
   *
   * @template U
   * @param {...Epic[]} epics - The epics to be added to the store.
   * @returns {Observable<U>} - An observable that completes when the epics are removed.
   */
  store.spawn = <U>(...epics: Epic[]): Observable<U> => {
    const effects$ = new Observable<U>((subscriber: Observer<U>) => {
      return () => {
        store.dispatch(stop(epics));
      }
    });

    store.dispatch(run(epics));
    return effects$;
  };

  return store;
}

/**
 * An abstract class for the epic store.
 *
 * @extends {Store}
 */
export type EpicStore = Store & {
  /**
   * Abstract method to spawn the epics.
   *
   * @template U
   * @param {...Epic[]} epics - The epics to be added to the store.
   * @returns {Observable<U>} - An observable that completes when the epics are removed.
   */
  spawn<U>(...epics: Epic[]): Observable<U>;
}
