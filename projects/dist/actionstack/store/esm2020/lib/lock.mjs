/**
 * Creates a new instance of a simple lock.
 * Allows acquiring and releasing the lock, with queued resolvers when the lock is held.
 *
 * @returns {SimpleLock} - The lock object with acquire and release methods.
 */
export const createLock = () => {
    let isLocked = false; // Tracks whether the lock is held
    const queue = []; // Queue to store waiting promise resolvers
    const acquire = () => new Promise((resolve) => {
        if (!isLocked) {
            isLocked = true;
            resolve(); // Immediately resolve if the lock is free
        }
        else {
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
        }
        else {
            isLocked = false; // No more waiting, so release the lock
        }
    };
    return { acquire, release };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL2xpYnJhcmllcy9hY3Rpb25zdGFjay9zdG9yZS9zcmMvbGliL2xvY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBU0E7Ozs7O0dBS0c7QUFDSCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsR0FBZSxFQUFFO0lBQ3pDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLGtDQUFrQztJQUN4RCxNQUFNLEtBQUssR0FBc0IsRUFBRSxDQUFDLENBQUMsMkNBQTJDO0lBRWhGLE1BQU0sT0FBTyxHQUFHLEdBQUcsRUFBRSxDQUNuQixJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxFQUFFO1FBQzVCLElBQUksQ0FBQyxRQUFRLEVBQUU7WUFDYixRQUFRLEdBQUcsSUFBSSxDQUFDO1lBQ2hCLE9BQU8sRUFBRSxDQUFDLENBQUMsMENBQTBDO1NBQ3REO2FBQU07WUFDTCxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsd0NBQXdDO1NBQzlEO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFTCxNQUFNLE9BQU8sR0FBRyxHQUFHLEVBQUU7UUFDbkIsSUFBSSxDQUFDLFFBQVEsRUFBRTtZQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsNkNBQTZDLENBQUMsQ0FBQztTQUNoRTtRQUVELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQyxJQUFJLFdBQVcsRUFBRTtZQUNmLFdBQVcsRUFBRSxDQUFDLENBQUMsc0RBQXNEO1lBQ3JFLDhFQUE4RTtTQUMvRTthQUFNO1lBQ0wsUUFBUSxHQUFHLEtBQUssQ0FBQyxDQUFDLHVDQUF1QztTQUMxRDtJQUNILENBQUMsQ0FBQztJQUVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7QUFDOUIsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEEgc2ltcGxlIGxvY2sgdG8gY29udHJvbCBhY2Nlc3MgdG8gYSBzaGFyZWQgcmVzb3VyY2UuXHJcbiAqIEVuc3VyZXMgb25seSBvbmUgb3BlcmF0aW9uIGNhbiBhY3F1aXJlIHRoZSBsb2NrIGF0IGEgdGltZS5cclxuICovXHJcbmV4cG9ydCB0eXBlIFNpbXBsZUxvY2sgPSB7XHJcbiAgYWNxdWlyZTogKCkgPT4gUHJvbWlzZTx2b2lkPjtcclxuICByZWxlYXNlOiAoKSA9PiB2b2lkO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBuZXcgaW5zdGFuY2Ugb2YgYSBzaW1wbGUgbG9jay5cclxuICogQWxsb3dzIGFjcXVpcmluZyBhbmQgcmVsZWFzaW5nIHRoZSBsb2NrLCB3aXRoIHF1ZXVlZCByZXNvbHZlcnMgd2hlbiB0aGUgbG9jayBpcyBoZWxkLlxyXG4gKlxyXG4gKiBAcmV0dXJucyB7U2ltcGxlTG9ja30gLSBUaGUgbG9jayBvYmplY3Qgd2l0aCBhY3F1aXJlIGFuZCByZWxlYXNlIG1ldGhvZHMuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgY3JlYXRlTG9jayA9ICgpOiBTaW1wbGVMb2NrID0+IHtcclxuICBsZXQgaXNMb2NrZWQgPSBmYWxzZTsgLy8gVHJhY2tzIHdoZXRoZXIgdGhlIGxvY2sgaXMgaGVsZFxyXG4gIGNvbnN0IHF1ZXVlOiBBcnJheTwoKSA9PiB2b2lkPiA9IFtdOyAvLyBRdWV1ZSB0byBzdG9yZSB3YWl0aW5nIHByb21pc2UgcmVzb2x2ZXJzXHJcblxyXG4gIGNvbnN0IGFjcXVpcmUgPSAoKSA9PlxyXG4gICAgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHtcclxuICAgICAgaWYgKCFpc0xvY2tlZCkge1xyXG4gICAgICAgIGlzTG9ja2VkID0gdHJ1ZTtcclxuICAgICAgICByZXNvbHZlKCk7IC8vIEltbWVkaWF0ZWx5IHJlc29sdmUgaWYgdGhlIGxvY2sgaXMgZnJlZVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHF1ZXVlLnB1c2gocmVzb2x2ZSk7IC8vIE90aGVyd2lzZSwgcXVldWUgdGhlIHJlc29sdmUgZnVuY3Rpb25cclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gIGNvbnN0IHJlbGVhc2UgPSAoKSA9PiB7XHJcbiAgICBpZiAoIWlzTG9ja2VkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCByZWxlYXNlIGEgbG9jayB0aGF0IGlzIG5vdCBhY3F1aXJlZC5cIik7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbmV4dFJlc29sdmUgPSBxdWV1ZS5zaGlmdCgpO1xyXG4gICAgaWYgKG5leHRSZXNvbHZlKSB7XHJcbiAgICAgIG5leHRSZXNvbHZlKCk7IC8vIEFsbG93IHRoZSBuZXh0IHdhaXRpbmcgZnVuY3Rpb24gdG8gYWNxdWlyZSB0aGUgbG9ja1xyXG4gICAgICAvLyBLZWVwIGBpc0xvY2tlZGAgYXMgdHJ1ZSBiZWNhdXNlIHRoZSBsb2NrIGlzIHN0aWxsIGhlbGQgYnkgdGhlIG5leHQgcmVzb2x2ZXJcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlzTG9ja2VkID0gZmFsc2U7IC8vIE5vIG1vcmUgd2FpdGluZywgc28gcmVsZWFzZSB0aGUgbG9ja1xyXG4gICAgfVxyXG4gIH07XHJcblxyXG4gIHJldHVybiB7IGFjcXVpcmUsIHJlbGVhc2UgfTtcclxufTtcclxuIl19