import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { Observable } from 'rxjs/internal/Observable';
import { Subscription } from 'rxjs/internal/Subscription';

import { Action, AsyncAction } from './types';

/**
 * Type representing different types of operations.
 * @typedef {("action" | "async action" | "epic" | "saga")} OperationType
 */
export type OperationType = "action" | "async action" | "epic" | "saga";

/**
 * Class representing an operation.
 * @interface
 */
export class Operation {
  operation: OperationType;
  instance: any;
  source?: Operation;

  constructor(operation: OperationType, instance: any, source?: Operation) {
    this.operation = operation;
    this.instance = instance;
    this.source = source;
  }

  static action(action: Action | AsyncAction): Operation {
    const operationType = typeof action === 'function' ? "async action" : "action";
    const instance = action;
    const source = (action as any).source;
    return new Operation(operationType, instance, source);
  }

  static saga(saga: Function): Operation {
    return new Operation("saga", saga);
  }

  static epic(epic: Function): Operation {
    return new Operation("epic", epic);
  }
}

/**
 * Checks if the given object is an Operation.
 * @param {any} obj - The object to check.
 * @returns {boolean} True if the object is an Operation, false otherwise.
 */
export const isOperation = (obj: any): boolean => {
  return obj.operation !== undefined && obj.instance !== undefined;
};

/**
 * Class representing a stack of operations with observable capabilities.
 */
export class ExecutionStack {
  private stack = new BehaviorSubject<Operation[]>([]);

  /**
   * Gets the current length of the stack.
   * @returns {number} The length of the stack.
   */
  get length(): number {
    return this.stack.value.length;
  }

  /**
   * Pushes an item onto the stack.
   * @param {Operation} item - The item to push onto the stack.
   */
  add(item: Operation): void {
    this.stack.next([...this.stack.value, item]);
  }

  /**
   * Peeks at the top item of the stack without removing it.
   * @returns {Operation | undefined} The top item of the stack, or undefined if the stack is empty.
   */
  peek(): Operation | undefined {
    return this.stack.value[this.stack.value.length - 1];
  }

  /**
   * Pops the specified item from the stack.
   * @param {Operation} item - The item to pop from the stack.
   * @returns {Operation | undefined} The popped item, or undefined if the item is not found.
   */
  remove(item: Operation): Operation | undefined {
    let index = this.stack.value.lastIndexOf(item);
    if(index > -1) {
      this.stack.next(this.stack.value.filter((_, i) => i !== index));
      return item;
    }
    return undefined;
  }

  /**
   * Clears all items from the stack.
   */
  clear(): void {
    this.stack.next([]);
  }

  /**
   * Converts the stack to an array.
   * @returns {Operation[]} An array of operations in the stack.
   */
  toArray(): Operation[] {
    return [...this.stack.value];
  }

  /**
   * Finds the last operation in the stack that satisfies the given condition.
   * @param {(element: Operation) => boolean} condition - The condition to match.
   * @returns {Operation | undefined} The last matching operation, or undefined if no match is found.
   */
  findLast(condition: (element: Operation) => boolean): Operation | undefined {
    for (const element of this.stack.value.slice().reverse()) {
      if (condition(element)) {
        return element;
      }
    }
    return undefined;
  }

  /**
   * Waits until the stack is empty.
   * @returns {Promise<Operation[]>} A promise that resolves with the stack when it becomes empty.
   */
  async waitForEmpty(): Promise<Operation[]> {
    return await waitFor(this.stack, value => value.length === 0);
  }

  /**
   * Waits until the stack is idle (i.e., contains no ACTION operations).
   * @returns {Promise<Operation[]>} A promise that resolves with the stack when it becomes idle.
   */
  async waitForIdle(): Promise<Operation[]> {
    return await waitFor(this.stack, value => !value.some(item => item.operation === "action"));
  }
}

/**
 * Waits for a condition to be met in an observable stream.
 * @template T
 * @param {Observable<T>} obs - The observable stream to wait for.
 * @param {(value: T) => boolean} predicate - The predicate function to evaluate the values emitted by the observable stream.
 * @returns {Promise<T>} A promise that resolves to the value when the predicate condition is met, or rejects if the observable completes without satisfying the predicate.
 */
function waitFor<T>(obs: Observable<T>, predicate: (value: T) => boolean): Promise<T> {
  let subscription: Subscription | undefined;

  return new Promise<T>((resolve, reject) => {
    const checkInitialValue = (obs as BehaviorSubject<T>)?.value;
    if (checkInitialValue !== undefined && predicate(checkInitialValue)) {
      return resolve(checkInitialValue);
    }

    subscription = obs.subscribe({
      next: value => {
        if (predicate(value)) {
          if (subscription) {
            subscription.unsubscribe();
          }
          resolve(value);
        }
      },
      error: err => reject(err),
      complete: () => {
        reject("Method had completed before predicate condition was met");
      },
    });
  }).finally(() => {
    if (subscription && !subscription.closed) {
      subscription.unsubscribe();
    }
  });
}
