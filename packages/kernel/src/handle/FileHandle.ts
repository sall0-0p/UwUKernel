import {IReadHandle, IWriteHandle} from "./IHandle";
import {IFsStateStream} from "../vfs/IFsStateStream";
import {Thread} from "../process/Thread";

export class FileHandle implements IReadHandle, IWriteHandle {
    constructor(private stream: IFsStateStream) {
        this.stream = stream;
    }

    isEmpty(thread?: Thread): boolean {
        return false;
    }

    read(count: number, thread?: Thread): string | null {
        return this.stream.read(count);
    }

    readAll(thread?: Thread): string | null {
        return this.stream.readAll();
    }

    readLine(thread?: Thread): string | null {
        return this.stream.readLine();
    }

    write(text: string, thread?: Thread): void {
        this.stream.write(text);
    }

    writeLine(text: string, thread?: Thread): void {
        this.stream.writeLine(text);
    }

    flush(thread?: Thread): void {
        this.stream.flush();
    }

    close(thread?: Thread): void {
        this.stream.close();
    }
}