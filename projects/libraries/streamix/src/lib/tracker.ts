import { BehaviorSubject, createBehaviorSubject, Stream } from "@actioncrew/streamix";

/**
 * A utility type for tracking the execution status of Streams.
 */
export type Tracker = {
  timeout: number;
  getStatus: (entry: Stream<any>) => boolean;
  setStatus: (entry: Stream<any>, value: boolean) => void;
  complete: (entry: Stream<any>) => void;
  track: (entry: Stream<any>) => void;
  remove: (entry: Stream<any>) => void;
  reset: () => void;
  allExecuted: () => Promise<void>;
};

/**
 * Creates a new Tracker for managing the execution status of Streams.
 */
export const createTracker = (): Tracker => {
  const entries = new Map<Stream<any>, { status$: BehaviorSubject<boolean>; status: boolean }>();
  const timeout = 30000;

  const getStatus: Tracker['getStatus'] = (entry) => entries.get(entry)?.status ?? false;

  const setStatus: Tracker['setStatus'] = (entry, value) => {
    const entryData = entries.get(entry);
    if (entryData) {
      entryData.status = value;
      entryData.status$.next(value);
    }
  };

  const complete: Tracker['complete'] = (entry) => {
    const entryData = entries.get(entry);
    if (entryData) {
      entryData.status = false;
      entryData.status$.complete();
      entries.delete(entry);
    }
  };

  const track: Tracker['track'] = (entry) => {
    if (!entries.has(entry)) {
      const subject = createBehaviorSubject<boolean>(false);
      entries.set(entry, { status$: subject, status: false });
    }
  };

  const remove: Tracker['remove'] = (entry) => {
    const entryData = entries.get(entry);
    if (entryData) {
      entryData.status$.complete();
      entries.delete(entry);
    }
  };

  const reset: Tracker['reset'] = () => {
    for (const entryData of entries.values()) {
      entryData.status = false;
      entryData.status$.next(false);
    }
  };

  const allExecuted: Tracker['allExecuted'] = () =>
    new Promise<void>((resolve, reject) => {
      if (entries.size === 0) {
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => reject("Timeout reached"), timeout);
      let pending = entries.size;

      const handleCompletion = () => {
        pending--;
        if (pending === 0) {
          clearTimeout(timeoutId);
          resolve();
        }
      };

      for (const entryData of entries.values()) {
        entryData.status$.subscribe({
          next: (status) => {
            if (!status) handleCompletion();
          },
          complete: handleCompletion,
        });
      }
    });

  return { timeout, getStatus, setStatus, complete, track, remove, reset, allExecuted };
};
