import {IWriteHandle} from "./IHandle";
import {Thread} from "../Thread";
import {HandleId, Process} from "../Process";

export class TerminalHandle implements IWriteHandle {

    onAdded(process: Process, id: HandleId) {

    }

    onRemoved(process: Process, id: HandleId) {

    }

    write(text: string): void {
        term.write(text);
    }

    writeLine(text: string): void {
        const y = term.getCursorPos()[1];
        if (y > term.getSize()[1]) {
            term.scroll(1);
        }
        term.write(text);
        term.setCursorPos(1, y+1);
    }

    flush(): void {
        return null;
    }

    close(): void {
        return null;
    }
}