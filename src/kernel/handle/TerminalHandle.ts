import {IWriteHandle} from "./IHandle";
import {Thread} from "../process/Thread";
import {HandleId, Process} from "../process/Process";

export class TerminalHandle implements IWriteHandle {

    onAdded(process: Process, id: HandleId) {

    }

    onRemoved(process: Process, id: HandleId) {

    }

    write(text: string): void {
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.length > 0) {
                term.write(line);
            }

            if (i < lines.length - 1) {
                const [x, y] = term.getCursorPos();
                const [w, h] = term.getSize();

                if (y >= h) {
                    term.scroll(1);
                    term.setCursorPos(1, h);
                } else {
                    term.setCursorPos(1, y + 1);
                }
            }
        }
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
        return;
    }

    close(): void {
        return;
    }
}