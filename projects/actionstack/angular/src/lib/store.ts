import { defaultMainModule } from '@actionstack/store';
import { Tree } from '@actionstack/store';
import { Action, createStore, Store as StoreType, StoreEnhancer, FeatureModule, MainModule, Tracker, StoreSettings as Settings } from '@actionstack/store';
import { InjectionToken, Injector } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
// export { Store as StoreType, StoreSettings as StoreSettingsType } from '@actionstack/store';

/**
 * Configuration settings for the store.
 */
export class StoreSettings {
  dispatchSystemActions?: boolean;
  awaitStatePropagation?: boolean;
  enableMetaReducers?: boolean;
  enableAsyncReducers?: boolean;
  exclusiveActionProcessing?: boolean;
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
    this.exclusiveActionProcessing = false;
  }
};

/**
 * The central store for managing application state.
 * Provides methods to dispatch actions, retrieve state, and manage feature modules.
 *
 * @template T The type of the state managed by the store.
 */
export class Store<T = any> {
  private _store: StoreType | undefined;
  private settings: StoreSettings;
  private mainModule: MainModule;
  private modules: FeatureModule[] = [];

  constructor(main: MainModule, storeSettings?: StoreSettings, private enhancer?: StoreEnhancer, private injector?: Injector) {
    this.settings = { ...new DefaultStoreSettings(), ...storeSettings };
    this.mainModule = { ...defaultMainModule, ...main };
  }

  dispatch(action: Action | any): Promise<void> {
    return this.store.dispatch(action);
  }

  getState(slice?: keyof T | string[] | "@global"): any {
    return this.store.getState(slice);
  }

  readSafe(slice: keyof T | string[] | "@global", callback: (state: Readonly<T>) => void | Promise<void>): Promise<void> {
    return this.store.readSafe(slice, callback);
  }

  select<R = any>(selector: (obs: Observable<T>, tracker?: Tracker) => Observable<R>, defaultValue?: any): Observable<R> {
    return this.store.select(selector, defaultValue);
  }

  loadModule(module: FeatureModule): Promise<void> {
    let featureModule = { ...module, dependencies: this.resolveDependencies(module.dependencies ?? {}) };
    this.modules = [...this.modules, featureModule];
    return this.store.loadModule(featureModule);
  }

  unloadModule(module: FeatureModule, clearState: boolean): Promise<void> {
    let index = this.modules.findIndex((item) => module.slice === item.slice);
    if(index < 0) {
      console.warn(`Module with slice "${module.slice}" not found. Skipping unload.`);
      return Promise.resolve();
    }

    const featureModule = this.modules.splice(index, 1)[0];
    return this.store.unloadModule(featureModule, clearState);
  }

  getMiddlewareAPI() {
    return this.store.getMiddlewareAPI();
  }

  get starter() {
    return this.store.starter;
  }

  private resolveDependencies(dependencies: Tree<any>): Tree<any> {
    const resolveNode = (node: Tree<any>): Tree<any> => {
      if (typeof node === 'function' || node instanceof InjectionToken) {
        // Resolve Type or InjectionToken
        return this.injector!.get(node);
      } else if (node && typeof node === 'object' && !Array.isArray(node)) {
        // Skip objects whose constructor is a method (class instances)
        if (typeof node.constructor === 'function' && node.constructor !== Object) {
          return node; // Return the class instance as-is
        }
        // Recursively resolve plain objects
        return Object.fromEntries(
          Object.entries(node).map(([key, value]) => [key, resolveNode(value)])
        );
      }
      // Return primitive values or unhandled types as-is
      return node;
    };
    return resolveNode(dependencies);
  }

  private get store(): StoreType {
    if (!this._store) {
      this.mainModule = { ...this.mainModule, dependencies: this.resolveDependencies(this.mainModule.dependencies ?? {}) };
      this._store = createStore(this.mainModule, this.settings, this.enhancer);;
    }
    return this._store;
  }
};

export {
  // Types:
  Action,
  AsyncAction,
  ActionCreator,
  Reducer,
  AsyncReducer,
  MetaReducer,
  Middleware,
  MiddlewareAPI,
  Observer,
  AsyncObserver,
  OperatorFunction,
  AnyFn,
  SelectorFunction,
  ProjectionFunction,
  Tree,
  ProcessingStrategy,
  SliceStrategy,
  FeatureModule,
  MainModule,
  StoreCreator,
  StoreEnhancer,
  StoreSettings as Settings,
  Store as StoreType,
  InstructionType,
  Instruction,
  ExecutionStack,

  // Functions:
  createAction,
  bindActionCreator,
  bindActionCreators,
  salt,
  hash,
  signature,
  isValidSignature,
  createLock,
  createTracker,
  kindOf,
  isBoxed,
  isPromise,
  isAction,
  isAsync,
  isPlainObject,
  isObservable,
  createFeatureSelector,
  createSelector,
  createSelectorAsync,
  isInstruction,
  createExecutionStack,
  createActionHandler,
  createStarter,

  createAction as action,
  createFeatureSelector as featureSelector,
  createSelector as selector,
  createSelectorAsync as selectorAsync,

  applyChange,
  applyMiddleware,
  combineEnhancers,
  combineReducers,

  // Constants:
  createInstruction,
  defaultMainModule
} from '@actionstack/store';
