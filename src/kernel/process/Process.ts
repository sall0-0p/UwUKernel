import {Thread, TID} from "./Thread";
import {IReadHandle, IWriteHandle} from "./handle/IHandle";
import {TerminalHandle} from "./handle/TerminalHandle";
import {BaseEvent} from "./Event";
import {KeyboardHandle} from "./handle/KeyboardHandle";

export type PID = number;
export class Process {
    public readonly pid: PID = PIDCounter.getNextPID();
    public readonly parent: Process | null;
    public readonly threads: Map<TID, Thread> = new Map();
    public readonly eventQueue: BaseEvent[] = [];

    public stdin: IReadHandle = new KeyboardHandle();
    public stdout: IWriteHandle = new TerminalHandle();
    public stderr: IWriteHandle = new TerminalHandle();

    public environment: object;
    public workingDir: string;

    public constructor(workingDir: string, parent?: Process) {
        this.workingDir = workingDir;
        this.parent = parent;
    }

    public addThread(thread: Thread) {
        this.threads.set(thread.tid, thread);
    }

    public removeThread(thread: Thread) {
        this.threads.delete(thread.tid);
    }
}

namespace PIDCounter {
    let currentPID: PID = 0;
    export function getNextPID(): PID {
        currentPID++;
        return currentPID;
    }
}