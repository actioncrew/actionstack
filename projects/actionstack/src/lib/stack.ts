import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';
import { Action, AsyncAction } from './types';

/**
 * Represents the type of an operation (action, asyncAction, epic, or saga).
 */
export type InstructionType = "action" | "asyncAction" | "epic" | "saga";

/**
 * Represents an operation with a specified type and instance, and optionally a context.
 */
export interface Instruction {
  type: InstructionType;
  instance: any;
  context?: Instruction;
}

/**
 * Factory methods for creating operations of different types.
 */
export const createInstruction = {
  /**
   * Creates an instruction for an action or async action.
   * @param action The action or async action to wrap in an instruction.
   * @returns The corresponding instruction.
   */
  action: (action: Action | AsyncAction): Instruction => {
    const operationType: InstructionType = typeof action === 'function' ? "asyncAction" : "action";
    const source = (action as any).source;
    return { type: operationType, instance: action, context: source };
  },

  /**
   * Creates an instruction for a saga.
   * @param saga The saga function.
   * @returns The corresponding instruction.
   */
  saga: (saga: Function): Instruction => ({ type: "saga", instance: saga }),

  /**
   * Creates an instruction for an epic.
   * @param epic The epic function.
   * @returns The corresponding instruction.
   */
  epic: (epic: Function): Instruction => ({ type: "epic", instance: epic }),
};

/**
 * Checks if the given object is a valid Instruction.
 * @param obj The object to check.
 * @returns True if the object is a valid Instruction, false otherwise.
 */
export const isInstruction = (obj: any): boolean => {
  return obj?.type !== undefined && obj?.instance !== undefined;
};

/**
 * Represents a stack for managing operations with observable capabilities.
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
  observable: Observable<Instruction[]>;
}

/**
 * Creates a stack for managing operations with observable capabilities.
 * This stack allows you to add, remove, and query instructions (operations),
 * as well as observe changes to the stack.
 */
export const createExecutionStack = () => {
  const stack$ = new BehaviorSubject<Instruction[]>([]);

  return {
    /**
     * Gets the current length of the stack.
     * @returns The length of the stack.
     */
    get length(): number {
      return stack$.value.length;
    },

    /**
     * Adds an operation to the stack.
     * @param item The operation (instruction) to add.
     */
    add(item: Instruction): void {
      stack$.next([...stack$.value, item]);
    },

    /**
     * Retrieves the top operation in the stack without removing it.
     * @returns The top operation or undefined if the stack is empty.
     */
    peek(): Instruction | undefined {
      return stack$.value[stack$.value.length - 1];
    },

    /**
     * Removes the specified operation from the stack.
     * @param item The operation to remove.
     * @returns The removed operation or undefined if the operation was not found.
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
     * Clears all operations from the stack.
     */
    clear(): void {
      stack$.next([]);
    },

    /**
     * Converts the stack to an array of instructions.
     * @returns An array of instructions.
     */
    toArray(): Instruction[] {
      return [...stack$.value];
    },

    /**
     * Finds the last operation in the stack that satisfies a given condition.
     * @param condition The condition to match the operation.
     * @returns The last matching operation or undefined if no match is found.
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
     * Waits for the stack to become idle (i.e., no "action" operations are in progress).
     * @returns A promise that resolves when the stack becomes idle.
     */
    waitForIdle(): Promise<Instruction[]> {
      return waitFor(stack$, stack => !stack.some(item => item.type === "action"));
    },

    /**
     * Exposes the underlying observable stream for external subscription.
     */
    get observable(): Observable<Instruction[]> {
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
