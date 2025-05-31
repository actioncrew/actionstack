import { createSubject, first, Operator, pipeStream, Stream, switchMap, takeUntil } from '@actioncrew/streamix';
import { ActionCreator, featureSelector } from '../lib';



export function createModule<
  State,
  ActionTypes extends string,
  Actions extends Record<string, ActionCreator<ActionTypes> | ((...args: any[]) => any)>,
  Selectors extends Record<string, (...args: any[]) => (state: State) => any>,
  Dependencies extends Record<string, any> = {}
>(config: {
  slice: string;
  initialState: State;
  actions: Actions;
  selectors: Selectors;
  dependencies?: Dependencies;
}) {
  const { slice } = config;

  const loaded$ = createSubject<void>();
  const destroy$ = createSubject<void>();

  // 1. Process action handlers and namespace action types
  const actionHandlers = new Map<
    string,
    (state: State, payload: any) => State
  >();

  const processedActions = Object.fromEntries(
    Object.entries(config.actions).map(([name, action]) => {
      if (isActionCreator(action)) {
        // Standard action creator
        const namespacedType = `${slice}/${action.type}`;

        const namespacedAction = (...args: any[]) => {
          const act = action(...args);
          return {
            ...act,
            type: namespacedType,
          };
        };

        // Register handler if present
        if (action.handler) {
          actionHandlers.set(
            namespacedType,
            (state, payload) => action.handler!(state, payload)
          );
        }

        // Preserve metadata and override type and toString
        Object.assign(namespacedAction, action, {
          type: namespacedType,
          toString: () => namespacedType,
        });

        return [name, namespacedAction];
      } else {
        // Thunk action
        const thunkWithType = (...args: any[]) => {
          const thunk = action(...args);
          return Object.assign(
            async (dispatch: any, getState: any, deps: any) => {
              return thunk(dispatch, getState, {
                ...deps,
                ...config.dependencies
              });
            },
            { type: `${slice}/${name}` }
          );
        };
        return [name, thunkWithType];
      }
    }
  )) as Actions;

  // 2. Create selectors with feature scope

 // Create a feature selector for the module slice
  const feature = featureSelector(slice);

  // Patch selectors to inject slice
  const processedSelectors = Object.fromEntries(
    Object.entries(config.selectors).map(([name, selector]) => {
      const wrapped = (...args: any[]) => {
        const original = selector(...args); // (state) => value
        return (globalState: any) => {
          const sliceState = feature(globalState);
          return original(sliceState);
        };
      };
      return [name, wrapped];
    })
  );

  // Streams type for selectors
  type Streams<S extends Record<string, (...args: any[]) => (state: any) => any>> = {
    [K in keyof S]: (...args: Parameters<S[K]>) => Stream<ReturnType<ReturnType<S[K]>>>;
  };

  let internalStreams: Streams<Selectors> = {} as any;

  let data$ = new Proxy({} as Streams<Selectors>, {
    get(_, key: string) {
      return (...args: any[]) => {
        return loaded$.pipe(
          first(),
          switchMap(() => {
            const fn = internalStreams[key as keyof Selectors];
            return fn(...args as Parameters<Selectors[keyof Selectors]>);
          })
        );
      };
    }
  });

  // Bind selectors to store:
  function bindSelectorsToStore<S extends Record<string, (...args: any[]) => (state: any) => any>>(
    store: { select: <R>(selector: (state: any) => R | Promise<R>) => Stream<R> },
    module: { selectors: S; data$?: Streams<S> }
  ): void {
    const streams = {} as Streams<S>;

    for (const key in module.selectors) {
      const sel = module.selectors[key];
      streams[key] = (...args: Parameters<typeof sel>) => {
      const selectorFn = sel(...args);
      const originalStream = store.select(selectorFn);

      let hasTakeUntil = false;

      // Override .pipe
      const originalPipe = originalStream.pipe?.bind(originalStream);
      originalStream.pipe = (...steps: Operator[]) => {
        const alreadyAdded = steps.some(op => op.name === 'takeUntil');
        hasTakeUntil = hasTakeUntil || alreadyAdded;

        // If takeUntil is not in the pipe, append it
        const finalSteps = alreadyAdded ? steps : [...steps, takeUntil(destroy$)];
        return pipeStream(originalStream, ...finalSteps);
      };

      // Override .subscribe
      const originalSubscribe = originalStream.subscribe?.bind(originalStream);
      originalStream.subscribe = (...args: any[]) => {
        if (hasTakeUntil) {
          return originalSubscribe(...args); // already protected
        } else {
          // Inject takeUntil only once
          const guardedStream = pipeStream(originalStream, takeUntil(destroy$));
          hasTakeUntil = true;
          return guardedStream.subscribe(...args);
        }
      };

      return originalStream;
      };
    }

    (module as any).data$ = streams;
  }

  return {
    slice,
    initialState: config.initialState,
    actionHandlers,
    actions: processedActions,
    selectors: processedSelectors,
    dependencies: config.dependencies,
    data$,
    destroy$,
    internalStreams,
    register: function (store: {
      registerActionHandler: (type: string, handler: (state: any, payload: any) => any) => void;
      registerDependencies: (slice: string, deps: any) => void;
      select: <R>(selector: (state: any) => R | Promise<R>) => Stream<R>;
    }) {
      // Register all action handlers
      actionHandlers.forEach((handler, type) => {
        store.registerActionHandler(type, handler);
      });

      // Register dependencies if provided
      if (config.dependencies) {
        store.registerDependencies(slice, config.dependencies);
      }

      bindSelectorsToStore(store, this);
      loaded$.next();
    }
  };
}

// Helper type guard
function isActionCreator(obj: any): obj is ActionCreator {
  return obj && typeof obj.type === 'string';
}
