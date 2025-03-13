import { Action, isSystemActionType, salt } from '@actioncrew/actionstack';

/**
 * Creates a middleware function for logging action performance data.
 *
 * @returns {Function} - The middleware function to be added to the Actionstack middleware chain.
 */
export const createPerformanceMonitor = () => {
  const perfmon = () => (next: Function) => async (action: Action<any>): Promise<any> => {
    async function processAction(action: Action<any>) {
      const startTime = performance.now(); // Capture the start time

      await next(action); // Dispatch the action using the next middleware

      const endTime = performance.now(); // Capture the end time
      const duration = Math.round((endTime - startTime) * 100000) / 100000;

      // Generate a unique identifier based on system action type or a random string
      const uniqueId = (isSystemActionType(action.type))
        ? `[⚙️ ${salt(5).split('').join('.')}]`
        : `[🤹 ${salt(5).split('').join('.')}]`;

      console.groupCollapsed(
        `%caction %c${action.type}%c @ ${new Date().toISOString()} (duration: ${duration.toFixed(5)} ms)\n${uniqueId}`,
        'color: gray; font-weight: lighter;', // styles for 'action'
        'color: black; font-weight: bold;',   // styles for action label
        'color: gray; font-weight: lighter;'  // styles for the rest of the string
      );

      console.groupEnd();
    }

    return await processAction(action);
  };

  perfmon.signature = '2.m.z.d.u.x.w.l.v.e';
  return perfmon;
};

// Create a pre-configured instance of the performance middleware
export const perfmon = createPerformanceMonitor();
