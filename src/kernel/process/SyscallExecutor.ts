import {Scheduler} from "./Scheduler";
import {Thread} from "./Thread";
import {EventType} from "./Event";
import {EventManager} from "./EventManager";
import {ProcessManager} from "./ProcessManager";
import {Process} from "./Process";
import {IReadHandle, IWriteHandle} from "./handle/IHandle";

export enum Syscall {
    Print = "print",
    Sleep = "os.sleep",
    PullEvent = "os.pullEvent",

    // Stdin
    StdinIsEmpty = "stdin.isEmpty",
    StdinRead = "stdin.read",
    StdinReadLine = "stdin.readLine",
    StdinReadAll = "stdin.readAll",

    // Stdout
    StdoutWrite = "stdout.write",
    StdoutWriteLine = "stdout.writeLine",
    StdoutFlush = "stdout.flush",
    StdoutClose = "stdout.close",

    // Stderr
    StderrWrite = "stderr.write",
    StderrWriteLine = "stderr.writeLine",
    StderrFlush = "stderr.flush",
    StderrClose = "stderr.close",
}

export class SyscallExecutor {
    public constructor(private scheduler: Scheduler,
                       private eventManager: EventManager,
                       private processManager: ProcessManager) {

    }

    public execute(thread: Thread, syscall: Syscall, args: any[]) {
        const process: Process = thread.parent;
        const stdin: IReadHandle = process.stdin;
        const stdout: IWriteHandle = process.stdout;
        const stderr: IWriteHandle = process.stderr;
        switch(syscall) {
            // Default syscalls
            case Syscall.Print: {
                const arg = print(...args);
                this.scheduler.readyThread(thread, [arg]);
                break;
            }
            case Syscall.Sleep: {
                this.scheduler.putThreadToSleep(thread, os.epoch("utc") + args[0] * 1000);
                break;
            }
            case Syscall.PullEvent: {
                const filter: EventType[] = args[0];
                const timeout: number = args[1] * 1000;
                this.pullEvent(thread, filter, timeout);
                break;
            }

            // Stdin syscalls
            case Syscall.StdinIsEmpty: {
                const count: number = args[1];
                const result = stdin.read(count);
                this.scheduler.readyThread(thread, [result]);
                break;
            }
            case Syscall.StdinRead: {
                const count: number = args[1];
                const result = stdin.read(count);
                this.scheduler.readyThread(thread, [result]);
                break;
            }
            case Syscall.StdinReadAll: {
                const count: number = args[1];
                const result = stdin.read(count);
                this.scheduler.readyThread(thread, [result]);
                break;
            }
            case Syscall.StdinReadLine: {
                const count: number = args[1];
                const result = stdin.read(count);
                this.scheduler.readyThread(thread, [result]);
                break;
            }

            // Stdout syscalls
            case Syscall.StdoutWrite: {
                const text: string = args[1];
                stdout.write(text);
                break;
            }
            case Syscall.StdoutWriteLine: {
                const text: string = args[1];
                stdout.writeLine(text);
                break;
            }
            case Syscall.StdoutFlush: {
                stdout.flush();
                break;
            }
            case Syscall.StdoutClose: {
                stdout.close();
                break;
            }
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