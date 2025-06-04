import { createReplaySubject, createSubject, defer, first, Operator, pipeStream, Stream, switchMap, takeUntil } from '@actioncrew/streamix';
import { ActionCreator, featureSelector, Store } from '../lib';



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

  const loaded$ = createReplaySubject<void>();
  const destroyed$ = createSubject<void>();

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
            { type: `${slice}/${thunk.type}` }
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
        return store.select(selectorFn);
      };
    }

    internalStreams = { ...(module as any).internalStreams, ...streams };
  }

  let store: Store | undefined;

  let module = {
    slice,
    initialState: config.initialState,
    actions: processedActions,
    selectors: processedSelectors,
    dependencies: config.dependencies,
    get data$() {
      return new Proxy({} as Streams<Selectors>, {
        get(_, key: string) {
          return (...args: any[]) => {
            return defer(() => loaded$.pipe(
              first(),
              switchMap(() => {
                const fn = internalStreams[key as keyof Selectors];
                return fn(...args as Parameters<Selectors[keyof Selectors]>);
              }),
              takeUntil(destroyed$)
            ));
          };
        }
      });
    },
    loaded$,
    destroyed$,
    init(storeInstance: Store<any>) {
      store = storeInstance;
      store.loadModule(this);
      bindSelectorsToStore(store, this);
      return module;
    },
    destroy(clearState?: boolean) {
      this.destroyed$.next();
      store?.unloadModule(this, clearState);
      return module;
    }
  };

  module.actions = new Proxy(processedActions, {
    get(target, prop: string | symbol, receiver) {
      const fn = (target as any)[prop];
      if (typeof fn !== "function") {
        return fn;
      }

      const wrappedFn = (...args: any[]) => {
        if (!store) {
          throw new Error(
            `Module "${slice}" actions cannot be dispatched before registration. ` +
            `Call module.register(store) first.`
          );
        }

        if ((fn as any).isThunk) {
          console.log("dispatching thunk:", fn);
        }

        const actionToDispatch = fn(...args);
        store.dispatch(actionToDispatch);
        return actionToDispatch;
      };

      const descriptors = Object.getOwnPropertyDescriptors(fn);
      Object.defineProperties(wrappedFn, descriptors);

      return wrappedFn;
    },
  });

  return module;
}

// Helper type guard
function isActionCreator(obj: any): obj is ActionCreator {
  return obj && typeof obj.type === 'string' && obj?.isThunk !== true;
}
