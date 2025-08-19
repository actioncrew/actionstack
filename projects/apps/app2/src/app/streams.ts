// Demonstrates hooking Streamix into UI intent -> ActionStack store updates
import {
  createSubject,
  map,
  tap,
  filter,
  buffer,
  type Subscription,
  withLatestFrom,
  defer,
  switchMap,
} from '@actioncrew/streamix';
import { counter } from './counter';

// UI intents
export const incrementClicks$ = createSubject<number>();
export const decrementClicks$ = createSubject<number>();
export const resetClicks$ = createSubject<void>();

// Streamed side effects (throttled/derived logic)
export let subscriptions: Subscription[] = [];
// Batch increment clicks within 200ms windows
subscriptions.push(
  incrementClicks$
    .pipe(
      buffer(200),
      filter((clicks) => clicks.length > 0),
      map((clicks) => clicks.reduce((sum, val) => sum + val, 0)),
      tap((total) => counter.actions.increment(total))
    )
    .subscribe(),

  // Only allow decrement if count > 9
  decrementClicks$
    .pipe(
      map(() => -1),
      withLatestFrom(
        counter.loaded$.pipe(
          filter(Boolean),
          switchMap(() => defer(() => counter.data$.count()))
        )
      ),
      // filter(([, value]) => value > 9),
      tap(() => counter.actions.decrement(1))
    )
    .subscribe(),

  // Reset handler
  resetClicks$.pipe(tap(() => counter.actions.reset())).subscribe()
);
