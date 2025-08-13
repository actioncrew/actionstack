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
export declare const createLock: () => SimpleLock;
