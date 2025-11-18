import {HandleId, Process} from "../Process";
import {Thread} from "../Thread";

export interface IHandle {
    onAdded?(process: Process, id: HandleId): void;
    onRemoved?(process: Process, id: HandleId): void;
    close(thread?: Thread): void;
}

export interface IReadHandle extends IHandle {
    isEmpty(thread?: Thread): boolean;

    // Reads
    read(count: number, thread?: Thread): string | null;
    readLine(thread?: Thread): string | null;
    readAll(thread?: Thread): string | null;
}

export interface IWriteHandle extends IHandle {
    write(text: string, thread?: Thread): void;
    writeLine(text: string, thread?: Thread): void;
    flush(thread?: Thread): void;
}