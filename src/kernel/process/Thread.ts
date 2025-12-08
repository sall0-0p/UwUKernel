import {Process} from "./Process";
import {IEvent, EventType} from "../event/Event";
import {Logger} from "../lib/Logger";

export enum ThreadState {
    Running = "RUNNING",
    Waiting = "WAITING",
    Ready = "READY",
    Terminated = "TERMINATED",
}

export enum WaitingReason {
    Sleep = "sleep",
    Event = "event",
    ProcessWait = "processWait",
    JoinThread = "threadWait",
    Mutex = "mutex",
}

export enum ThreadPriority {
    VeryHigh = 0,
    High = 1,
    Normal = 2,
    Low = 3,
    VeryLow = 4,
}

export type TID = number;
export class Thread {
    public readonly tid: TID = TIDCounter.getNextTID();
    public readonly thread: LuaThread;
    public readonly parent: Process;

    // Error handling
    // 0 for good, 1 for bad.
    public exitStatus: number | undefined;

    // State (scheduling)
    private priority: ThreadPriority = ThreadPriority.VeryHigh;
    public state: ThreadState;
    public nextRunArguments: any[] = [];
    public wakeUpAt: number | undefined;
    public waitingForPid: number | undefined;

    // Properties when waiting for events.
    public eventFilter: EventType[] | undefined;
    public waitingReason: WaitingReason | undefined;
    public waitingTimeout: number | undefined;

    // Others
    public joiners: Thread[] = [];

    /**
     * Creates new thread object.
     * @param parent process thread belongs to.
     * @param instructions code or function to be executed by a thread.
     * @param args arguments to pass to the function.
     */
    constructor(parent: Process, instructions: (() => any) | string, args?: any[]) {
        this.parent = parent;

        let executable: (() => any) | undefined;
        let err: any;
        if (typeof instructions === "string") {
            [executable, err] = loadstring(instructions);
            if (!executable) {
                Logger.error("Failed to parse code for thread %s", this.tid);
                Logger.error("Message: %s", err);
                this.thread = coroutine.create(() => {});
                this.state = ThreadState.Terminated;
                return;
            }
        } else {
            executable = instructions;
        }

        setfenv(executable, parent.environment || {});
        this.thread = coroutine.create((...args: any[]) => {
            // Weird ts bullshit.
            // @ts-ignore
            executable!(...args);
        });
        this.state = ThreadState.Ready;

        if (args) {
            this.nextRunArguments = args;
        }
    }

    public isEventInFilter(event: IEvent) {
        if (!this.eventFilter) return false;
        if (this.eventFilter.length === 0) return true;
        return this.eventFilter.includes(event.type);
    }

    public getPriority() {
        return this.priority;
    }

    public setPriority(priority: ThreadPriority) {
        const limitedPriority = math.max(0, math.min(priority, 4));
        this.priority = limitedPriority;
    }

    public joinThread(joiner: Thread) {
        this.joiners.push(joiner);
    }
}

namespace TIDCounter {
    let currentTID: TID = 0;
    export function getNextTID(): TID {
        currentTID++;
        return currentTID;
    }
}