import {Scheduler} from "./Scheduler";
import {Thread} from "./Thread";
import {EventType} from "./Event";
import {EventManager} from "./EventManager";
import {ProcessManager} from "./ProcessManager";
import {HandleId, Process} from "./Process";
import {IReadHandle, IWriteHandle} from "./handle/IHandle";

export enum Syscall {
    // Default syscalls
    Print = "print",
    Sleep = "os.sleep",
    PullEvent = "os.pullEvent",

    // My syscalls
    SetForegroundProcess = "os.setForegroundProcess",

    // Stdin
    rHandleIsEmpty = "handle.isEmpty",
    rHandleRead = "handle.read",
    rHandleReadLine = "handle.readLine",
    rHandleReadAll = "handle.readAll",

    // Stdout
    wHandleWrite = "handle.write",
    wHandleWriteLine = "handle.writeLine",
    wHandleFlush = "handle.flush",
    wHandleClose = "handle.close",
}

export class SyscallExecutor {
    public constructor(private scheduler: Scheduler,
                       private eventManager: EventManager,
                       private processManager: ProcessManager) {

    }

    /**
     * Executing syscall
     * @param thread - thread for which syscall is executed.
     * @param syscall - syscall to execute.
     * @param args - args (starting from 0 in TS) for a syscall.
     */
    public execute(thread: Thread, syscall: Syscall, args: any[]) {
        const process: Process = thread.parent;
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
                thread.parent.pullEvent(thread, filter, timeout);
                break;
            }

            // My syscalls
            case Syscall.SetForegroundProcess:
                this.eventManager.setFocusedProcess(thread.parent);

            // File descriptor reading and writing
            case Syscall.rHandleRead: {
                const handleId: HandleId = args[0];
                const count: number = args[1];
                const handle = process.getHandle(handleId);
                if (handle && "read" in handle) {
                    const result: string | number[] = (handle as IReadHandle).read(count, thread);
                    if (result) {
                        this.scheduler.readyThread(thread, [result]);
                    }
                } else {
                    this.scheduler.readyThread(thread, ["Bad file descriptor"]);
                }
                break;
            }
            case Syscall.rHandleReadLine: {
                const handleId: HandleId = args[0];
                const handle = process.getHandle(handleId);
                if (handle && "readLine" in handle) {
                    const result: string = (handle as IReadHandle).readLine(thread);
                    if (result) {
                        this.scheduler.readyThread(thread, [result]);
                    }
                } else {
                    this.scheduler.readyThread(thread, ["Bad file descriptor"]);
                }
                break;
            }
            case Syscall.rHandleReadAll: {
                const handleId: HandleId = args[0];
                const handle = process.getHandle(handleId);
                if (handle && "readAll" in handle) {
                    const result: string | number[] = (handle as IReadHandle).readAll(thread);
                    if (result) {
                        this.scheduler.readyThread(thread, [result]);
                    }
                } else {
                    this.scheduler.readyThread(thread, ["Bad file descriptor"]);
                }
                break;
            }
            case Syscall.rHandleIsEmpty: {
                const handleId: HandleId = args[0];
                const handle = process.getHandle(handleId);
                if (handle && "isEmpty" in handle) {
                    const result = (handle as IReadHandle).isEmpty(thread);
                    this.scheduler.readyThread(thread, [result]);
                } else {
                    this.scheduler.readyThread(thread, ["Bad file descriptor"]);
                }
                break;
            }
            case Syscall.wHandleWrite: {
                const handleId: HandleId = args[0];
                const text: string = args[1];
                const handle = process.getHandle(handleId);
                if (handle && "write" in handle) {
                    (handle as IWriteHandle).write(text, thread);
                    this.scheduler.readyThread(thread, []);
                } else {
                    this.scheduler.readyThread(thread, ["Bad file descriptor"]);
                }
                break;
            }
            case Syscall.wHandleWriteLine: {
                const handleId: HandleId = args[0];
                const text: string = args[1];
                const handle = process.getHandle(handleId);
                if (handle && "writeLine" in handle) {
                    (handle as IWriteHandle).writeLine(text, thread);
                    this.scheduler.readyThread(thread, []);
                } else {
                    this.scheduler.readyThread(thread, ["Bad file descriptor"]);
                }
                break;
            }
            case Syscall.wHandleFlush: {
                const handleId: HandleId = args[0];
                const handle = process.getHandle(handleId);
                if (handle && "flush" in handle) {
                    (handle as IWriteHandle).flush(thread);
                    this.scheduler.readyThread(thread, []);
                } else {
                    this.scheduler.readyThread(thread, ["Bad file descriptor"]);
                }
                break;
            }
            case Syscall.wHandleClose: {
                const handleId: HandleId = args[0];
                const handle = process.getHandle(handleId);
                if (handle && "close" in handle) {
                    (handle as IWriteHandle).close(thread);
                    this.scheduler.readyThread(thread, []);
                } else {
                    this.scheduler.readyThread(thread, ["Bad file descriptor"]);
                }
                break;
            }
        }
    }
}