import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';

/**
 * A utility type for tracking the execution status of Observables.
 */
export type Tracker = {
  /**
   * Execution timeout in milliseconds.
   */
  timeout: number;

  /**
   * Gets the execution status of a tracked Observable.
   *
   * @param {Observable<any>} entry - The Observable to check the status for.
   * @returns {boolean} - `true` if the Observable is executing, `false` otherwise.
   */
  getStatus: (entry: Observable<any>) => boolean;

  /**
   * Sets the execution status of a tracked Observable.
   *
   * @param {Observable<any>} entry - The Observable to update the status for.
   * @param {boolean} value - The new execution status.
   */
  setStatus: (entry: Observable<any>, value: boolean) => void;

  /**
   * Marks a tracked Observable as completed.
   *
   * @param {Observable<any>} entry - The Observable to mark as completed.
   */
  complete: (entry: Observable<any>) => void;

  /**
   * Tracks a new Observable.
   *
   * @param {Observable<any>} observable - The Observable to start tracking.
   */
  track: (observable: Observable<any>) => void;

  /**
   * Removes a tracked Observable and unsubscribes its BehaviorSubject.
   *
   * @param {Observable<any>} observable - The Observable to stop tracking.
   */
  remove: (observable: Observable<any>) => void;

  /**
   * Resets the execution status of all tracked Observables to `false`.
   */
  reset: () => void;

  /**
   * Asynchronously checks if all tracked Observables have completed within a timeout period.
   *
   * @returns {Promise<void>} - Resolves if all Observables complete within the timeout, rejects otherwise.
   */
  allExecuted: () => Promise<void>;
};

/**
 * Creates a new functional Tracker for managing the execution status of Observables.
 *
 * @returns {Tracker} - A Tracker instance.
 */
export const createTracker = (): Tracker => {
  const entries = new Map<Observable<any>, BehaviorSubject<boolean>>();
  const timeout = 30000;

  /**
   * Gets the execution status of a tracked Observable.
   */
  const getStatus: Tracker['getStatus'] = (entry) =>
    entries.get(entry)?.value === true;

  /**
   * Sets the execution status of a tracked Observable.
   */
  const setStatus: Tracker['setStatus'] = (entry, value) =>
    entries.get(entry)?.next(value);

  /**
   * Marks a tracked Observable as completed.
   */
  const setCompletion: Tracker['complete'] = (entry) =>
    entries.get(entry)?.complete();

  /**
   * Tracks a new Observable.
   */
  const track: Tracker['track'] = (observable) => {
    if (!entries.has(observable)) {
      const subject = new BehaviorSubject<boolean>(false);
      entries.set(observable, subject);
    }
  };

  /**
   * Removes a tracked Observable and unsubscribes its BehaviorSubject.
   */
  const remove: Tracker['remove'] = (observable) => {
    const subject = entries.get(observable);
    if (subject) {
      entries.delete(observable);
      subject.complete();
    }
  };

  /**
   * Resets the execution status of all tracked Observables to `false`.
   */
  const reset: Tracker['reset'] = () => {
    for (const [key, value] of [...entries.entries()]) {
      if (value.closed) {
        entries.delete(key);
      } else {
        value.next(false);
      }
    }
  };

  /**
   * Asynchronously checks if all tracked Observables have completed within a timeout period.
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
