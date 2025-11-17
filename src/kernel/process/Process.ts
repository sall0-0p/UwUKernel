import {Thread, TID} from "./Thread";

export type PID = number;
export class Process {
    public readonly pid: PID = PIDCounter.getNextPID();
    public readonly parent: Process | null;
    public readonly threads: Map<TID, Thread> = new Map();

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