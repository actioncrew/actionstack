import {
  Action,
  action,
  createInstruction,
  ExecutionStack,
  isAction,
  MainModule,
  Store,
  StoreSettings,
  StoreEnhancer,
} from 'streamix';
import { Emission, Operator, Stream, createEmission, createOperator, createSemaphore, createStream, createSubject } from '@actioncrew/streamix';

/**
 * Type alias for an epic function.
 *
 * Epics are functions that can perform actions outside the core Actionstack dispatch cycle, such as:
 *  - Making network requests
 *  - Logging data
 *  - Persisting state to local storage
 * This type defines the expected signature for the epic function.
 *
 * @param {Stream<Action<any>>} action - A stream of dispatched action objects.
 * @param {Stream<any>} state - A stream of the current application state.
 * @param {Record<string, any>} dependencies - A record object containing any additional dependencies required by the epic.
 * @returns {Stream<Action<any>>} - A stream that emits new action objects to be dispatched.
 */
export type Epic = (
  action: Stream<Action<any>>,
  state: Stream<any>,
  dependencies: Record<string, any>
) => Stream<Action<any>>;

/**
 * Concatenates multiple source streams sequentially.
 *
 * @param {ExecutionStack} stack - The execution stack to track operation states.
 * @param {...Epic[]} sources - The source streams (epics) to concatenate.
 * @returns {(action: Stream<Action<any>>, state: Stream<any>, dependencies: any) => Stream<Action<any>>}
 *   A function that returns a Stream which emits values from the source streams in order as they are concatenated.
 */
export function concat(
  stack: ExecutionStack,
  ...epics: Epic[]
): (action$: Stream<Action>, state$: Stream<any>, dependencies: any) => Stream<Action> {
  return (action$: Stream<Action>, state$: Stream<any>, dependencies: any) => {
    return createStream<Action>("concat", async function* (this: Stream<Action>) {
      for (const epic of epics) {
        const itemAvailable = createSemaphore(0); // Controls when items are available
        const queue: Action[] = []; // Event queue
        let completed = false;

        // Add the epic to the execution stack
        const effect = createInstruction.epic(epic);
        stack.add(effect);

        // Run the epic and subscribe to its output
        const epicStream = epic(action$, state$, dependencies);
        const subscription = epicStream.subscribe({
          next: (value) => {
            queue.push(value);
            itemAvailable.release(); // Signal that an item is available
          },
          complete: () => {
            completed = true; // Mark as completed when the epic finishes
            itemAvailable.release(); // Ensure loop doesn't hang if no values were emitted
            stack.remove(effect); // Remove the epic from the execution stack
          },
          error: (err) => {
            stack.remove(effect); // Remove the epic from the execution stack on error
            throw err; // Propagate the error
          },
        });

        // Process queued values sequentially
        while (!completed || queue.length > 0) {
          await itemAvailable.acquire(); // Wait until an event is available

          if (queue.length > 0) {
            yield createEmission({ value: queue.shift()! });
          }
        }

        subscription.unsubscribe(); // Unsubscribe when done with this epic
      }
    });
  };
}

/**
 * Combines multiple source streams into one Stream that emits all the values from each of the source streams.
 *
 * @param {ExecutionStack} stack - The execution stack to track operation states.
 * @param {...Epic[]} sources - The source streams (epics) to merge.
 * @returns {(action: Stream<Action<any>>, state: Stream<any>, dependencies: any) => Stream<Action<any>>}
 *   A function that returns a Stream which emits all the values from the source streams.
 */
