import {Process} from "./Process";
import {IEvent, EventType} from "./Event";

export enum ThreadState {
    Running = "RUNNING",
    Waiting = "WAITING",
    Ready = "READY",
    Terminated = "TERMINATED",
}

export enum WaitingReason {
    Sleep = "sleep",
    Event = "event",
}

export type TID = number;
export class Thread {
    public readonly tid: TID = TIDCounter.getNextTID();
    public readonly thread: LuaThread;
    public readonly parent: Process;
    public state: ThreadState;
    public nextRunArguments: any[] = [];
    public wakeUpAt: number | null;
    public lastEventIndex: number = 0;

    // Properties when waiting for events.
    public eventFilter: EventType[] | null
    public waitingReason: WaitingReason | null;
    public waitingTimeout: number | null;

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
        this.thread = coroutine.create(executable);
        this.state = ThreadState.Ready;
    }

    public isEventInFilter(event: IEvent) {
        if (!this.eventFilter) return false;
        if (this.eventFilter.length === 0) return true;
        return this.eventFilter.includes(event.type);
    }
}

namespace TIDCounter {
    let currentTID: TID = 0;
    export function getNextTID(): TID {
        currentTID++;
        return currentTID;
    }
}