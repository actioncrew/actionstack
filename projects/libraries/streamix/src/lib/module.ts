import { ActionCreator, featureSelector, selector } from '@actioncrew/actionstack';

export function createModule<
  State,
  ActionTypes extends string,
  Actions extends Record<string, ActionCreator<ActionTypes> | ((...args: any[]) => any)>,
  Selectors extends Record<string, (state: State, ...args: any[]) => any>,
  Dependencies extends Record<string, any> = {}
>(config: {
  slice: string;
  initialState: State;
  actions: Actions;
  selectors: Selectors;
  dependencies?: Dependencies;
}) {
  const { slice } = config;

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

        const namespacedAction = (...args: any[]) => action(...args);

        // Preserve metadata and override type and toString
        Object.assign(namespacedAction, action, {
          type: namespacedType,
          toString: () => namespacedType,
        });

        // Register handler if present
        if (action.handler) {
          actionHandlers.set(
            namespacedType,
            (state, payload) => action.handler!(state, payload)
          );
        }

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
  // const feature = featureSelector<State>(slice);
  // const processedSelectors = Object.fromEntries(
  //   Object.entries(config.selectors).map(([name, selectorFn]) => [
  //     name,
  //     selector(feature, (state: State) => selectorFn(state))
  //   ])
  // ) as Selectors;

  return {
    slice,
    initialState: config.initialState,
    actionHandlers,
    actions: processedActions,
    selectors: {},
    dependencies: config.dependencies,
    register: (store: {
      registerActionHandler: (type: string, handler: (state: any, payload: any) => any) => void;
      registerDependencies: (slice: string, deps: any) => void;
    }) => {
      // Register all action handlers
      actionHandlers.forEach((handler, type) => {
        store.registerActionHandler(type, handler);
      });

      // Register dependencies if provided
      if (config.dependencies) {
        store.registerDependencies(slice, config.dependencies);
      }
    }
  };
}

// Helper type guard
function isActionCreator(obj: any): obj is ActionCreator {
  return obj && typeof obj.type === 'string';
}
