import {
  CallbackReturnType,
  createReceiver,
  createSubscription,
  Receiver,
  Stream,
  StrictReceiver,
  Subscription,
} from '@actioncrew/streamix';
import { Tracker } from './tracker';

/**
 * Wraps a particular stream so that its subscription lifecycle
 * is automatically tracked by the provided Tracker.
 *
 * When the decorated stream is subscribed to:
 * - It is registered with the tracker (via Tracker.track).
 *
 * When the returned subscription is unsubscribed or the stream completes:
 * - The underlying stream subscription is unsubscribed.
 * - Tracker.complete is called, removing it from the tracker and completing
 * its status observable.
 *
 * This prevents the need for manual tracker management in consumer code.
 *
 * @typeParam T - The type of values emitted by the stream.
 *
 * @param stream - The Streamix Stream instance to decorate.
 * @param tracker - The Tracker instance used to monitor this stream's lifecycle.
 *
 * @returns The same stream instance, but with its `.subscribe()` method
 * overridden to include tracker lifecycle handling. The subscription
 * returned by `.subscribe()` will also handle cleanup automatically.
 */
export function trackable<S extends Stream<T>, T = any>(
  stream: S,
  tracker: Tracker
): S {
  const originalSubscribe = stream.subscribe;

  // Preserve all existing properties/methods
  const enhancedStream: S = Object.create(stream);

  enhancedStream.subscribe = (
    receiver?: Receiver<T> | ((value: T) => CallbackReturnType)
  ): Subscription => {
    // 1. Register with tracker
    tracker.track(enhancedStream);

    // 2. Create tracked receiver with robust exception handling
    const strictReceiver = createReceiver(receiver);
    const trackingReceiver: StrictReceiver<T> = {
      ...strictReceiver,
      next: async (value: T) => {
        try {
          await strictReceiver.next(value);
          tracker.setStatus(enhancedStream, true);
        } catch (err) {
          // If next() throws an error, we treat it as a stream error
          try {
            await strictReceiver.error(err as Error);
          } catch (errorInError) {
            console.error('An error occurred in the receiver\'s error handler:', errorInError);
          }
          tracker.complete(enhancedStream);
        }
      },
      error: async (err: Error) => {
        // Ensure tracker is completed even if strictReceiver.error fails
        try {
          await strictReceiver.error(err);
        } catch (errorInError) {
          console.error('An error occurred in the receiver\'s error handler:', errorInError);
        } finally {
          tracker.complete(enhancedStream);
        }
      },
      complete: async () => {
        // Ensure tracker is completed even if strictReceiver.complete fails
        try {
          await strictReceiver.complete();
        } catch (errorInComplete) {
          console.error('An error occurred in the receiver\'s complete handler:', errorInComplete);
        } finally {
          tracker.complete(enhancedStream);
        }
      },
      get completed() {
        return strictReceiver.completed;
      }
    };

    // 3. Create original subscription
    const subscription = originalSubscribe.call(enhancedStream, trackingReceiver);

    return createSubscription(() => {
      subscription.unsubscribe();
      if (!trackingReceiver.completed) {
        tracker.complete(enhancedStream);
      }
    });
  };

  return enhancedStream;
}
