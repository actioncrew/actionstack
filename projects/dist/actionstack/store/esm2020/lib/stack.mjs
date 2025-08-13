import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
/**
 * Factory methods for creating operations of different types.
 */
export const createInstruction = {
    /**
     * Creates an instruction for an action or async action.
     * @param action The action or async action to wrap in an instruction.
     * @returns The corresponding instruction.
     */
    action: (action) => {
        const operationType = typeof action === 'function' ? "asyncAction" : "action";
        const source = action.source;
        return { type: operationType, instance: action, context: source };
    },
    /**
     * Creates an instruction for a saga.
     * @param saga The saga function.
     * @returns The corresponding instruction.
     */
    saga: (saga) => ({ type: "saga", instance: saga }),
    /**
     * Creates an instruction for an epic.
     * @param epic The epic function.
     * @returns The corresponding instruction.
     */
    epic: (epic) => ({ type: "epic", instance: epic }),
};
/**
 * Checks if the given object is a valid Instruction.
 * @param obj The object to check.
 * @returns True if the object is a valid Instruction, false otherwise.
 */
export const isInstruction = (obj) => {
    return obj?.type !== undefined && obj?.instance !== undefined;
};
/**
 * Creates a stack for managing operations with observable capabilities.
 * This stack allows you to add, remove, and query instructions (operations),
 * as well as observe changes to the stack.
 */
export const createExecutionStack = () => {
    const stack$ = new BehaviorSubject([]);
    return {
        /**
         * Gets the current length of the stack.
         * @returns The length of the stack.
         */
        get length() {
            return stack$.value.length;
        },
        /**
         * Adds an operation to the stack.
         * @param item The operation (instruction) to add.
         */
        add(item) {
            stack$.next([...stack$.value, item]);
        },
        /**
         * Retrieves the top operation in the stack without removing it.
         * @returns The top operation or undefined if the stack is empty.
         */
        peek() {
            return stack$.value[stack$.value.length - 1];
        },
        /**
         * Removes the specified operation from the stack.
         * @param item The operation to remove.
         * @returns The removed operation or undefined if the operation was not found.
         */
        remove(item) {
            const index = stack$.value.lastIndexOf(item);
            if (index > -1) {
                const newStack = stack$.value.filter((_, i) => i !== index);
                stack$.next(newStack);
                return item;
            }
            return undefined;
        },
        /**
         * Clears all operations from the stack.
         */
        clear() {
            stack$.next([]);
        },
        /**
         * Converts the stack to an array of instructions.
         * @returns An array of instructions.
         */
        toArray() {
            return [...stack$.value];
        },
        /**
         * Finds the last operation in the stack that satisfies a given condition.
         * @param condition The condition to match the operation.
         * @returns The last matching operation or undefined if no match is found.
         */
        findLast(condition) {
            return stack$.value.slice().reverse().find(condition);
        },
        /**
         * Waits for the stack to become empty.
         * @returns A promise that resolves when the stack is empty.
         */
        waitForEmpty() {
            return waitFor(stack$, stack => stack.length === 0);
        },
        /**
         * Waits for the stack to become idle (i.e., no "action" operations are in progress).
         * @returns A promise that resolves when the stack becomes idle.
         */
        waitForIdle() {
            return waitFor(stack$, stack => !stack.some(item => item.type === "action"));
        },
        /**
         * Exposes the underlying observable stream for external subscription.
         */
        get observable() {
            return stack$.asObservable();
        },
    };
};
/**
 * Waits for a condition to be met in an observable stream.
 * @template T
 * @param obs The observable stream to observe.
 * @param predicate A predicate function to evaluate each emitted value.
 * @returns A promise that resolves when the condition is met.
 */
