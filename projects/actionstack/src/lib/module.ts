import { InjectionToken, Injector, ModuleWithProviders, NgModule, Optional, Provider } from '@angular/core';

import { Store, StoreSettings } from './store';
import { FeatureModule, MainModule, StoreEnhancer } from './types';


export const STORE_ENHANCER = new InjectionToken<StoreEnhancer>("Store Enhancer");

/**
 * This module provides a centralized mechanism for managing application state
 * using a single store instance within an Angular application.
 *
 * It offers methods for configuring the store for the root module (`forRoot`)
 * and for feature modules (`forFeature`). It ensures a single store instance
 * and manages the loading of feature modules within the store.
 */
@NgModule({})
export class StoreModule {
  /**
   * Static property to store a single instance of the Store class.
   */
  static store: Store | undefined = undefined;

  /**
   * Static array to store functions that need to be executed later,
   * likely for loading feature modules.
   */
  static modulesFn: Function[] = [];

  /**
   * Static property to hold a reference to the Angular injector
   * for dependency injection.
   */
  static injector: Injector;

  /**
   * Constructor for StoreModule that injects the Angular injector.
   * @param injector - The Angular injector instance.
   */
  constructor(injector: Injector) {
    StoreModule.injector = injector;
  }

  /**
   * Static method used to configure the store for the root module of the application.
   * @param module - The main application module to be used with the store.
   * @returns ModuleWithProviders - An object defining the StoreModule with its providers.
   */
  static forRoot(module: MainModule): ModuleWithProviders<StoreModule> {
    return {
      ngModule: StoreModule,
      providers: [
        {
          provide: StoreSettings,
          useClass: StoreSettings
        },
        {
          provide: Store,
          useFactory: (settings: StoreSettings, enhancer: StoreEnhancer) => {
              if (!StoreModule.store) {
                StoreModule.store = enhancer
                  ? (Store.create(module, enhancer))
                  : Store.create(module);
              }

            queueMicrotask(() => StoreModule.modulesFn.forEach(fn => fn()));
            return StoreModule.store;
          },
          deps: [StoreSettings, [new Optional(), STORE_ENHANCER]]
        }
      ]
    };
  }

  /**
   * Static method used to configure the store for feature modules within the application.
   * @param module - The feature module to be used with the store.
   * @returns ModuleWithProviders - An object defining the StoreModule.
   */
  static forFeature(module: FeatureModule): ModuleWithProviders<StoreModule> {
    const loadFeatureModule = () => {
      StoreModule.store!.loadModule(module, StoreModule.injector);
    };

    if (!StoreModule.store) {
      StoreModule.modulesFn.push(loadFeatureModule);
    } else {
      loadFeatureModule();
    }

    return {
      ngModule: StoreModule,
      providers: []
    };
  }
}


/**
 * Provides the store configuration for use in standalone components or traditional modules.
 * @param module - The main application module to be used with the store.
 * @returns Array of providers - An array of providers to be used in standalone components.
 */
export function provideStore(module: MainModule): Provider[] {
  return StoreModule.forRoot(module).providers as Provider[];
}

/**
 * Provides the feature module configuration for use in standalone components or traditional modules.
 * @param module - The feature module to be used with the store.
 * @returns Array of providers - An array of providers to be used in standalone components.
 */
export function provideModule(module: FeatureModule): Provider[] {
  return StoreModule.forFeature(module).providers as Provider[];
}
