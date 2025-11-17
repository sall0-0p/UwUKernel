import {IWriteHandle} from "./IHandle";

export class TerminalHandle implements IWriteHandle {
    write(text: string): void {
        term.write(text);
    }

    writeLine(text: string): void {
        term.scroll(1);
        term.setCursorPos(1, term.getCursorPos()[1]);
        term.write(text);
    }

    flush(): void {
        return null;
    }

    close(): void {
        return null;
    }
}