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
} from '@actioncrew/actionstack';
import { Operator, Stream, Subscription, createOperator, createStream, createSubject, eachValueFrom } from '@actioncrew/streamix';

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
): (action$: Stream<Action<any>>, state$: Stream<any>, dependencies: Record<string, any>) => Stream<Action<any>> {
  return (action$: Stream<Action<any>>, state$: Stream<any>, dependencies: Record<string, any>) => {
    const subject = createSubject<Action<any>>();
    let currentEpicIndex = 0;
    let currentSubscription: Subscription | null = null;

    const subscribeToNextEpic = () => {
      if (currentEpicIndex >= epics.length) {
        subject.complete();
        return;
      }

      const epic = epics[currentEpicIndex];
      const effect = createInstruction.epic(epic);
      stack.add(effect);

      const epicStream = epic(action$, state$, dependencies);
      currentSubscription = epicStream.subscribe({
        next: (value) => {
          subject.next(value);
        },
        complete: () => {
          currentSubscription?.unsubscribe();
          currentSubscription = null;
          stack.remove(effect);
          currentEpicIndex++;
          subscribeToNextEpic();
        },
        error: (error) => {
          stack.remove(effect);
          subject.error(error);
        },
      });
    };

    subscribeToNextEpic();

    subject.name = 'concat';
    return subject;
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
    const subject = createSubject<Action>();
    let completedCount = 0;

    const effects = epics.map((epic) => {
      const effect = createInstruction.epic(epic);
      stack.add(effect);
      return effect;
    });

    const subscriptions = epics.map((epic, index) => {
      return epic(action$, state$, dependencies).subscribe({
        next: (value) => subject.next(value),
        complete: () => {
          completedCount++;
          if (completedCount === epics.length) {
            subject.complete();
          }
          stack.remove(effects[index]);
        },
        error: (err) => {
          stack.remove(effects[index]);
          subject.error(err);
        },
      });
    });

    return createStream<Action>("merge", async function* (this: Stream<Action>) {
      try {
        for await (const value of eachValueFrom(subject)) {
          yield value;
        }
      } finally {
        subscriptions.forEach((sub) => sub.unsubscribe());
      }
    });
  };
}

/**
 * Filters actions from the stream based on their `type` property.
 *
 * This operator passes through only those values that are valid actions
 * (`isAction(value)` returns `true`) and whose `type` matches one of the provided type(s).
 * Non-matching or non-action values are skipped.
 *
 * @param {string | string[]} types - The action type or list of types to allow through.
 * @returns {Operator} An operator that filters actions based on their `type`.
 *
 * @example
 * const filtered = stream.pipe(ofType(['USER_LOGIN', 'USER_LOGOUT']));
 * // Only USER_LOGIN and USER_LOGOUT actions will be emitted.
 */
export const ofType = <T extends Action<any>>(types: string | string[]): Operator => {
  const typeSet = typeof types === 'string' ? new Set([types]) : new Set(types);

  return createOperator<T, T>('ofType', (source) => {
    return {
      async next(): Promise<IteratorResult<T>> {
        while (true) {
          const { value, done } = await source.next();
          if (done) return { done: true, value: undefined as any };

          if (isAction(value) && typeSet.has(value.type)) {
            return { done: false, value };
          }
        }
      }
    };
  });
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

  return (api: {
    dispatch: Function;
    getState: () => any;
    dependencies: any;
    strategy: () => string;
    lock: any;
    stack: any;
  }) => (next: any) => async (action: any) => {
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

      const epicStream = (api.strategy() === 'concurrent' ? merge : concat)(api.stack, ...activeEpics);
      const subscription = epicStream(currentAction, currentState, api.dependencies()).subscribe({
        next: (childAction: any) => {
          if (isAction(childAction)) {
            api.dispatch(childAction);
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
    currentState.next(api.getState());

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
