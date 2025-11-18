import {Scheduler} from "./Scheduler";
import {Thread} from "./Thread";
import {EventType} from "./Event";
import {EventManager} from "./EventManager";
import {ProcessManager} from "./ProcessManager";
import {Process} from "./Process";

export enum Syscall {
    Print = "print",
    Sleep = "os.sleep",
    PullEvent = "os.pullEvent",
}

export class SyscallExecutor {
    public constructor(private scheduler: Scheduler,
                       private eventManager: EventManager,
                       private processManager: ProcessManager) {

    }

    public execute(thread: Thread, syscall: Syscall, args: any[]) {
        switch(syscall) {
            case Syscall.Print:
                const arg = print(...args);
                this.scheduler.readyThread(thread, [arg]);
                break;
            case Syscall.Sleep:
                this.scheduler.putThreadToSleep(thread, os.epoch("utc") + args[0] * 1000);
                break;
            case Syscall.PullEvent:
                const filter: EventType[] = args[0];
                const timeout: number = args[1] * 1000;
                // thread.parent.pullNextEventForThread(thread);
                this.pullEvent(thread, filter, timeout);
                break;
        }
    }

    // Actual syscalls:
    private pullEvent(thread: Thread, filter: EventType[], timeout: number) {
        const process: Process = thread.parent;
        const event = process.pullNextEventForThread(thread);
        if (event) {
            // TODO: REPLACE WITH DEEP COPY FOR SECURITY PURPOSES!!!
            this.scheduler.readyThread(thread, [event]);
        } else {
            this.scheduler.waitForEvent(thread, filter, timeout);
        }
    }
}