import { StateStackImpl, StateStackFrame } from "./grammar";
import { StateStack } from "./main";
export declare function diffStateStacksRefEq(first: StateStack, second: StateStack): StackDiff;
export declare function applyStateStackDiff(stack: StateStack | null, diff: StackDiff): StateStackImpl | null;
export interface StackDiff {
    readonly pops: number;
    readonly newFrames: StateStackFrame[];
}
