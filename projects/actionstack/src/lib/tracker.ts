import { Observable } from "rxjs/internal/Observable";
import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";

/**
 * A utility type for tracking the execution status of Streams.
 */
export type Tracker = {
  /** Total number of registered selectors */
  totalCount: number;

  /** Number of selectors processed (e.g., emitted at least once) */
  processedCount: number;

  /** Register a new selector */
  track: () => void;

  /** Mark a selector as processed */
  setProcessed: () => void;

  /** Reset counts */
  reset: () => void;

  /** Removes selector from observation */
  complete: () => void;

  /** Returns a Promise that resolves when all registered selectors have been processed */
  allExecuted: () => Promise<void>;
};

export const createTracker = (): Tracker => {
  let totalCount = 0;
  let processedCount = 0;
  let resolveAll: (() => void) | null = null;

  const track = () => {
    totalCount++;
  };

  const setProcessed = () => {
    processedCount++;
    if (processedCount >= totalCount && resolveAll) {
      resolveAll();
      resolveAll = null;
    }
  };

  const reset = () => {
    totalCount = 0;
    processedCount = 0;
    resolveAll = null;
  };

  const complete = () => {
    totalCount--;
    checkComplete();
  };

  const checkComplete = () => {
    if (processedCount >= totalCount && resolveAll) {
      resolveAll();
      resolveAll = null;
    }
  };

  const allExecuted = () =>
    new Promise<void>((resolve) => {
      if (processedCount >= totalCount) {
        resolve();
      } else {
        resolveAll = resolve;
      }
    });

  return {
    get totalCount() {
      return totalCount;
    },
    get processedCount() {
      return processedCount;
    },
    track,
    setProcessed,
    reset,
    complete,
    allExecuted,
  };
};
