import { createLock, SimpleLock } from './lock';
import { createInstruction, ExecutionStack } from './stack';
import { Action, AsyncAction } from './types';

/**
 * Configuration object for the middleware.
 *
 * @typedef {Object} MiddlewareConfig
 * @property {Function} dispatch - Function to dispatch actions.
 * @property {Function} getState - Function to get the current state.
 * @property {Function} dependencies - Function to get dependencies.
 * @property {SimpleLock} lock - Lock instance to manage action processing concurrency.
 * @property {ExecutionStack} stack - Stack instance to track action execution.
 */
interface MiddlewareConfig {
  dispatch: Function;
  getState: Function;
  dependencies: Function;
  lock: SimpleLock;
  stack: ExecutionStack;
}

/**
 * Functional handler for managing actions within middleware.
 *
 * @param {MiddlewareConfig} config - Configuration object for the middleware.
 * @returns {Function} - A function to handle actions.
 */
export function createActionHandler(config: MiddlewareConfig) {
  const stack = config.stack;
  const getState = config.getState;
  const dependencies = config.dependencies;

  /**
   * Handles the given action, processing it either synchronously or asynchronously.
   *
   * @param {Action | AsyncAction} action - The action to be processed.
   * @param {Function} next - The next middleware function in the chain.
   * @param {SimpleLock} lock - The lock instance to manage concurrency for this action.
   * @returns {Promise<void> | void} - A promise if the action is asynchronous, otherwise void.
   */
  const handleAction = async (action: Action | AsyncAction, next: Function, lock: SimpleLock): Promise<void> => {
    await lock.acquire();

    const op = createInstruction.action(action);
    stack.add(op);

    try {
      if (typeof action === 'function') {
        const innerLock = createLock();

        // Process async actions asynchronously and track them
        await action(
          async (syncAction: Action) => {
            await handleAction(syncAction, next, innerLock);
          },
          getState,
          dependencies()
        );
      } else {
        // Process regular synchronous actions
        await next(action);
      }
    } finally {
      stack.remove(op);
      lock.release();
    }
  };

  return handleAction;
}

/**
 * Function to create the starter middleware factory.
 * This factory function returns a middleware creator that takes strategy information as arguments and returns the actual middleware function.
 *
 * @returns Function - The middleware creator function.
 */
export const createStarter = () => {
  /**
   * Middleware function for handling actions exclusively.
   *
   * This middleware ensures only one action is processed at a time and queues new actions until the current one finishes.
   *
   * @param args - Arguments provided by the middleware pipeline.
   *   * dispatch - Function to dispatch actions.
   *   * getState - Function to get the current state.
   *   * dependencies - Function to get dependencies.
   * @param next - Function to call the next middleware in the chain.
   * @returns Function - The actual middleware function that handles actions.
   */
  const exclusive = (config: MiddlewareConfig) => (next: Function) => async (action: Action | AsyncAction) => {
    const handler = createActionHandler(config);
    const lockInstance = config.lock;
    await handler(action, next, lockInstance);
  };

  /**
   * Middleware function for handling actions concurrently.
   *
   * This middleware allows multiple async actions to be processed simultaneously.
   *
   * @param args - Arguments provided by the middleware pipeline (same as exclusive).
   * @param next - Function to call the next middleware in the chain.
   * @returns Function - The actual middleware function that handles actions.
   */
  const concurrent = (config: MiddlewareConfig) => (next: Function) => async (action: Action | AsyncAction) => {
    let asyncActions: Promise<void>[] = [];
    const handler = createActionHandler(config);
    const lockInstance = config.lock;

    const asyncFunc = handler(action, next, lockInstance);
    if (asyncFunc) {
      asyncActions.push(asyncFunc);
      asyncFunc.finally(() => {
        asyncActions = asyncActions.filter(func => func !== asyncFunc);
      });
    }
  };

  // Map strategy names to functions
  const strategies: Record<string, any> = {
    'exclusive': exclusive,
    'concurrent': concurrent
  };

  const defaultStrategy = 'concurrent';

  // Create a method to select the strategy
  const selectStrategy = ({ dispatch, getState, dependencies, strategy, lock, stack }: any) => (next: Function) => async (action: Action) => {
    let strategyFunc = strategies[strategy()];
    if (!strategyFunc) {
      console.warn(`Unknown strategy: ${strategy}, default is used: ${defaultStrategy}`);
      strategyFunc = strategies[defaultStrategy];
    }
    return strategyFunc({ dispatch, getState, dependencies, lock, stack })(next)(action);
  };

  selectStrategy.signature = 'i.p.5.j.7.0.2.1.8.b';
  return selectStrategy;
};

// Create the starter middleware
export const starter = createStarter();
