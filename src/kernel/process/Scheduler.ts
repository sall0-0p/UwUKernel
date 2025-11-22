import {Thread, ThreadExitStatus, ThreadState, TID, WaitingReason} from "./Thread";
import {SyscallExecutor} from "../syscall/SyscallExecutor";
import {EventManager} from "../event/EventManager";
import {Logger} from "../lib/Logger";
import {EventType} from "../event/Event";
import {ProcessManager} from "./ProcessManager";
import {ReadyQueue} from "./ReadyQueue";

// Time in ms, after which preemption should happen.
const BASE_QUANT = 30;
// How often do we check if preemption should happen (instructions).
const I_QUANT = 15000;

export class Scheduler {
    private threads: Map<TID, Thread> = new Map();
    private readyThreads: ReadyQueue = new ReadyQueue();
    private waitingThreads: Thread[] = [];

    private nextSleepTimer: number | undefined;

    public eventManager!: EventManager;
    public processManager!: ProcessManager;
    public syscallExecutor!: SyscallExecutor;

    public addThread(thread: Thread) {
        this.threads.set(thread.tid, thread);
        if (thread.state === "READY") {
            this.readyThreads.push(thread);
        }
    }

    public run() {
        while (true) {
            // Manage incoming events
            const eventData = os.pullEventRaw();
            const eventType = eventData[0];
            if (eventType === "terminate") break;

            if (eventType === "timer" && eventData[1] === this.nextSleepTimer) {
                this.nextSleepTimer = undefined;
            } else if (eventType !== "scheduler_yield") {
                    this.eventManager.dispatch(eventData);
            }

            // Prepare to cycle
            this.checkWaitingThreads();
            let runCount = this.readyThreads.count();

            while (runCount > 0) {
                const thread = this.readyThreads.pop();
                if (thread) {
                    if (thread.state === ThreadState.Ready) {
                        this.executeThread(thread);
                    } else {
                        thread.state = ThreadState.Terminated;
                    }
                }
                runCount--;
            }

            if (this.readyThreads.hasWork()) {
                os.queueEvent("scheduler_yield");
            } else {
                this.scheduleNextSleep();
            }
        }
    }

    public readyThread(thread: Thread, args?: any[]) {
        thread.waitingReason = undefined;
        thread.waitingTimeout = undefined;
        thread.eventFilter = undefined;
        thread.wakeUpAt = undefined;
        thread.nextRunArguments = args || [];

        thread.state = ThreadState.Ready;
        this.readyThreads.push(thread);
    }

    public putThreadToSleep(thread: Thread, wakeUpAt: number, args?: any[]) {
        thread.wakeUpAt = wakeUpAt;
        thread.nextRunArguments = args || [];
        thread.waitingReason = WaitingReason.Sleep;
        thread.state = ThreadState.Waiting;

        this.waitingThreads.push(thread);
    }

    // Helpers
    private executeThread(thread: Thread) {
        // Setup an interrupt
        const startedTime = os.epoch("utc");
        const endTime = startedTime + BASE_QUANT;
        debug.sethook(thread.thread, () => {
            if (os.epoch("utc") > endTime) {
                coroutine.yield("preempt");
            }
        }, "", I_QUANT);

        // Start execution
        const [ok, interruptReason, ...result] = coroutine.resume(thread.thread, ...thread.nextRunArguments);
        const finishedTime = os.epoch("utc");
        const burstLength = finishedTime - startedTime;
        thread.parent.cpuTime += burstLength;

        // Handle exit status
        const exitStatus = coroutine.status(thread.thread);
        if (ok && exitStatus !== "dead") {
            thread.nextRunArguments = [];
            thread.state = ThreadState.Waiting;

            this.handleReturns(thread, interruptReason, result);
        } else if (ok && exitStatus === "dead") {
            Logger.info("Thread %s finished execution safely (0)!", thread.tid)
            thread.state = ThreadState.Terminated;
            thread.exitStatus = ThreadExitStatus.Finished;
        } else {
            Logger.error("Thread %s finished execution due to error (1)!", thread.tid);
            Logger.error("Error message: %s", interruptReason);
            thread.state = ThreadState.Terminated;
            thread.exitStatus = ThreadExitStatus.Errored;
        }

        debug.sethook();
    }

    private checkWaitingThreads() {
        const newSleeps: Thread[] = [];
        while (this.waitingThreads.length > 0) {
            const thread = this.waitingThreads.pop()!;
            switch (thread.waitingReason) {
                case WaitingReason.Sleep:
                    if (thread.wakeUpAt! < os.epoch("utc")) {
                        this.readyThreads.push(thread);
                        thread.state = ThreadState.Ready;
                    } else {
                        newSleeps.push(thread);
                    }
                    break;
                case WaitingReason.Event:
                    if (thread.waitingTimeout! < os.epoch("utc")) {
                        this.readyThreads.push(thread);
                        thread.state = ThreadState.Ready;
                        thread.nextRunArguments = [null];
                    } else {
                        newSleeps.push(thread);
                    }
                    break;
            }

        }
        this.waitingThreads = newSleeps;
    }

    private handleReturns(thread: Thread, interruptReason: "syscall" | "preempt", args: any[]) {
        if (interruptReason === "syscall") {
            // Reward thread for being a good boy.
            thread.setPriority(thread.getPriority() - 1);
            this.syscallExecutor.execute(thread, args[0], args.slice(1));
        } else {
            // Move thread up one priority for being nasty CPU eater.
            thread.setPriority(thread.getPriority() + 1);

            thread.state = ThreadState.Ready;
            this.readyThreads.push(thread);
        }
    }

    private scheduleNextSleep() {
        if (this.waitingThreads.length === 0) return;

        let minWakeUp = math.huge;
        const now = os.epoch("utc");

        for (const thread of this.waitingThreads) {
            if (thread.wakeUpAt && thread.wakeUpAt < minWakeUp) {
                minWakeUp = thread.wakeUpAt;
            }
            if (thread.waitingTimeout && thread.waitingTimeout < minWakeUp) {
                minWakeUp = thread.waitingTimeout;
            }
        }

        if (minWakeUp !== math.huge) {
            const duration = Math.max(0, (minWakeUp - now) / 1000);

            if (this.nextSleepTimer) {
                os.cancelTimer(this.nextSleepTimer);
            }

            this.nextSleepTimer = os.startTimer(duration);
        }
    }

    // Event management is here, to an extent.
    public waitForEvent(thread: Thread, filter: EventType[], timeout: number) {
        thread.state = ThreadState.Waiting;
        thread.waitingReason = WaitingReason.Event;
        thread.waitingTimeout = os.epoch("utc") + timeout;
        thread.eventFilter = filter;
        this.waitingThreads.push(thread);
    }
}