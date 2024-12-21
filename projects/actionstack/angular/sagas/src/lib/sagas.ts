import { Store, STORE_ENHANCER, StoreSettings } from '@actionstack/angular';
import {
  Action,
  action,
  MainModule,
  Observer,
  createInstruction,
  StoreEnhancer,
  Instruction,
} from '@actionstack/store';

export { Store as StoreType, StoreSettings as StoreSettingsType } from '@actionstack/store';

import { NgModule } from '@angular/core';
import { runSaga, Saga, SagaMiddlewareOptions, stdChannel, Task } from 'redux-saga';
import { call, cancelled } from 'redux-saga/effects';
import { Observable } from 'rxjs/internal/Observable';

export const createSagasMiddleware = ({
    context = {},
    sagaMonitor = undefined,
    onError = undefined,
    effectMiddlewares = [],
    channel = stdChannel()
  } : SagaMiddlewareOptions) => {
  let activeSagas = new Map();
  let middlewareDispatch: any;
  let middlewareGetState: any;

  const customDispatch = (dispatch: any) => (sagaOp: Instruction) => (action: Action<any>) => {
    const actionWithSource = Object.assign({}, action, {source: sagaOp});
    dispatch(actionWithSource);
  };

  const sagaMiddleware = ({ dispatch, getState, dependencies, stack }: any) => (next: any) => async (action: Action<any>) => {
    middlewareDispatch = dispatch; middlewareGetState = getState;

    // Proceed to the next action
    const result = await next(action);

    channel.put(action);

    if (action.type === 'RUN_ENTITIES' || action.type === 'STOP_ENTITIES') {
      if (action.type === 'RUN_ENTITIES') {
        action.payload.sagas.forEach((saga: Saga) => {
          if (!activeSagas.has(saga)) {
            if (typeof saga !== 'function') {
              throw new Error('saga argument must be a Generator function!');
            }

            const op = createInstruction.saga(saga);
            const task: Task = runSaga({ context, channel, dispatch: customDispatch(middlewareDispatch)(op), getState: middlewareGetState }, (function*(): Generator<any, void, any> {
              try {
                stack.push(op); Object.assign(context, dependencies());
                yield call(saga);
              } catch (error) {
                console.error('Saga error:', error);
              } finally {
                stack.pop(op);
                if (yield cancelled()) {
                  return;
                }
              }
            }));
            activeSagas.set(saga, task);
          }
        });
      } else if (action.type === 'STOP_ENTITIES') {
        action.payload.sagas.forEach((saga: any) => {
          const task = activeSagas.get(saga);
          if (task) {
            task.cancel();
            activeSagas.delete(saga);
          }
        });
      }
    }

    return result;
  };

  return sagaMiddleware;
};

createSagasMiddleware.signature = "u.p.l.2.y.m.b.1.d.7";

export const sagas = createSagasMiddleware({});

export const run = action('RUN_ENTITIES', (...sagas: any[]) => ({sagas}));
export const stop = action('STOP_ENTITIES', (...sagas: any[]) => ({sagas}));

/**
 * A store enhancer to spawn the given sagas.
 *
 * @param {Function} createStore - The function to create the store.
 * @returns {Function} - A function that accepts the main module and optional enhancer to create an saga store.
 */
export const storeEnhancer: StoreEnhancer = (createStore) => (module: MainModule, settings?: StoreSettings, enhancer?: StoreEnhancer): SagaStore => {
  const store = createStore(module, settings, enhancer) as SagaStore;

  /**
   * Spawns the given sagas.
   *
   * @template U
   * @param {...Saga[]} sagas - The sagas to be added to the store.
   * @returns {Observable<U>} - An observable that completes when the sagas are removed.
   */
  store.spawn = <U>(...sagas: Saga[]): Observable<U> => {
    const effects$ = new Observable<U>((subscriber: Observer<U>) => {
      return () => {
        store.dispatch(stop(sagas));
      }
    });

    store.dispatch(run(sagas));
    return effects$;
  };

  return store;
}

/**
 * An abstract class for the epic store.
 *
 * @extends {Store}
 */
export abstract class SagaStore extends Store {
  /**
   * Abstract method to spawn the given sagas.
   *
   * @template U
   * @param {...Saga[]} sagas - The sagas to be added to the store.
   * @returns {Observable<U>} - An observable that completes when the sagas are removed.
   */
  abstract spawn<U>(...sagas: Saga[]): Observable<U>;
}

/**
 * NgModule for providing the saga store and its enhancer.
 *
 * @ngModule
 */
@NgModule({
  providers: [
    {
      provide: STORE_ENHANCER,
      useValue: storeEnhancer,
      multi: false
    },
    {
      provide: SagaStore,
      useValue: Store,
      deps: [Store]
    }
  ]
})
export class SagaModule { }
