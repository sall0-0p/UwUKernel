import {Thread, ThreadState, TID} from "./Thread";
import {IHandle} from "../handle/IHandle";
import {TerminalHandle} from "../handle/TerminalHandle";
import {EventType, IEvent} from "../event/Event";
import {KeyboardHandle} from "../handle/KeyboardHandle";
import {Scheduler} from "./Scheduler";
import {Logger} from "../lib/Logger";
import {IProcessInterceptor} from "./IProcessInterceptor";

// The maximum size of process event queue.
const MAX_PROCESS_QUEUE_SIZE = 16;
// The time events are purged after.
const EVENT_LIFESPAN = 5000;

interface EncasedEvent {
    event: IEvent;
    expiryTime: number;
    consumedBy: Map<TID, boolean>;
}

export enum ProcessState {
    Alive = "alive",
    Zombie = "zombie",
    Dead = "dead",
}

export type HandleId = number;
export type PID = number;
export class Process {
    public readonly pid: PID = PIDCounter.getNextPID();
    public readonly parent: Process | undefined;
    public readonly threads: Map<TID, Thread> = new Map();
    public readonly eventQueue: EncasedEvent[] = [];
    public mainThread!: Thread;

    private handles: Map<HandleId, IHandle> = new Map();
    public environment: object | undefined;
    public workingDir: string;
    public rawInputMode: boolean = false;

    // Exiting and dying
    public state: ProcessState = ProcessState.Alive;
    public exitCode: number | undefined;
    public exitReason: string | undefined;

    // Time tracking
    public cpuTime: number = 0;
    public sysTime: number = 0;

    private activeInterceptors: IProcessInterceptor[] = [];

    public constructor(private scheduler: Scheduler, workingDir: string, parent?: Process, handleOverrides?: Map<number, IHandle>) {
        this.workingDir = workingDir;
        this.parent = parent || undefined;

        // Attach appropriate handles;
        if (this.parent) {
            const pStdin = this.parent.getHandle(0);
            const pStdout = this.parent.getHandle(1);
            const pStderr = this.parent.getHandle(2);

            if (pStdin) this.setHandle(pStdin, 0);
            if (pStdout) this.setHandle(pStdout, 1);
            if (pStderr) this.setHandle(pStderr, 2);
        }

        handleOverrides?.forEach((h, id) => {
            this.setHandle(h, id);
        })

        if (!this.parent) {
            if (!this.getHandle(0)) this.setHandle(new KeyboardHandle(), 0);
            if (!this.getHandle(1)) this.setHandle(new TerminalHandle(), 1);
            if (!this.getHandle(2)) this.setHandle(new TerminalHandle(), 2);
        }
    }

    public addThread(thread: Thread) {
        if (this.threads.size === 0) {
            this.mainThread = thread;
        }

        this.threads.set(thread.tid, thread);
    }

    public addHandle(handle: IHandle): HandleId {
        const curLen = this.handles.size;
        this.handles.set(curLen, handle);
        handle.onAdded?.(this, curLen);
        return curLen;
    }

    public getHandle(handleId: HandleId): IHandle | undefined {
        return this.handles.get(handleId);
    }

    public setHandle(handle: IHandle, handleId: HandleId): boolean {
        if (handleId === 0 && !("read" in handle)) {
            Logger.error("Cannot assign write-only handle to the stdin.");
            return false;
        }

        if ((handleId === 1 || handleId === 2) && !("write" in handle)) {
            Logger.error("Cannot assign read-only handle to the stdout/stderr.");
            return false;
        }

        const oldHandle = this.handles.get(handleId);
        if (oldHandle) {
            oldHandle
                .onRemoved?.(this, handleId);
        }

        handle.onAdded?.(this, handleId);
        this.handles.set(handleId, handle);
        return true;
    }

    public removeHandle(handleId: HandleId): void {
        this.handles.get(handleId)?.onRemoved?.(this, handleId);
        this.handles.delete(handleId);
    }

    public queueEvent(event: IEvent) {
        this.purgeEvents();

        // Check for interceptors
        let wasConsumed: boolean = false;
        this.activeInterceptors.forEach((i) => {
            if (i.onEvent(event, this.scheduler)) {
                wasConsumed = true;
            }
        })
        if (wasConsumed) return;

        // If not intercepted go on
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
                    this.scheduler.readyThread(thread, [encasedEvent.event]);
                }
            }
        }

        if (this.eventQueue.length > MAX_PROCESS_QUEUE_SIZE) {
            this.eventQueue.shift();
        }
    }

    public pullEvent(thread: Thread, filter: EventType[], timeout: number) {
        const event = this.pullNextEventForThread(thread);
        if (event) {
            // TODO: REPLACE WITH DEEP COPY FOR SECURITY PURPOSES!!!
            this.scheduler.readyThread(thread, [event]);
        } else {
            this.scheduler.waitForEvent(thread, filter, timeout);
        }
    }

    public pullNextEventForThread(thread: Thread): IEvent | undefined {
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

    // Interceptors
    public registerInterceptor(interceptor: IProcessInterceptor) {
        this.activeInterceptors.push(interceptor);
    }

    public deregisterInterceptor(interceptor: IProcessInterceptor) {
        this.activeInterceptors = this.activeInterceptors.filter(i => i !== interceptor);
    }

    // Cleanup
    public closeAllHandles() {
        this.handles.forEach((handle, id) => {
            try {
                handle.close();
            } catch (e) {
                Logger.error(`Failed to close handle ${id} for PID ${this.pid}`);
            }
        });

        this.handles.clear();
    }
}

namespace PIDCounter {
    let currentPID: PID = 0;
    export function getNextPID(): PID {
        currentPID++;
        return currentPID;
    }
}