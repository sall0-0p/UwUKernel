import {Thread, ThreadState, TID} from "./Thread";
import {SyscallExecutor} from "./SyscallExecutor";

// Time in ms, after which preemption should happen.
const QUANT = 100;
// How often do we check if preemption should happen (instructions).
const I_QUANT = 2500;

export enum InterruptionReason {
    Syscall = "syscall",
    Preemption = "preemption",
}

export class Scheduler {
    private syscallExecutor: SyscallExecutor;

    private threads: Map<TID, Thread> = new Map();
    private readyThreads: Thread[] = [];
    private sleepingThreads: Thread[] = [];

    public constructor() {
        this.syscallExecutor = new SyscallExecutor(this);
    }

    public addThread(thread: Thread) {
        this.threads.set(thread.tid, thread);
        if (thread.state === "READY") {
            this.readyThreads.push(thread);
        }
    }

    public run() {
        let cycles = 0;
        while (true) {
            while (this.readyThreads.length > 0) {
                const thread = this.readyThreads.shift();
                if (thread) {
                    if (thread.state === ThreadState.Ready) {
                        this.executeThread(thread);
                    } else {
                        thread.state = ThreadState.Terminated;
                    }
                }
            }

            // Iterate and display cycle count
            cycles++;

            this.checkSleepingThreads();
            os.sleep(0.016);
        }
    }

    public readyThread(thread: Thread, args?: any[]) {
        thread.nextRunArguments = args || [];
        thread.state = ThreadState.Ready;
        this.readyThreads.push(thread);
    }

    public putThreadToSleep(thread: Thread, wakeUpAt: number, args?: any[]) {
        thread.wakeUpAt = wakeUpAt;
        thread.nextRunArguments = args || [];
        this.sleepingThreads.push(thread);
    }

    // Helpers
    private executeThread(thread: Thread) {
        const endTime = os.epoch("utc") + QUANT;
        debug.sethook(thread.thread, () => {
            if (os.epoch("utc") > endTime) {
                coroutine.yield("interrupt");
            }
        }, "", I_QUANT);
        const [ok, interruptReason, ...result] = coroutine.resume(thread.thread, ...thread.nextRunArguments);

        const exitStatus = coroutine.status(thread.thread)
        if (ok && exitStatus !== "dead") {
            thread.nextRunArguments = [];
            thread.state = ThreadState.Waiting;

            this.handleReturns(thread, interruptReason, result);
        } else {
            thread.state = ThreadState.Terminated;
        }

        debug.sethook();
    }

    private checkSleepingThreads() {
        const newSleeps: Thread[] = [];
        while (this.sleepingThreads.length > 0) {
            const thread = this.sleepingThreads.pop();
            if (thread && thread.wakeUpAt < os.epoch("utc")) {
                this.readyThreads.push(thread);
                thread.state = ThreadState.Ready;
            } else {
                newSleeps.push(thread);
            }
        }
        this.sleepingThreads = newSleeps;
    }

    private handleReturns(thread: Thread, interruptReason: InterruptionReason, args: any[]) {
        if (interruptReason === "syscall") {
            this.syscallExecutor.execute(thread, args[0], args.slice(1));
        } else {
            // Apply some preemption priorities logic later or whatever.
            thread.state = ThreadState.Ready;
            this.readyThreads.push(thread);
        }
    }
}