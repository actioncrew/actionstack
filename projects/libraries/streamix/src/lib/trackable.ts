import { Tracker } from "./tracker";
import { createSubscription, Stream, createReceiver, Receiver, Subscription, StrictReceiver, CallbackReturnType } from "@actioncrew/streamix";

/**
 * Wraps a Streamix {@link Stream} so that its subscription lifecycle
 * is automatically tracked by the provided {@link Tracker}.
 *
 * When the decorated stream is subscribed to:
 * - It is registered with the tracker (via {@link Tracker.track}).
 *
 * When the returned subscription is unsubscribed or the stream completes:
 * - The underlying stream subscription is unsubscribed.
 * - {@link Tracker.complete} is called, removing it from the tracker and completing
 *  its status observable.
 *
 * This prevents the need for manual tracker management in consumer code.
 *
 * @typeParam T - The type of values emitted by the stream.
 *
 * @param stream - The Streamix {@link Stream} instance to decorate.
 * @param tracker - The {@link Tracker} instance used to monitor this stream's lifecycle.
 *
 * @returns The same stream instance, but with its `.subscribe()` method
 *          overridden to include tracker lifecycle handling. The subscription
 *          returned by `.subscribe()` will also handle cleanup automatically.
 */
/**
 * Enhances a stream with tracking capabilities while preserving its original type.
 * @template S The type of stream being tracked (must extend Stream<T>)
 * @template T The type of values emitted by the stream
 * @param {S} stream The stream to make trackable
 * @param {Tracker} tracker The tracker instance
 * @returns {S} The enhanced stream with same type as input
 *
 * @example
 * const subject = new Subject<number>();
 * const trackedSubject = trackable(subject, tracker);
 * // trackedSubject remains Subject<number> type
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

    // 2. Create tracked receiver
    const strictReceiver = createReceiver(receiver);
    const trackingReceiver: StrictReceiver<T> = {
      ...strictReceiver,
      next: async (value: T) => {
        await strictReceiver.next(value);
        tracker.setStatus(enhancedStream, true);
      },
      error: async (err: Error) => {
        await strictReceiver.error(err);
        tracker.complete(enhancedStream);
      },
      complete: async () => {
        await strictReceiver.complete();
        tracker.complete(enhancedStream);
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