export function merge(
  stack: ExecutionStack,
  ...epics: Epic[]
): (action$: Stream<Action>, state$: Stream<any>, dependencies: any) => Stream<Action> {
  return (action$: Stream<Action>, state$: Stream<any>, dependencies: any) => {
    return createStream<Action>("merge", async function* (this: Stream<Action>) {
      const itemAvailable = createSemaphore(0); // Controls when an item is available
      const queue: Action[] = []; // Event queue
      let completedCount = 0;

      // Add each epic to the execution stack
      const effects = epics.map((epic) => {
        const effect = createInstruction.epic(epic);
        stack.add(effect);
        return effect;
      });

      // Subscribe to each epic and push emissions to the queue
      const subscriptions = epics.map((epic, index) => {
        const epicStream = epic(action$, state$, dependencies);
        return epicStream.subscribe({
          next: (value) => {
            queue.push(value);
            itemAvailable.release(); // Signal availability
          },
          complete: () => {
            completedCount++;
            itemAvailable.release(); // Ensure loop progresses when an epic completes
            stack.remove(effects[index]); // Remove the epic from the execution stack
          },
          error: (err) => {
            stack.remove(effects[index]); // Remove the epic from the execution stack on error
            throw err; // Propagate the error
          },
        });
      });

      // Yield values from the queue as they become available
      while (completedCount < epics.length || queue.length > 0) {
        await itemAvailable.acquire(); // Wait until an event is available

        if (queue.length > 0) {
          yield createEmission({ value: queue.shift()! });
        }
      }

      // Cleanup subscriptions
      subscriptions.forEach((sub) => sub.unsubscribe());
    });
  };
}

/**
 * `ofType` operator filters emissions based on the type of action contained in the emission.
 * It only allows emissions whose `value` is an action and whose `type` matches the provided type(s).
 *
 * @param {string | string[]} types - The action type(s) to match. Can be a single string or an array of strings.
 * @returns {Operator} - The operator that processes each emission.
 *
 * @example
 * const filteredStream = sourceStream.pipe(ofType(['USER_LOGIN', 'USER_LOGOUT']));
 * // Only actions of type 'USER_LOGIN' or 'USER_LOGOUT' will pass through.
 */
export const ofType = <T extends Action<any>>(types: string | string[]): Operator => {
  const handle = (emission: Emission<T>): Emission<T> => {
    const action = emission.value as Action<any>; // Access the actual Action from the Emission

    if (isAction(action)) {
      const matches =
        typeof types === 'string' ? types === action.type : types.includes(action.type);

      // If the action type doesn't match, mark the emission as phantom
      if (!matches) emission.phantom = true;
      else delete emission.phantom; // Clear phantom flag if the action type matches
    } else {
      emission.phantom = true; // If it's not an action, mark it as phantom
    }

    return emission;
  };

  return createOperator('ofType', handle);
};

/**
 * Creates middleware for handling epics.
 *
 * @returns {Function} - Middleware function for handling epics.
 */
export const createEpicsMiddleware = () => {
  let activeEpics: Epic[] = [];
  let currentAction = createSubject<Action<any>>();
  let currentState = createSubject<any>();
  let subscriptions: any[] = [];

  return ({ dispatch, getState, dependencies, strategy, stack }: any) => (next: any) => async (action: any) => {
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

      if (subscriptions.length) {
        subscriptions.forEach(subscription => subscription.unsubscribe());
        subscriptions = [];
      }

      const epicStream = (strategy === 'concurrent' ? merge : concat)(stack, ...activeEpics);
      const subscription = epicStream(currentAction, currentState, dependencies()).subscribe({
        next: (childAction: any) => {
          if (isAction(childAction)) {
            dispatch(childAction);
          }
        },
        error: (err: any) => {
          console.warn('Error in epic:', err);
        },
        complete: () => {
          subscriptions = [];
        },
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
export const run = action('RUN_ENTITIES', (...epics: Epic[]) => ({ epics }));

/**
 * Action creator for removing epics.
 *
 * @param {...Epic[]} epics - The epics to remove.
 * @returns {Action<any>} - The action object.
 */
export const stop = action('STOP_ENTITIES', (...epics: Epic[]) => ({ epics }));

/**
 * A store enhancer that extends the store with support for epics.
 *
 * @param {Function} createStore - A function used to create the base store.
 * @returns {Function} - A function that takes the main module, optional settings, and an optional enhancer,
 * and returns an enhanced store with epic capabilities.
 */
export const storeEnhancer: StoreEnhancer = (createStore) => (module: MainModule, settings?: StoreSettings, enhancer?: StoreEnhancer): EpicStore => {
  const store = createStore(module, settings, enhancer) as EpicStore;

  store.spawn = <U>(...epics: Epic[]): Stream<U> => {
    const effects$ = createStream<U>('spawn', async function* () {
      // Unsubscribe from the epics
      store.dispatch(stop(epics));
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
  spawn<U>(...epics: Epic[]): Stream<U>;
}
