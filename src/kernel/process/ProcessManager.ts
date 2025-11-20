import {PID, Process} from "./Process";
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
     * @param code code to execute.
     * @param parent parent process (can be nill).
     */
    public createProcess(cwd: string, code: string, parent?: Process): Process {
        const newProcess = new Process(this.scheduler, cwd, parent);
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
}