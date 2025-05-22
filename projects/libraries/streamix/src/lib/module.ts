import { ActionCreator, featureSelector, selector } from '@actioncrew/actionstack';

export function createModule<
  State,
  Actions extends Record<string, ActionCreator & { handler?: (state: State, action: any) => State }>,
  Selectors extends Record<string, (state: State, ...args: any[]) => any>,
  Dependencies extends Record<string, any> = {}
>(config: {
  slice: string;
  initialState: State;
  actions: Actions;
  selectors: Selectors;
  dependencies?: Dependencies;
}) {
  const { slice, actions, selectors, dependencies } = config;

  // 1. Extract action handlers from actions, namespace their type
  const namespacedHandlers = Object.fromEntries(
    Object.entries(actions)
      .filter(([_, action]) => typeof action.handler === 'function')
      .map(([_, action]) => {
        let type = action.type;
        // Prefix only if not already prefixed
        if (!type.startsWith(`${slice}/`)) {
          type = `${slice}/${type}`;
        }
        return [type, action.handler!];
      })
  ) as Record<`${typeof slice}/${string}`, (state: State, action: any) => State>;

  const namespacedActions = Object.fromEntries(
    Object.entries(config.actions).map(([name, action]) => {
      const type = `${slice}/${action.type}`;

      if (typeof (action as any).type === 'string') {
        // Plain action creator — override type with namespaced version
        return [
          name,
          {
            ...action,
            type,
          },
        ];
      } else if (typeof action === 'function') {
        // Thunk-like action creator
        const wrappedThunk = (...args: any[]) => async (dispatch: any, getState: any, deps: any) => {
          const result = await (action as any)(...args)(dispatch, getState, {
            ...deps,
            ...config.dependencies,
          });
          return result;
        };

        // Attach a type field to the thunk for consistency/debugging
        (wrappedThunk as any).type = type;

        return [name, wrappedThunk];
      }

      throw new Error(`Invalid action for key "${name}"`);
    })
  ) as Actions;

  // 3. Create selectors scoped to feature slice
  const feature = featureSelector<State>(slice);

  const namespacedSelectors = Object.fromEntries(
    Object.entries(selectors).map(([name, selectorFn]) => [
      name,
      selector((rootState) => feature(rootState), (state) => selectorFn(state)) as typeof selectorFn
    ])
  ) as {
    [K in keyof Selectors]: Selectors[K]
  };

  return {
    ...config,
    actionHandlers: namespacedHandlers,
    actions: namespacedActions,
    selectors: namespacedSelectors,
    featureSelector: feature,
    register: (store: {
      registerActionHandler: (type: string, handler: (state: State, action: any) => State) => void;
      registerDependencies: (slice: string, deps: Dependencies) => void;
    }) => {
      Object.entries(namespacedHandlers).forEach(([type, handler]) => {
        store.registerActionHandler(type, handler);
      });

      // if (dependencies) {
      //   store.registerDependencies(slice, dependencies);
      // }

      return {
        actions: namespacedActions,
        selectors: namespacedSelectors,
        slice,
        featureSelector: feature,
      };
    }
  };
}
