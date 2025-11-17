import {Scheduler} from "./Scheduler";
import {Thread} from "./Thread";

export enum Syscall {
    Print = "print",
    Sleep = "os.sleep",
}

export class SyscallExecutor {
    public constructor(private scheduler: Scheduler) {

    }

    public execute(thread: Thread, syscall: Syscall, args: any[]) {
        switch(syscall) {
            case "print":
                const arg = print(...args);
                this.scheduler.readyThread(thread, [arg]);
                break;
            case "os.sleep":
                this.scheduler.putThreadToSleep(thread, os.epoch("utc") + args[0] * 1000);
                break;
        }
    }
}