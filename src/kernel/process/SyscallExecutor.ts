import {Scheduler} from "./Scheduler";
import {Thread} from "./Thread";
import {EventType} from "./Event";

export enum Syscall {
    Print = "print",
    Sleep = "os.sleep",
    PullEvent = "os.pullEvent",
}

export class SyscallExecutor {
    public constructor(private scheduler: Scheduler) {

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
                const timeout: number = args[1];
                this.scheduler.waitForEvent(thread, filter, timeout);
                break;
        }
    }
}