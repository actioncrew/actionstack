import { SimpleLock } from './lock';
import { ExecutionStack } from './stack';
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
export declare function createActionHandler(config: MiddlewareConfig): (action: Action | AsyncAction, next: Function, lock: SimpleLock) => Promise<void>;
/**
 * Function to create the starter middleware factory.
 * This factory function returns a middleware creator that takes strategy information as arguments and returns the actual middleware function.
 *
 * @returns Function - The middleware creator function.
 */
export declare const createStarter: () => {
    ({ dispatch, getState, dependencies, strategy, lock, stack }: any): (next: Function) => (action: Action) => Promise<any>;
    signature: string;
};
export declare const starter: {
    ({ dispatch, getState, dependencies, strategy, lock, stack }: any): (next: Function) => (action: Action) => Promise<any>;
    signature: string;
};
export {};
