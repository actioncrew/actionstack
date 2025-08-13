import { Observable } from 'rxjs/internal/Observable';
import { Tracker } from './tracker';
import { Action, FeatureModule, MainModule, Middleware, StoreEnhancer } from './types';
/**
 * Class representing configuration options for a store.
 * This class defines properties that control various behaviors of a store for managing application state.
 */
export type StoreSettings = {
    dispatchSystemActions?: boolean;
    awaitStatePropagation?: boolean;
    enableMetaReducers?: boolean;
    enableAsyncReducers?: boolean;
    exclusiveActionProcessing?: boolean;
};
/**
 * The `Store` type represents the core store object that manages state, actions, and modules.
 * It provides methods to interact with the store's state, dispatch actions, load/unload modules, and more.
 */
export type Store<T = any> = {
    dispatch: (action: Action | any) => Promise<void>;
    getState: (slice?: keyof T | string[] | "@global") => any;
    readSafe: (slice: keyof T | string[] | "@global", callback: (state: Readonly<T>) => void | Promise<void>) => Promise<void>;
    select: <R = any>(selector: (obs: Observable<T>, tracker?: Tracker) => Observable<R>, defaultValue?: any) => Observable<R>;
    loadModule: (module: FeatureModule) => Promise<void>;
    unloadModule: (module: FeatureModule, clearState: boolean) => Promise<void>;
    getMiddlewareAPI: () => any;
    starter: Middleware;
};
/**
 * Constant array containing system action types as strings.
 * These action types are likely used internally for system events.
 */
declare const SYSTEM_ACTION_TYPES: readonly ["INITIALIZE_STATE", "UPDATE_STATE", "STORE_INITIALIZED", "MODULE_LOADED", "MODULE_UNLOADED"];
/**
 * Type alias representing all possible system action types.
 * This type is derived from the `SYSTEM_ACTION_TYPES` array using the `typeof` operator and ensures the type is also a string.
 */
export type SystemActionTypes = typeof SYSTEM_ACTION_TYPES[number] & string;
/**
 * Function to check if a given string is a system action type.
 */
export declare function isSystemActionType(type: string): type is SystemActionTypes;
/**
 * Creates a new store instance.
 *
 * This function initializes a store with the provided `mainModule` configuration and optional store enhancer.
 * It also accepts store settings that define various configuration options for the store.
 * The `storeSettings` parameter defaults to `defaultStoreSettings` if not provided.
 */
export declare function createStore<T = any>(mainModule: MainModule, storeSettingsOrEnhancer?: StoreSettings | StoreEnhancer, enhancer?: StoreEnhancer): Store<T>;
export {};
