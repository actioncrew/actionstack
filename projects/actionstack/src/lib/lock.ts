/**
 * A simple lock to control access to a shared resource.
 * Ensures only one operation can acquire the lock at a time.
 */
export type SimpleLock = {
  acquire: () => Promise<void>;
  release: () => void;
};

/**
 * Creates a new instance of a simple lock.
 * Allows acquiring and releasing the lock, with queued resolvers when the lock is held.
 *
 * @returns {SimpleLock} - The lock object with acquire and release methods.
 */
export const createLock = (): SimpleLock => {
  let isLocked = false; // Tracks whether the lock is held
  const queue: Array<() => void> = []; // Queue to store waiting promise resolvers

  const acquire = () =>
    new Promise<void>((resolve) => {
      if (!isLocked) {
        isLocked = true;
        resolve(); // Immediately resolve if the lock is free
      } else {
        queue.push(resolve); // Otherwise, queue the resolve function
      }
    });

  const release = () => {
    if (!isLocked) {
      throw new Error("Cannot release a lock that is not acquired.");
    }

    const nextResolve = queue.shift();
    if (nextResolve) {
      nextResolve(); // Allow the next waiting function to acquire the lock
      // Keep `isLocked` as true because the lock is still held by the next resolver
    } else {
      isLocked = false; // No more waiting, so release the lock
    }
  };

  return { acquire, release };
};
