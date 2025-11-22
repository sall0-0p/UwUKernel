import {Scheduler} from "../process/Scheduler";
import {Thread} from "../process/Thread";
import {EventType} from "../event/Event";
import {EventManager} from "../event/EventManager";
import {ProcessManager} from "../process/ProcessManager";
import {HandleId, Process} from "../process/Process";
import {IReadHandle, IWriteHandle} from "../process/handle/IHandle";
import {Syscall} from "./Syscall";

export class SyscallExecutor {
    public constructor(private scheduler: Scheduler,
                       private eventManager: EventManager,
                       private processManager: ProcessManager) {

    }

    // Helper to return successful message
    private returnSuccess(thread: Thread, ...results: any[]) {
        this.scheduler.readyThread(thread, [true, ...results]);
    }

    // Helper to return error
    private returnError(thread: Thread, message: string) {
        this.scheduler.readyThread(thread, [false, message]);
    }

    /**
     * Executing syscall
     * @param thread - thread for which syscall is executed.
     * @param syscall - syscall to execute.
     * @param args - args (starting from 0 in TS) for a syscall.
     */
    public execute(thread: Thread, syscall: Syscall, args: any[]) {
        const process: Process = thread.parent;
        const startedTime = os.epoch("utc");
        switch(syscall) {
            // Default syscalls
            case Syscall.Print: {
                const linesPrinted = print(...args);
                this.returnSuccess(thread, linesPrinted);
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
            case Syscall.Epoch: {
                const mode: string = args[0];
                if (mode !== "utc" && mode !== "ingame" && mode !== "local") {
                    this.returnError(thread, "Invalid mode " + mode);
                    break;
                }

                this.returnSuccess(thread, os.epoch(mode));
                break;
            }

            // My syscalls
            case Syscall.GetPid: {
                this.returnSuccess(thread, thread.parent.pid);
                break;
            }

            case Syscall.GetProcessTime: {
                this.returnSuccess(thread, thread.parent.cpuTime, thread.parent.sysTime);
                break;
            }

            case Syscall.SetForegroundProcess: {
                this.eventManager.setFocusedProcess(thread.parent);
                this.returnSuccess(thread);
                break;
            }

            case Syscall.SetRawInputMode: {
                const toggle: boolean = args[0];
                thread.parent.rawInputMode = toggle;
                this.returnSuccess(thread);
                break;
            }

            // File descriptor reading and writing
            case Syscall.rHandleRead: {
                const handleId: HandleId = args[0];
                const count: number = args[1];
                const handle = process.getHandle(handleId);
                if (handle && "read" in handle) {
                    const result: string | null = (handle as IReadHandle).read(count, thread);
                    if (result) {
                        this.returnSuccess(thread, result);
                    }
                } else {
                    this.returnError(thread, "invalid argument #0: bad file descriptor");
                }
                break;
            }
            case Syscall.rHandleReadLine: {
                const handleId: HandleId = args[0];
                const handle = process.getHandle(handleId);
                if (handle && "readLine" in handle) {
                    const result: string | null = (handle as IReadHandle).readLine(thread);
                    if (result) {
                        this.returnSuccess(thread, result);
                    }
                } else {
                    this.returnError(thread, "invalid argument #0: bad file descriptor");
                }
                break;
            }
            case Syscall.rHandleReadAll: {
                const handleId: HandleId = args[0];
                const handle = process.getHandle(handleId);
                if (handle && "readAll" in handle) {
                    const result: string | null = (handle as IReadHandle).readAll(thread);
                    if (result) {
                        this.returnSuccess(thread, result);
                    }
                } else {
                    this.returnError(thread, "invalid argument #0: bad file descriptor");
                }
                break;
            }
            case Syscall.rHandleIsEmpty: {
                const handleId: HandleId = args[0];
                const handle = process.getHandle(handleId);
                if (handle && "isEmpty" in handle) {
                    const result = (handle as IReadHandle).isEmpty(thread);
                    this.returnSuccess(thread, result);
                } else {
                    this.returnError(thread, "invalid argument #0: bad file descriptor");
                }
                break;
            }
            case Syscall.wHandleWrite: {
                const handleId: HandleId = args[0];
                const text: string = args[1];
                const handle = process.getHandle(handleId);
                if (handle && "write" in handle) {
                    (handle as IWriteHandle).write(text, thread);
                    this.returnSuccess(thread);
                } else {
                    this.returnError(thread, "invalid argument #0: bad file descriptor");
                }
                break;
            }
            case Syscall.wHandleWriteLine: {
                const handleId: HandleId = args[0];
                const text: string = args[1];
                const handle = process.getHandle(handleId);
                if (handle && "writeLine" in handle) {
                    (handle as IWriteHandle).writeLine(text, thread);
                    this.returnSuccess(thread);
                } else {
                    this.returnError(thread, "invalid argument #0: bad file descriptor");
                }
                break;
            }
            case Syscall.wHandleFlush: {
                const handleId: HandleId = args[0];
                const handle = process.getHandle(handleId);
                if (handle && "flush" in handle) {
                    (handle as IWriteHandle).flush(thread);
                    this.returnSuccess(thread);
                } else {
                    this.returnError(thread, "invalid argument #0: bad file descriptor");
                }
                break;
            }
            case Syscall.aHandleClose: {
                const handleId: HandleId = args[0];
                const handle = process.getHandle(handleId);
                if (handle && "close" in handle) {
                    (handle as IWriteHandle).close(thread);
                    this.returnSuccess(thread);
                } else {
                    this.returnError(thread, "invalid argument #0: bad file descriptor");
                }
                thread.parent.removeHandle(handleId);
                break;
            }
        }
        const finishedTime = os.epoch("utc");
        const syscallTime = finishedTime - startedTime;
        thread.parent.sysTime += syscallTime;
    }
}