import {Scheduler} from "../process/Scheduler";
import {EventType, IEvent, RoutingType} from "./Event";
import {ProcessManager} from "../process/ProcessManager";
import {PID, Process} from "../process/Process";
import {Logger} from "../lib/Logger";

export class EventManager {
    public constructor(private scheduler: Scheduler, private processManager: ProcessManager) {
    }

    // Focused process designation;
    private focusedProcess: Process;
    public getFocusedProcess() {
        return this.focusedProcess;
    }

    public setFocusedProcess(process: Process) {
        this.focusedProcess = process;
    }

    // Dispatching events
    public dispatch(rawEventData: any[]) {
        const eventType: EventType = rawEventData[0];
        let event: IEvent | null = null;

        switch (eventType) {
            case EventType.Key:
                event = {
                    type: eventType,
                    routingType: RoutingType.Focused,
                    props: {
                        key: rawEventData[1],
                        isHeld: rawEventData[2],
                    }
                }
                break;
            case EventType.Char:
                event = {
                    type: eventType,
                    routingType: RoutingType.Focused,
                    props: {
                        char: rawEventData[1],
                    }
                }
                break;
            case EventType.ScreenResize:
                const [x, y] = term.getSize();
                event = {
                    type: eventType,
                    routingType: RoutingType.Broadcast,
                    props: {
                        x, y
                    }
                }
                break;
            case EventType.Timer:
                event = {
                    type: eventType,
                    routingType: RoutingType.Broadcast,
                    props: {
                        id: rawEventData[1],
                    }
                }
                break;
        }

        if (!event) return null;

        switch (event.routingType) {
            case RoutingType.Broadcast:
                this.broadcastEvent(event);
                break;
            case RoutingType.Focused:
                if (this.focusedProcess) this.sendEventTo(event, this.focusedProcess.pid);
                break;
        }
    }

    private broadcastEvent(event: IEvent) {
        const processes = this.processManager.getAllProcesses();
        processes.forEach((p) => {
            p.queueEvent(event);
        })
    }

    private sendEventTo(event: IEvent, pid: PID) {
        const process = this.processManager.getProcessByPID(pid);
        if (!process) Logger.error("Process not found!");
        process.queueEvent(event);
    }
}