import { Action, createStore, Store as StoreType, StoreEnhancer as StoreEnhancerType, FeatureModule, MainModule, Tracker, StoreSettings as Settings } from '@actionstack/store';
import { Observable } from 'rxjs/internal/Observable';
export { Store as StoreType, StoreSettings as StoreSettingsType } from '@actionstack/store';

/**
 * Configuration settings for the store.
 */
export class StoreSettings {
  dispatchSystemActions?: boolean;
  awaitStatePropagation?: boolean;
  enableMetaReducers?: boolean;
  enableAsyncReducers?: boolean;
};

/**
 * The default settings for the store that configure various behaviors such as action dispatch,
 * state propagation, and reducer handling.
 */
export class DefaultStoreSettings extends StoreSettings {
  constructor() {
    super();

    this.dispatchSystemActions = true;
    this.awaitStatePropagation = true;
    this.enableMetaReducers = true;
    this.enableAsyncReducers = true;
  }
};

/**
 * The central store for managing application state.
 * Provides methods to dispatch actions, retrieve state, and manage feature modules.
 *
 * @template T The type of the state managed by the store.
 */
export class Store<T = any> {
  private stream: StoreType;

  constructor(mainModule: MainModule, storeSettings?: StoreSettings, enhancer?: StoreEnhancerType) {
    const settings = { ...new DefaultStoreSettings(), ...storeSettings } as Settings;
    this.stream = createStore(mainModule, settings, enhancer);
  }

  dispatch(action: Action | any): Promise<void> {
    return this.stream.dispatch(action);
  }

  getState(slice?: keyof T | string[] | "@global"): any {
    return this.stream.getState(slice);
  }

  readSafe(slice: keyof T | string[] | "@global", callback: (state: Readonly<T>) => void | Promise<void>): Promise<void> {
    return this.stream.readSafe(slice, callback);
  }

  select<R = any>(selector: (obs: Observable<T>, tracker?: Tracker) => Observable<R>, defaultValue?: any): Observable<R> {
    return this.stream.select(selector, defaultValue);
  }

  loadModule(module: FeatureModule): Promise<void> {
    return this.stream.loadModule(module);
  }

  unloadModule(module: FeatureModule, clearState: boolean): Promise<void> {
    return this.stream.unloadModule(module, clearState);
  }
};
