import {Scheduler} from "../process/Scheduler";
import {Thread} from "../process/Thread";
import {EventType} from "../event/Event";
import {EventManager} from "../event/EventManager";
import {ProcessManager} from "../process/ProcessManager";
import {HandleId, Process} from "../process/Process";
import {IReadHandle, IWriteHandle} from "../handle/IHandle";
import {Syscall} from "./Syscall";
import {VFSManager} from "../vfs/VFSManager";
import {FsOpenMode} from "../vfs/IFsDriver";
import {IFileMetadata} from "../vfs/IFileMetadata";

export class SyscallExecutor {
    public constructor(private scheduler: Scheduler,
                       private eventManager: EventManager,
                       private processManager: ProcessManager,
                       private vfsManager: VFSManager) {

    }

    // Helper to return successful message
    private returnSuccess(thread: Thread, ...results: any[]) {
        this.scheduler.readyThread(thread, [true, ...results]);
    }

    // Helper to return error
    private returnError(thread: Thread, message: string) {
        this.scheduler.readyThread(thread, [false, message]);
    }

    private resolvePath(process: Process, path: string): string {
        if (path.startsWith("/")) {
            return "/" + fs.combine("/", path);
        }

        return "/" + fs.combine(process.workingDir, path);
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

            // OS syscalls
            case Syscall.GetPid: {
                this.returnSuccess(thread, thread.parent.pid);
                break;
            }

            case Syscall.GetProcessTime: {
                this.returnSuccess(thread, thread.parent.cpuTime, thread.parent.sysTime);
                break;
            }

            case Syscall.GetCWD: {
                this.returnSuccess(thread, thread.parent.workingDir);
                break;
            }

            case Syscall.SetCWD: {
                const originalPath: string = args[0];
                const resolvedPath = this.resolvePath(thread.parent, originalPath);
                try {
                    const exists = this.vfsManager.exists(resolvedPath);
                    if (!exists) error("Directory does not exist!");

                    thread.parent.workingDir = resolvedPath;
                    this.returnSuccess(thread);
                } catch (e) {
                    this.returnError(thread, e as string);
                }

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

            // Filesystem
            case Syscall.FsOpen: {
                const originalPath: string = args[0];
                const mode: string = args[1];
                const resolvedPath = this.resolvePath(thread.parent, originalPath);

                if (!["r", "w", "a"].includes(mode)) {
                    this.returnError(thread, "Invalid fs.open() mode.");
                    break;
                }

                try {
                    const result = this.vfsManager.open(resolvedPath, mode as FsOpenMode);
                    const handleId = thread.parent.addHandle(result);
                    this.returnSuccess(thread, handleId);
                } catch (e) {
                    this.returnError(thread, e as string);
                }

                break;
            }

            case Syscall.FsList: {
                const originalPath: string = args[0];
                const resolvedPath = this.resolvePath(thread.parent, originalPath);

                try {
                    const result = this.vfsManager.list(resolvedPath);
                    this.returnSuccess(thread, result);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
                break;
            }

            case Syscall.FsExists: {
                const originalPath: string = args[0];
                const resolvedPath = this.resolvePath(thread.parent, originalPath);
                try {
                    const result = this.vfsManager.exists(resolvedPath);
                    this.returnSuccess(thread, result);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
                break;
            }

            case Syscall.FsMakeDir: {
                const originalPath: string = args[0];
                const resolvedPath: string = this.resolvePath(thread.parent, originalPath);

                try {
                    this.vfsManager.makeDir(resolvedPath);
                    this.returnSuccess(thread);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
                break;
            }

            case Syscall.FsIsDir: {
                const originalPath: string = args[0];
                const resolvedPath: string = this.resolvePath(thread.parent, originalPath);

                try {
                   const result = this.vfsManager.isDir(resolvedPath);
                   this.returnSuccess(thread, result);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
                break;
            }

            case Syscall.FsMove: {
                const originalFrom: string = args[0];
                const resolvedFrom: string = this.resolvePath(thread.parent, originalFrom);
                const originalTo: string = args[1];
                const resolvedTo: string = this.resolvePath(thread.parent, originalTo);

                try {
                   this.vfsManager.move(resolvedFrom, resolvedTo);
                   this.returnSuccess(thread);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
                break;
            }

            case Syscall.FsCopy: {
                const originalFrom: string = args[0];
                const resolvedFrom: string = this.resolvePath(thread.parent, originalFrom);
                const originalTo: string = args[1];
                const resolvedTo: string = this.resolvePath(thread.parent, originalTo);

                try {
                    this.vfsManager.copy(resolvedFrom, resolvedTo);
                    this.returnSuccess(thread);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
                break;
            }

            case Syscall.FsDelete: {
                const originalPath: string = args[0];
                const resolvedPath: string = this.resolvePath(thread.parent, originalPath);

                try {
                    this.vfsManager.delete(resolvedPath);
                    this.returnSuccess(thread);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
                break;
            }

            case Syscall.FsSize: {
                const originalPath: string = args[0];
                const resolvedPath: string = this.resolvePath(thread.parent, originalPath);

                try {
                    const result: number = this.vfsManager.getSize(resolvedPath);
                    this.returnSuccess(thread, result);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
                break;
            }

            case Syscall.FsGetCapacity: {
                const originalPath: string = args[0];
                const resolvedPath: string = this.resolvePath(thread.parent, originalPath);

                try {
                    const result: number = this.vfsManager.getCapacity(resolvedPath);
                    this.returnSuccess(thread, result);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
                break;
            }

            case Syscall.FsGetFreeSpace: {
                const originalPath: string = args[0];
                const resolvedPath: string = this.resolvePath(thread.parent, originalPath);

                try {
                    const result: number = this.vfsManager.getFreeSpace(resolvedPath);
                    this.returnSuccess(thread, result);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
                break;
            }

            case Syscall.FsGetMetadata: {
                const originalPath: string = args[0];
                const resolvedPath: string = this.resolvePath(thread.parent, originalPath);

                try {
                    const result: IFileMetadata = this.vfsManager.getMetadata(resolvedPath);
                    this.returnSuccess(thread, result);
                } catch (e) {
                    this.returnError(thread, e as string);
                }
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