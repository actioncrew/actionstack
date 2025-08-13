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
export declare const createInstruction: {
    /**
     * Creates an instruction for an action or async action.
     * @param action The action or async action to wrap in an instruction.
     * @returns The corresponding instruction.
     */
    action: (action: Action | AsyncAction) => Instruction;
    /**
     * Creates an instruction for a saga.
     * @param saga The saga function.
     * @returns The corresponding instruction.
     */
    saga: (saga: Function) => Instruction;
    /**
     * Creates an instruction for an epic.
     * @param epic The epic function.
     * @returns The corresponding instruction.
     */
    epic: (epic: Function) => Instruction;
};
/**
 * Checks if the given object is a valid Instruction.
 * @param obj The object to check.
 * @returns True if the object is a valid Instruction, false otherwise.
 */
export declare const isInstruction: (obj: any) => boolean;
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
};
/**
 * Creates a stack for managing operations with observable capabilities.
 * This stack allows you to add, remove, and query instructions (operations),
 * as well as observe changes to the stack.
 */
export declare const createExecutionStack: () => {
    /**
     * Gets the current length of the stack.
     * @returns The length of the stack.
     */
    readonly length: number;
    /**
     * Adds an operation to the stack.
     * @param item The operation (instruction) to add.
     */
    add(item: Instruction): void;
    /**
     * Retrieves the top operation in the stack without removing it.
     * @returns The top operation or undefined if the stack is empty.
     */
    peek(): Instruction | undefined;
    /**
     * Removes the specified operation from the stack.
     * @param item The operation to remove.
     * @returns The removed operation or undefined if the operation was not found.
     */
    remove(item: Instruction): Instruction | undefined;
    /**
     * Clears all operations from the stack.
     */
    clear(): void;
    /**
     * Converts the stack to an array of instructions.
     * @returns An array of instructions.
     */
    toArray(): Instruction[];
    /**
     * Finds the last operation in the stack that satisfies a given condition.
     * @param condition The condition to match the operation.
     * @returns The last matching operation or undefined if no match is found.
     */
    findLast(condition: (element: Instruction) => boolean): Instruction | undefined;
    /**
     * Waits for the stack to become empty.
     * @returns A promise that resolves when the stack is empty.
     */
    waitForEmpty(): Promise<Instruction[]>;
    /**
     * Waits for the stack to become idle (i.e., no "action" operations are in progress).
     * @returns A promise that resolves when the stack becomes idle.
     */
    waitForIdle(): Promise<Instruction[]>;
    /**
     * Exposes the underlying observable stream for external subscription.
     */
    readonly observable: Observable<Instruction[]>;
};
