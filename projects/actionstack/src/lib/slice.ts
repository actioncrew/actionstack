import { ElementRef, inject, Injectable, OnDestroy } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { Subscription } from 'rxjs/internal/Subscription';

import { StoreModule } from './module';
import { Store } from './store';
import { Action, Reducer, SliceStrategy } from './types';

/**
 * Interface defining configuration options for a Slice.
 */
export interface SliceOptions {
  slice?: string;
  reducer?: Reducer;
  dependencies?: any;
  strategy?: SliceStrategy;
}

/**
 * A class representing a slice of state within an Actionstack application.
 * A Slice instance provides methods for interacting with the Actionstack store to manage the state for a specific part of the application.
 *
 * @see {@link StoreModule} - for registering the Slice with the Actionstack store.
 * @see {@link Store} - for interacting with the global Actionstack state.
 * @see {@link Action} - for representing actions that can be dispatched to update the state.
 * @see {@link Reducer} - for defining how the state is updated in response to an action.
 * @see {@link Epic} - for handling side epics triggered by actions.
 */
@Injectable()
export class Slice implements OnDestroy {
  private opts: SliceOptions;
  private subscription = Subscription.EMPTY;
  private elRef!: ElementRef<HTMLElement>;

  /**
   * @param store - The Actionstack store instance.
   *
   * @throws Error if ElementRef injection fails, indicating the Slice is used in the wrong context.
   */
  constructor(private store: Store) {
    try {
      this.elRef = inject(ElementRef);
    } catch {
      console.warn('Injection failed. The Slice is provided in the module providers list, but it is suitable to use within component provider list.')
    }

    this.opts = {
      slice: this.elRef ? this.elRef.nativeElement.localName : "noname",
      reducer: (state: any = {}, action: Action) => state,
      dependencies: {},
      strategy: "persistent"
    };
  }

  /**
   * Sets up the Slice with the provided options.
   *
   * @param opts - Configuration options for the Slice.
   */
  setup(opts: SliceOptions): void {
    this.opts = Object.assign(this.opts, opts);
    this.opts.slice !== undefined && this.opts.reducer && this.store.loadModule({
      slice: this.opts.slice,
      dependencies: this.opts.dependencies,
      reducer: this.opts.reducer
    }, StoreModule.injector);
  }

  /**
   * Dispatches an action to update the state.
   *
   * @param action - The action to dispatch.
   */
  dispatch(action: Action): void {
    this.store.dispatch(action);
  }

  /**
   * Selects a portion of the state and returns an observable of that portion.
   *
   * @param selector - A function to apply to the observable of the state to derive a new observable.
   * @param defaultValue - A default value to return if the selected portion of the state is undefined.
   * @returns An observable of the selected portion of the state.
   */
  select<U = any, T = any>(selector: (obs: Observable<T>) => Observable<U>, defaultValue?: any): any {
    return this.store.select(selector, defaultValue);
  }

  /**
   * Cleans up resources when the Slice is destroyed.
   */
  ngOnDestroy(): void {
    this.opts.slice !== undefined && this.opts.reducer && this.store.unloadModule({slice: this.opts.slice, reducer: this.opts.reducer}, this.opts.strategy === "temporary" ? true : false);
  }
}
