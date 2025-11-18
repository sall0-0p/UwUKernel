import {Thread, ThreadState, TID} from "./Thread";
import {IHandle, IReadHandle, IWriteHandle} from "./handle/IHandle";
import {TerminalHandle} from "./handle/TerminalHandle";
import {IEvent} from "./Event";
import {KeyboardHandle} from "./handle/KeyboardHandle";
import {Scheduler} from "./Scheduler";

// The maximum size of process event queue.
const MAX_PROCESS_QUEUE_SIZE = 16;
// The time events are purged after.
const EVENT_LIFESPAN = 5000;

interface EncasedEvent {
    event: IEvent;
    expiryTime: number;
    consumedBy: Map<TID, boolean>;
}

export type HandleId = number;
export type PID = number;
export class Process {
    public readonly pid: PID = PIDCounter.getNextPID();
    public readonly parent: Process | null;
    public readonly threads: Map<TID, Thread> = new Map();
    public readonly eventQueue: EncasedEvent[] = [];

    public handles: Map<HandleId, IHandle> = new Map();
    public environment: object;
    public workingDir: string;

    public constructor(workingDir: string, parent?: Process) {
        this.workingDir = workingDir;
        this.parent = parent;
        this.handles.set(0, new KeyboardHandle());
        this.handles.set(1, new TerminalHandle());
        this.handles.set(2, new TerminalHandle());
    }

    public addThread(thread: Thread) {
        this.threads.set(thread.tid, thread);
    }

    public addHandle(handle: IHandle): HandleId {
        const curLen = this.handles.size;
        this.handles.set(curLen, handle);
        return curLen;
    }

    public queueEvent(event: IEvent, scheduler: Scheduler) {
        this.purgeEvents();
        const encasedEvent: EncasedEvent = {
            event: event,
            expiryTime: os.epoch("utc") + EVENT_LIFESPAN,
            consumedBy: new Map(),
        }

        this.eventQueue.push(encasedEvent);
        for (const thread of this.threads.values()) {
            if (thread.state === ThreadState.Waiting && thread.waitingReason === "event") {
                if (thread.isEventInFilter(event)) {
                    encasedEvent.consumedBy.set(thread.tid, true);
                    scheduler.readyThread(thread, [encasedEvent.event]);
                }
            }
        }

        if (this.eventQueue.length > MAX_PROCESS_QUEUE_SIZE) {
            this.eventQueue.shift();
        }
    }

    public pullNextEventForThread(thread: Thread): IEvent | null {
        this.purgeEvents();
        for (const encasedEvent of this.eventQueue) {
            if (thread.isEventInFilter(encasedEvent.event) &&
                !encasedEvent.consumedBy.has(thread.tid)) {
                    encasedEvent.consumedBy.set(thread.tid, true);
                    return encasedEvent.event;
            }
        }
    }

    // Helpers
    // Stalin said purge.
    private purgeEvents() {
        const now = os.epoch("utc");
        for (let i = this.eventQueue.length -1 ; i >= 0; i--) {
            const event = this.eventQueue[i];
            if (event && now > event.expiryTime) {
                this.eventQueue.splice(i, 1);
            }
        }
    }
}

namespace PIDCounter {
    let currentPID: PID = 0;
    export function getNextPID(): PID {
        currentPID++;
        return currentPID;
    }
}