import { BehaviorSubject, createBehaviorSubject, Stream } from "@actioncrew/streamix";

/**
 * A utility type for tracking the execution status of Streams.
 */
export type Tracker = {
  /**
   * Execution timeout in milliseconds.
   */
  timeout: number;

  /**
   * Gets the execution status of a tracked Stream.
   *
   * @param {Stream<any>} entry - The Stream to check the status for.
   * @returns {boolean} - `true` if the Stream is executing, `false` otherwise.
   */
  getStatus: (entry: Stream<any>) => boolean;

  /**
   * Sets the execution status of a tracked Stream.
   *
   * @param {Stream<any>} entry - The Stream to update the status for.
   * @param {boolean} value - The new execution status.
   */
  setStatus: (entry: Stream<any>, value: boolean) => void;

  /**
   * Marks a tracked Stream as completed.
   *
   * @param {Stream<any>} entry - The Stream to mark as completed.
   */
  complete: (entry: Stream<any>) => void;

  /**
   * Tracks a new Stream.
   *
   * @param {Stream<any>} Stream - The Stream to start tracking.
   */
  track: (Stream: Stream<any>) => void;

  /**
   * Removes a tracked Stream and unsubscribes its BehaviorSubject.
   *
   * @param {Stream<any>} Stream - The Stream to stop tracking.
   */
  remove: (Stream: Stream<any>) => void;

  /**
   * Resets the execution status of all tracked Streams to `false`.
   */
  reset: () => void;

  /**
   * Asynchronously checks if all tracked Streams have completed within a timeout period.
   *
   * @returns {Promise<void>} - Resolves if all Streams complete within the timeout, rejects otherwise.
   */
  allExecuted: () => Promise<void>;
};

/**
 * Creates a new functional Tracker for managing the execution status of Streams.
 *
 * @returns {Tracker} - A Tracker instance.
 */
export const createTracker = (): Tracker => {
  const entries = new Map<Stream<any>, BehaviorSubject<boolean>>();
  const timeout = 30000;

  /**
   * Gets the execution status of a tracked Stream.
   */
  const getStatus: Tracker['getStatus'] = (entry) =>
    entries.get(entry)?.value === true;

  /**
   * Sets the execution status of a tracked Stream.
   */
  const setStatus: Tracker['setStatus'] = (entry, value) =>
    entries.get(entry)?.next(value);

  /**
   * Marks a tracked Stream as completed.
   */
  const setCompletion: Tracker['complete'] = (entry) =>
    entries.get(entry)?.complete();

  /**
   * Tracks a new Stream.
   */
  const track: Tracker['track'] = (Stream) => {
    if (!entries.has(Stream)) {
      const subject = createBehaviorSubject<boolean>(false);
      entries.set(Stream, subject);
    }
  };

  /**
   * Removes a tracked Stream and unsubscribes its BehaviorSubject.
   */
  const remove: Tracker['remove'] = (Stream) => {
    const subject = entries.get(Stream);
    if (subject) {
      entries.delete(Stream);
      subject.complete();
    }
  };

  /**
   * Resets the execution status of all tracked Streams to `false`.
   */
  const reset: Tracker['reset'] = () => {
    for (const [key, value] of [...entries.entries()]) {
      if (value.completed()) {
        entries.delete(key);
      } else {
        value.next(false);
      }
    }
  };

  /**
   * Asynchronously checks if all tracked Streams have completed within a timeout period.
   */
  const allExecuted: Tracker['allExecuted'] = () =>
    new Promise<void>((resolve, reject) => {
      if ([...entries.values()].length === 0) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => reject('Timeout reached'), timeout);
      let numPending = [...entries.values()].length;

      const handleCompletion = () => {
        numPending--;
        if (numPending === 0) {
          clearTimeout(timeoutId);
          resolve();
        }
      };

      const handleError = (error: any) => {
        clearTimeout(timeoutId);
        reject(error);
      };

      [...entries.values()].forEach((subject) => {
        subject.subscribe({
          next: handleCompletion,
          error: handleError,
          complete: handleCompletion,
        });
      });
    });

  return {
    timeout,
    getStatus,
    setStatus,
    complete: setCompletion,
    track,
    remove,
    reset,
    allExecuted,
  };
};
