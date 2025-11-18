import {IWriteHandle} from "./IHandle";

export class TerminalHandle implements IWriteHandle {
    write(text: string): void {
        term.write(text);
    }

    writeLine(text: string): void {
        const y = term.getCursorPos()[1];
        term.setCursorPos(1, y);
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