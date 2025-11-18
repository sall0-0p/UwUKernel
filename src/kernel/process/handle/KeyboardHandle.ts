import {IReadHandle} from "./IHandle";
import {Thread} from "../Thread";
import {EventType, IEvent} from "../Event";
import {HandleId, Process} from "../Process";
import {IProcessInterceptor} from "../interceptor/IProcessInterceptor";
import {Scheduler} from "../Scheduler";
import {TerminalHandle} from "./TerminalHandle";

export class KeyboardHandle implements IReadHandle, IProcessInterceptor {
    private charBuffer: string[] = [];
    private currentProcess: Process | null;
    private blockedThread: Thread | null;
    private requiredCount: number | null;

    onAdded(process: Process, id: HandleId) {
        this.currentProcess = process;
        process.registerInterceptor(this);
    }

    onRemoved(process: Process, id: HandleId) {
        process.deregisterInterceptor(this);
        this.currentProcess = null;
    }

    onEvent(event: IEvent, scheduler: Scheduler): boolean {
        let isLineBreak = false;
        let wasRecorded = false;

        // this.echo(event);

        // if character put into buffer
        if (event.type === EventType.Char) {
            this.charBuffer.push(event.props.char);

            // consume the event
            return true;
        } else if (event.type === EventType.Key) {
            // if enter put into buffer as line break
            if (event.props.key === keys.enter) {
                this.charBuffer.push("\n");
                isLineBreak = true;

                // consume the event
                wasRecorded = true;

            // if backspace remove last char from buffer
            } else if (event.props.key === keys.backspace) {
                this.charBuffer.pop();

                // consume the event
                wasRecorded = true;
            }
        }

        // if waiting for certain amount of events
        if (this.blockedThread &&
            this.requiredCount &&
            this.charBuffer.length >= this.requiredCount
        ) {
            let result: string = "";
            while (result.length < this.requiredCount && this.charBuffer.length > 0) {
                result = result + this.charBuffer.shift();
            }

            // send to the process
            scheduler.readyThread(this.blockedThread, [result]);
            this.blockedThread = null;
            this.requiredCount = null;

            // consume event
            return true;

        // if waiting for a line
        } else if (this.blockedThread && isLineBreak && !this.requiredCount) {
            let result: string = "";
            while (this.charBuffer.length > 0) {
                const char = this.charBuffer.shift();
                if (char === "\n") break;
                result = result + char;
            }

            // send to the process
            scheduler.readyThread(this.blockedThread, [result]);
            this.blockedThread = null;

            // consume event
            return true;
        }

        // do not consume event if fits no criteria
        return wasRecorded;
    }

    isEmpty(): boolean {
        return true;
    }

    read(count: number, thread?: Thread): string {
        if (!thread) {
            return "";
        }

        let result: string = "";
        if (this.charBuffer.length >= count) {
            let resultingChars = this.charBuffer.splice(0, count);
            result = resultingChars.reduce((c, n) => c + n);
            return result;
        } else {
            this.blockedThread = thread;
            this.requiredCount = count;
            return null;
        }
    }

    readLine(thread: Thread): string {
        if (!thread) {
            return "";
        }

        let result: string = "";
        if (this.charBuffer.includes("\n")) {
            while (this.charBuffer.length > 0) {
                const char = this.charBuffer.shift();
                if (char === "\n") break;
                result = result + char;
            }
            return result;
        } else {
            this.blockedThread = thread;
            return null;
        }
    }

    readAll(): string {
        error("Method not implemented.");
    }

    // Echoing
    private echo(event: IEvent) {
        const stdout = this.currentProcess.getHandle(1);
        if (stdout && stdout instanceof TerminalHandle) {
            if (event.type === EventType.Char) {
                stdout.write(event.props.char);
            }
        }
    }
}