function waitFor(obs, predicate) {
    return new Promise((resolve, reject) => {
        const subscription = obs.subscribe({
            next: value => {
                if (predicate(value)) {
                    subscription.unsubscribe();
                    resolve(value);
                }
            },
            error: reject,
            complete: () => reject("Observable completed before condition was met"),
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9saWJyYXJpZXMvYWN0aW9uc3RhY2svc3RvcmUvc3JjL2xpYi9zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFrQmhFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUc7SUFDL0I7Ozs7T0FJRztJQUNILE1BQU0sRUFBRSxDQUFDLE1BQTRCLEVBQWUsRUFBRTtRQUNwRCxNQUFNLGFBQWEsR0FBb0IsT0FBTyxNQUFNLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUMvRixNQUFNLE1BQU0sR0FBSSxNQUFjLENBQUMsTUFBTSxDQUFDO1FBQ3RDLE9BQU8sRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO0lBQ3BFLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsSUFBSSxFQUFFLENBQUMsSUFBYyxFQUFlLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFFekU7Ozs7T0FJRztJQUNILElBQUksRUFBRSxDQUFDLElBQWMsRUFBZSxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDO0NBQzFFLENBQUM7QUFFRjs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLENBQUMsR0FBUSxFQUFXLEVBQUU7SUFDakQsT0FBTyxHQUFHLEVBQUUsSUFBSSxLQUFLLFNBQVMsSUFBSSxHQUFHLEVBQUUsUUFBUSxLQUFLLFNBQVMsQ0FBQztBQUNoRSxDQUFDLENBQUM7QUFrQkY7Ozs7R0FJRztBQUNILE1B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SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCZWhhdmlvclN1YmplY3QgfSBmcm9tICdyeGpzL2ludGVybmFsL0JlaGF2aW9yU3ViamVjdCc7XHJcbmltcG9ydCB7IE9ic2VydmFibGUgfSBmcm9tICdyeGpzL2ludGVybmFsL09ic2VydmFibGUnO1xyXG5pbXBvcnQgeyBBY3Rpb24sIEFzeW5jQWN0aW9uIH0gZnJvbSAnLi90eXBlcyc7XHJcblxyXG4vKipcclxuICogUmVwcmVzZW50cyB0aGUgdHlwZSBvZiBhbiBvcGVyYXRpb24gKGFjdGlvbiwgYXN5bmNBY3Rpb24sIGVwaWMsIG9yIHNhZ2EpLlxyXG4gKi9cclxuZXhwb3J0IHR5cGUgSW5zdHJ1Y3Rpb25UeXBlID0gXCJhY3Rpb25cIiB8IFwiYXN5bmNBY3Rpb25cIiB8IFwiZXBpY1wiIHwgXCJzYWdhXCI7XHJcblxyXG4vKipcclxuICogUmVwcmVzZW50cyBhbiBvcGVyYXRpb24gd2l0aCBhIHNwZWNpZmllZCB0eXBlIGFuZCBpbnN0YW5jZSwgYW5kIG9wdGlvbmFsbHkgYSBjb250ZXh0LlxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBJbnN0cnVjdGlvbiB7XHJcbiAgdHlwZTogSW5zdHJ1Y3Rpb25UeXBlO1xyXG4gIGluc3RhbmNlOiBhbnk7XHJcbiAgY29udGV4dD86IEluc3RydWN0aW9uO1xyXG59XHJcblxyXG4vKipcclxuICogRmFjdG9yeSBtZXRob2RzIGZvciBjcmVhdGluZyBvcGVyYXRpb25zIG9mIGRpZmZlcmVudCB0eXBlcy5cclxuICovXHJcbmV4cG9ydCBjb25zdCBjcmVhdGVJbnN0cnVjdGlvbiA9IHtcclxuICAvKipcclxuICAgKiBDcmVhdGVzIGFuIGluc3RydWN0aW9uIGZvciBhbiBhY3Rpb24gb3IgYXN5bmMgYWN0aW9uLlxyXG4gICAqIEBwYXJhbSBhY3Rpb24gVGhlIGFjdGlvbiBvciBhc3luYyBhY3Rpb24gdG8gd3JhcCBpbiBhbiBpbnN0cnVjdGlvbi5cclxuICAgKiBAcmV0dXJucyBUaGUgY29ycmVzcG9uZGluZyBpbnN0cnVjdGlvbi5cclxuICAgKi9cclxuICBhY3Rpb246IChhY3Rpb246IEFjdGlvbiB8IEFzeW5jQWN0aW9uKTogSW5zdHJ1Y3Rpb24gPT4ge1xyXG4gICAgY29uc3Qgb3BlcmF0aW9uVHlwZTogSW5zdHJ1Y3Rpb25UeXBlID0gdHlwZW9mIGFjdGlvbiA9PT0gJ2Z1bmN0aW9uJyA/IFwiYXN5bmNBY3Rpb25cIiA6IFwiYWN0aW9uXCI7XHJcbiAgICBjb25zdCBzb3VyY2UgPSAoYWN0aW9uIGFzIGFueSkuc291cmNlO1xyXG4gICAgcmV0dXJuIHsgdHlwZTogb3BlcmF0aW9uVHlwZSwgaW5zdGFuY2U6IGFjdGlvbiwgY29udGV4dDogc291cmNlIH07XHJcbiAgfSxcclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhbiBpbnN0cnVjdGlvbiBmb3IgYSBzYWdhLlxyXG4gICAqIEBwYXJhbSBzYWdhIFRoZSBzYWdhIGZ1bmN0aW9uLlxyXG4gICAqIEByZXR1cm5zIFRoZSBjb3JyZXNwb25kaW5nIGluc3RydWN0aW9uLlxyXG4gICAqL1xyXG4gIHNhZ2E6IChzYWdhOiBGdW5jdGlvbik6IEluc3RydWN0aW9uID0+ICh7IHR5cGU6IFwic2FnYVwiLCBpbnN0YW5jZTogc2FnYSB9KSxcclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlcyBhbiBpbnN0cnVjdGlvbiBmb3IgYW4gZXBpYy5cclxuICAgKiBAcGFyYW0gZXBpYyBUaGUgZXBpYyBmdW5jdGlvbi5cclxuICAgKiBAcmV0dXJucyBUaGUgY29ycmVzcG9uZGluZyBpbnN0cnVjdGlvbi5cclxuICAgKi9cclxuICBlcGljOiAoZXBpYzogRnVuY3Rpb24pOiBJbnN0cnVjdGlvbiA9PiAoeyB0eXBlOiBcImVwaWNcIiwgaW5zdGFuY2U6IGVwaWMgfSksXHJcbn07XHJcblxyXG4vKipcclxuICogQ2hlY2tzIGlmIHRoZSBnaXZlbiBvYmplY3QgaXMgYSB2YWxpZCBJbnN0cnVjdGlvbi5cclxuICogQHBhcmFtIG9iaiBUaGUgb2JqZWN0IHRvIGNoZWNrLlxyXG4gKiBAcmV0dXJucyBUcnVlIGlmIHRoZSBvYmplY3QgaXMgYSB2YWxpZCBJbnN0cnVjdGlvbiwgZmFsc2Ugb3RoZXJ3aXNlLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGlzSW5zdHJ1Y3Rpb24gPSAob2JqOiBhbnkpOiBib29sZWFuID0+IHtcclxuICByZXR1cm4gb2JqPy50eXBlICE9PSB1bmRlZmluZWQgJiYgb2JqPy5pbnN0YW5jZSAhPT0gdW5kZWZpbmVkO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlcHJlc2VudHMgYSBzdGFjayBmb3IgbWFuYWdpbmcgb3BlcmF0aW9ucyB3aXRoIG9ic2VydmFibGUgY2FwYWJpbGl0aWVzLlxyXG4gKi9cclxuZXhwb3J0IHR5cGUgRXhlY3V0aW9uU3RhY2sgPSB7XHJcbiAgbGVuZ3RoOiBudW1iZXI7XHJcbiAgYWRkOiAoaXRlbTogSW5zdHJ1Y3Rpb24pID0+IHZvaWQ7XHJcbiAgcGVlazogKCkgPT4gSW5zdHJ1Y3Rpb24gfCB1bmRlZmluZWQ7XHJcbiAgcmVtb3ZlOiAoaXRlbTogSW5zdHJ1Y3Rpb24pID0+IEluc3RydWN0aW9uIHwgdW5kZWZpbmVkO1xyXG4gIGNsZWFyOiAoKSA9PiB2b2lkO1xyXG4gIHRvQXJyYXk6ICgpID0+IEluc3RydWN0aW9uW107XHJcbiAgZmluZExhc3Q6IChjb25kaXRpb246IChlbGVtZW50OiBJbnN0cnVjdGlvbikgPT4gYm9vbGVhbikgPT4gSW5zdHJ1Y3Rpb24gfCB1bmRlZmluZWQ7XHJcbiAgd2FpdEZvckVtcHR5OiAoKSA9PiBQcm9taXNlPEluc3RydWN0aW9uW10+O1xyXG4gIHdhaXRGb3JJZGxlOiAoKSA9PiBQcm9taXNlPEluc3RydWN0aW9uW10+O1xyXG4gIG9ic2VydmFibGU6IE9ic2VydmFibGU8SW5zdHJ1Y3Rpb25bXT47XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGVzIGEgc3RhY2sgZm9yIG1hbmFnaW5nIG9wZXJhdGlvbnMgd2l0aCBvYnNlcnZhYmxlIGNhcGFiaWxpdGllcy5cclxuICogVGhpcyBzdGFjayBhbGxvd3MgeW91IHRvIGFkZCwgcmVtb3ZlLCBhbmQgcXVlcnkgaW5zdHJ1Y3Rpb25zIChvcGVyYXRpb25zKSxcclxuICogYXMgd2VsbCBhcyBvYnNlcnZlIGNoYW5nZXMgdG8gdGhlIHN0YWNrLlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGNyZWF0ZUV4ZWN1dGlvblN0YWNrID0gKCkgPT4ge1xyXG4gIGNvbnN0IHN0YWNrJCA9IG5ldyBCZWhhdmlvclN1YmplY3Q8SW5zdHJ1Y3Rpb25bXT4oW10pO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgLyoqXHJcbiAgICAgKiBHZXRzIHRoZSBjdXJyZW50IGxlbmd0aCBvZiB0aGUgc3RhY2suXHJcbiAgICAgKiBAcmV0dXJucyBUaGUgbGVuZ3RoIG9mIHRoZSBzdGFjay5cclxuICAgICAqL1xyXG4gICAgZ2V0IGxlbmd0aCgpOiBudW1iZXIge1xyXG4gICAgICByZXR1cm4gc3RhY2skLnZhbHVlLmxlbmd0aDtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBBZGRzIGFuIG9wZXJhdGlvbiB0byB0aGUgc3RhY2suXHJcbiAgICAgKiBAcGFyYW0gaXRlbSBUaGUgb3BlcmF0aW9uIChpbnN0cnVjdGlvbikgdG8gYWRkLlxyXG4gICAgICovXHJcbiAgICBhZGQoaXRlbTogSW5zdHJ1Y3Rpb24pOiB2b2lkIHtcclxuICAgICAgc3RhY2skLm5leHQoWy4uLnN0YWNrJC52YWx1ZSwgaXRlbV0pO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJldHJpZXZlcyB0aGUgdG9wIG9wZXJhdGlvbiBpbiB0aGUgc3RhY2sgd2l0aG91dCByZW1vdmluZyBpdC5cclxuICAgICAqIEByZXR1cm5zIFRoZSB0b3Agb3BlcmF0aW9uIG9yIHVuZGVmaW5lZCBpZiB0aGUgc3RhY2sgaXMgZW1wdHkuXHJcbiAgICAgKi9cclxuICAgIHBlZWsoKTogSW5zdHJ1Y3Rpb24gfCB1bmRlZmluZWQge1xyXG4gICAgICByZXR1cm4gc3RhY2skLnZhbHVlW3N0YWNrJC52YWx1ZS5sZW5ndGggLSAxXTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZW1vdmVzIHRoZSBzcGVjaWZpZWQgb3BlcmF0aW9uIGZyb20gdGhlIHN0YWNrLlxyXG4gICAgICogQHBhcmFtIGl0ZW0gVGhlIG9wZXJhdGlvbiB0byByZW1vdmUuXHJcbiAgICAgKiBAcmV0dXJucyBUaGUgcmVtb3ZlZCBvcGVyYXRpb24gb3IgdW5kZWZpbmVkIGlmIHRoZSBvcGVyYXRpb24gd2FzIG5vdCBmb3VuZC5cclxuICAgICAqL1xyXG4gICAgcmVtb3ZlKGl0ZW06IEluc3RydWN0aW9uKTogSW5zdHJ1Y3Rpb24gfCB1bmRlZmluZWQge1xyXG4gICAgICBjb25zdCBpbmRleCA9IHN0YWNrJC52YWx1ZS5sYXN0SW5kZXhPZihpdGVtKTtcclxuICAgICAgaWYgKGluZGV4ID4gLTEpIHtcclxuICAgICAgICBjb25zdCBuZXdTdGFjayA9IHN0YWNrJC52YWx1ZS5maWx0ZXIoKF8sIGkpID0+IGkgIT09IGluZGV4KTtcclxuICAgICAgICBzdGFjayQubmV4dChuZXdTdGFjayk7XHJcbiAgICAgICAgcmV0dXJuIGl0ZW07XHJcbiAgICAgIH1cclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDbGVhcnMgYWxsIG9wZXJhdGlvbnMgZnJvbSB0aGUgc3RhY2suXHJcbiAgICAgKi9cclxuICAgIGNsZWFyKCk6IHZvaWQge1xyXG4gICAgICBzdGFjayQubmV4dChbXSk7XHJcbiAgICB9LFxyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ29udmVydHMgdGhlIHN0YWNrIHRvIGFuIGFycmF5IG9mIGluc3RydWN0aW9ucy5cclxuICAgICAqIEByZXR1cm5zIEFuIGFycmF5IG9mIGluc3RydWN0aW9ucy5cclxuICAgICAqL1xyXG4gICAgdG9BcnJheSgpOiBJbnN0cnVjdGlvbltdIHtcclxuICAgICAgcmV0dXJuIFsuLi5zdGFjayQudmFsdWVdO1xyXG4gICAgfSxcclxuXHJcbiAgICAvKipcclxuICAgICAqIEZpbmRzIHRoZSBsYXN0IG9wZXJhdGlvbiBpbiB0aGUgc3RhY2sgdGhhdCBzYXRpc2ZpZXMgYSBnaXZlbiBjb25kaXRpb24uXHJcbiAgICAgKiBAcGFyYW0gY29uZGl0aW9uIFRoZSBjb25kaXRpb24gdG8gbWF0Y2ggdGhlIG9wZXJhdGlvbi5cclxuICAgICAqIEByZXR1cm5zIFRoZSBsYXN0IG1hdGNoaW5nIG9wZXJhdGlvbiBvciB1bmRlZmluZWQgaWYgbm8gbWF0Y2ggaXMgZm91bmQuXHJcbiAgICAgKi9cclxuICAgIGZpbmRMYXN0KGNvbmRpdGlvbjogKGVsZW1lbnQ6IEluc3RydWN0aW9uKSA9PiBib29sZWFuKTogSW5zdHJ1Y3Rpb24gfCB1bmRlZmluZWQge1xyXG4gICAgICByZXR1cm4gc3RhY2skLnZhbHVlLnNsaWNlKCkucmV2ZXJzZSgpLmZpbmQoY29uZGl0aW9uKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXYWl0cyBmb3IgdGhlIHN0YWNrIHRvIGJlY29tZSBlbXB0eS5cclxuICAgICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIHN0YWNrIGlzIGVtcHR5LlxyXG4gICAgICovXHJcbiAgICB3YWl0Rm9yRW1wdHkoKTogUHJvbWlzZTxJbnN0cnVjdGlvbltdPiB7XHJcbiAgICAgIHJldHVybiB3YWl0Rm9yKHN0YWNrJCwgc3RhY2sgPT4gc3RhY2subGVuZ3RoID09PSAwKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBXYWl0cyBmb3IgdGhlIHN0YWNrIHRvIGJlY29tZSBpZGxlIChpLmUuLCBubyBcImFjdGlvblwiIG9wZXJhdGlvbnMgYXJlIGluIHByb2dyZXNzKS5cclxuICAgICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdoZW4gdGhlIHN0YWNrIGJlY29tZXMgaWRsZS5cclxuICAgICAqL1xyXG4gICAgd2FpdEZvcklkbGUoKTogUHJvbWlzZTxJbnN0cnVjdGlvbltdPiB7XHJcbiAgICAgIHJldHVybiB3YWl0Rm9yKHN0YWNrJCwgc3RhY2sgPT4gIXN0YWNrLnNvbWUoaXRlbSA9PiBpdGVtLnR5cGUgPT09IFwiYWN0aW9uXCIpKTtcclxuICAgIH0sXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBFeHBvc2VzIHRoZSB1bmRlcmx5aW5nIG9ic2VydmFibGUgc3RyZWFtIGZvciBleHRlcm5hbCBzdWJzY3JpcHRpb24uXHJcbiAgICAgKi9cclxuICAgIGdldCBvYnNlcnZhYmxlKCk6IE9ic2VydmFibGU8SW5zdHJ1Y3Rpb25bXT4ge1xyXG4gICAgICByZXR1cm4gc3RhY2skLmFzT2JzZXJ2YWJsZSgpO1xyXG4gICAgfSxcclxuICB9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdhaXRzIGZvciBhIGNvbmRpdGlvbiB0byBiZSBtZXQgaW4gYW4gb2JzZXJ2YWJsZSBzdHJlYW0uXHJcbiAqIEB0ZW1wbGF0ZSBUXHJcbiAqIEBwYXJhbSBvYnMgVGhlIG9ic2VydmFibGUgc3RyZWFtIHRvIG9ic2VydmUuXHJcbiAqIEBwYXJhbSBwcmVkaWNhdGUgQSBwcmVkaWNhdGUgZnVuY3Rpb24gdG8gZXZhbHVhdGUgZWFjaCBlbWl0dGVkIHZhbHVlLlxyXG4gKiBAcmV0dXJucyBBIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aGVuIHRoZSBjb25kaXRpb24gaXMgbWV0LlxyXG4gKi9cclxuZnVuY3Rpb24gd2FpdEZvcjxUPihvYnM6IE9ic2VydmFibGU8VD4sIHByZWRpY2F0ZTogKHZhbHVlOiBUKSA9PiBib29sZWFuKTogUHJvbWlzZTxUPiB7XHJcbiAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgIGNvbnN0IHN1YnNjcmlwdGlvbiA9IG9icy5zdWJzY3JpYmUoe1xyXG4gICAgICBuZXh0OiB2YWx1ZSA9PiB7XHJcbiAgICAgICAgaWYgKHByZWRpY2F0ZSh2YWx1ZSkpIHtcclxuICAgICAgICAgIHN1YnNjcmlwdGlvbi51bnN1YnNjcmliZSgpO1xyXG4gICAgICAgICAgcmVzb2x2ZSh2YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBlcnJvcjogcmVqZWN0LFxyXG4gICAgICBjb21wbGV0ZTogKCkgPT4gcmVqZWN0KFwiT2JzZXJ2YWJsZSBjb21wbGV0ZWQgYmVmb3JlIGNvbmRpdGlvbiB3YXMgbWV0XCIpLFxyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn1cclxuIl19