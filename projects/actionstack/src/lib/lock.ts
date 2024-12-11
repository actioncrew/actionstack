export type Lock = {
  acquire: () => Promise<void>;
  release: () => void;
};

export const createLock = (): Lock => {
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
