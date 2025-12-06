import {PID, Process, ProcessDetails, ProcessState} from "./Process";
import {Thread} from "./Thread";
import {EnvironmentFactory} from "../syscall/EnvironmentFactory";
import {Scheduler} from "./Scheduler";

export class ProcessManager {
    public readonly processes: Map<PID, Process> = new Map();
    private readonly scheduler: Scheduler;
    public constructor(scheduler: Scheduler) {
        this.scheduler = scheduler;
    }

    /**
     * Creates new process and assigns it to scheduler. Creates a main thread of the process.
     * @param cwd current working directory, process is created in.
     * @param name name of the current process (human readable)
     * @param code code to execute.
     * @param parent parent process (can be nill).
     */
    public createProcess(cwd: string, name: string, code: string, parent?: Process): Process {
        const newProcess = new Process(this.scheduler, cwd, name, parent);
        newProcess.environment = EnvironmentFactory.getEnvironment(newProcess);

        const mainThread = new Thread(newProcess, code);
        newProcess.addThread(mainThread);

        this.processes.set(newProcess.pid, newProcess);
        this.scheduler.addThread(mainThread);

        return newProcess;
    }

    /**
     * Creates a new thread inside a process. It shares the environment with it.
     * @param code code to be executed.
     * @param parent parent process thread will be attached to.
     */
    public createThread(code: string, parent: Process): Thread {
        const newThread = new Thread(parent, code);
        parent.addThread(newThread);

        this.scheduler.addThread(newThread);
        return newThread;
    }

    /**
     * Exits the process.
     * @param pid - identifier of the process to exit.
     * @param exitCode - code to exit with, examples include `0` meaning success, `1` meaning error.
     * @param exitReason - reason for exit (for example, error message).
     */
    public exitProcess(pid: PID, exitCode: number, exitReason?: string) {
        const process = this.processes.get(pid);
        if (!process) return;

        process.state = ProcessState.Zombie;
        process.exitCode = exitCode;
        process.exitReason = exitReason || "No reason provided";
        process.closeAllHandles();

        this.scheduler.killProcessThreads(pid);
        this.scheduler.onProcessExit(pid, exitCode, exitReason || "No reason provided", process.parent?.pid);

        if (process.parent && (process.parent.state === "dead"
            || process.parent.state === "zombie")) {
            this.deleteProcess(process);
        }
    }

    /**
     * Wait for process to exit.
     * @param pid - identifier of the process we are waiting for.
     * @param waitingThread - thread that waits for it.
     * @returns true if exited immediately, false if forced to yield.
     */
    public waitForProcessExit(pid: PID, waitingThread: Thread): boolean {
        const target = this.processes.get(pid);

        if (!target) {
            this.scheduler.readyThread(waitingThread, [false, "No such process"]);
            return true;
        }

        if (target.parent && target.parent.pid !== waitingThread.parent.pid) {
            this.scheduler.readyThread(waitingThread, [false, "Process is not a child of this process"]);
            return true;
        }

        if (target.state === ProcessState.Zombie) {
            const code = target.exitCode;
            const reason = target.exitReason;
            this.deleteProcess(target);
            this.scheduler.readyThread(waitingThread, [true, pid, code, reason]);
            return true;
        } else {
            this.scheduler.waitForProcess(waitingThread, pid);
            return false;
        }
    }

    /**
     * Returns all processes existing.
     */
    public getAllProcesses(): Process[] {
        const result: Process[] = [];
        this.processes.forEach((p) => result.push(p));
        return result;
    }

    /**
     * Returns specific process by pid.
     * @param pid identifier of the requested process.
     */
    public getProcessByPID(pid: PID): Process | undefined {
        return this.processes.get(pid);
    }

    /**
     * Returns process details
     * @param process - process to get details for
     */
    public getProcessDetails(process: Process): ProcessDetails {
        return {
            pid: process.pid,
            ppid: process.parent?.pid || -1,
            uid: process.uid,
            gid: process.gid,

            state: process.state,
            name: process.name,
            cwd: process.workingDir,
            cpuTime: process.cpuTime,
            sysTime: process.sysTime,

            threads: process.threads.size,
            handles: process.countHandles(),
        }
    }

    // Remove process completely from the system.
    private deleteProcess(process: Process) {
        process.state = ProcessState.Dead;
        this.processes.delete(process.pid);
    }
}