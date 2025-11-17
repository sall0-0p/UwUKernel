import {Process} from "./Process";

export enum ThreadState {
    Running = "RUNNING",
    Waiting = "WAITING",
    Ready = "READY",
    Terminated = "TERMINATED",
}

export type TID = number;
export class Thread {
    public readonly tid: TID = TIDCounter.getNextTID();
    public readonly thread: LuaThread;
    public readonly parent: Process;
    public state: ThreadState;
    public nextRunArguments: any[] = [];
    public wakeUpAt: number | null;

    /**
     * Creates new thread object.
     * @param parent process thread belongs to.
     * @param code code to be executed by a thread.
     */
    constructor(parent: Process, code: string) {
        this.parent = parent;

        const [executable, err] = loadstring(code);
        if (!executable) {
            this.thread = coroutine.create(() => {});
            this.state = ThreadState.Terminated;
            return;
        }

        setfenv(executable, parent.environment);
        // @ts-ignore
        // parent.environment.print("Print is here!");
        this.thread = coroutine.create(executable);
        this.state = ThreadState.Ready;
    }
}

namespace TIDCounter {
    let currentTID: TID = 0;
    export function getNextTID(): TID {
        currentTID++;
        return currentTID;
    }
}