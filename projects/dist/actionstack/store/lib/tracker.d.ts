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
export declare const createTracker: () => Tracker;
