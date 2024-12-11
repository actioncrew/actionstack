import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';
import { Action, AsyncAction } from './types';

/**
 * Type representing different types of operations.
 */
export type InstructionType = "action" | "asyncAction" | "epic" | "saga";

/**
 * Represents an operation with its type and instance.
 */
export interface Instruction {
  operation: InstructionType;
  instance: any;
  context?: Instruction;
}

/**
 * Factory methods for creating operations.
 */
export const createInstruction = {
  action: (action: Action | AsyncAction): Instruction => {
    const operationType: InstructionType = typeof action === 'function' ? "asyncAction" : "action";
    const source = (action as any).source;
    return { operation: operationType, instance: action, context: source };
  },

  saga: (saga: Function): Instruction => ({ operation: "saga", instance: saga }),

  epic: (epic: Function): Instruction => ({ operation: "epic", instance: epic }),
};

/**
 * Checks if the given object is an Operation.
 * @param obj The object to check.
 * @returns True if the object is an Operation, false otherwise.
 */
export const isOperation = (obj: any): boolean => {
  return obj?.operation !== undefined && obj?.instance !== undefined;
};

/**
 * Represents a functional execution stack with observable capabilities.
 */
export type ExecutionStack = {
  length: number;
  add: (item: Instruction) => void;
  peek: () => Instruction | undefined;
  remove: (item: Instruction) => Instruction | undefined;
  clear: () => void;
  toArray: () => Instruction[];
  findLast: (condition: (element: Instruction) => boolean) => Instruction | undefined;
  waitForEmpty: () => Promise<Instruction[]>;
  waitForIdle: () => Promise<Instruction[]>;
}

/**
 * A stack for managing operations with observable capabilities.
 */
export const createExecutionStack = () => {
  const stack$ = new BehaviorSubject<Instruction[]>([]);

  return {
    /**
     * Gets the current length of the stack.
     */
    get length(): number {
      return stack$.value.length;
    },

    /**
     * Adds an operation to the stack.
     * @param item The operation to add.
     */
    add(item: Instruction): void {
      stack$.next([...stack$.value, item]);
    },

    /**
     * Retrieves the top item of the stack without removing it.
     * @returns The top operation or undefined if the stack is empty.
     */
    peek(): Instruction | undefined {
      return stack$.value[stack$.value.length - 1];
    },

    /**
     * Removes an operation from the stack.
     * @param item The operation to remove.
     * @returns The removed operation or undefined if not found.
     */
    remove(item: Instruction): Instruction | undefined {
      const index = stack$.value.lastIndexOf(item);
      if (index > -1) {
        const newStack = stack$.value.filter((_, i) => i !== index);
        stack$.next(newStack);
        return item;
      }
      return undefined;
    },

    /**
     * Clears the stack.
     */
    clear(): void {
      stack$.next([]);
    },

    /**
     * Converts the stack to an array.
     * @returns An array of operations.
     */
    toArray(): Instruction[] {
      return [...stack$.value];
    },

    /**
     * Finds the last operation matching a condition.
     * @param condition The condition to match.
     * @returns The matching operation or undefined.
     */
    findLast(condition: (element: Instruction) => boolean): Instruction | undefined {
      return stack$.value.slice().reverse().find(condition);
    },

    /**
     * Waits for the stack to become empty.
     * @returns A promise that resolves when the stack is empty.
     */
    waitForEmpty(): Promise<Instruction[]> {
      return waitFor(stack$, stack => stack.length === 0);
    },

    /**
     * Waits for the stack to become idle (no "action" operations).
     * @returns A promise that resolves when the stack is idle.
     */
    waitForIdle(): Promise<Instruction[]> {
      return waitFor(stack$, stack => !stack.some(item => item.operation === "action"));
    },

    /**
     * Exposes the underlying observable for external subscription.
     */
    get observable(): Observable<Instruction[]> {
      return stack$.asObservable();
    },
  };
};

/**
 * Waits for a condition to be met in an observable stream.
 * @template T
 * @param obs The observable stream to wait for.
 * @param predicate The predicate function to evaluate the values emitted by the observable stream.
 * @returns A promise that resolves to the value when the predicate condition is met.
 */
function waitFor<T>(obs: Observable<T>, predicate: (value: T) => boolean): Promise<T> {
  return new Promise<T>((resolve, reject) => {
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
