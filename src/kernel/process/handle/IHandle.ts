export interface IHandle {

}

export interface IReadHandle extends IHandle {
    isEmpty(): boolean;

    // Reads
    read(count: number): string | number[] | null;
    readLine(): string | null;
    readAll(): string | number[] | null;
}

export interface IWriteHandle extends IHandle {
    write(text: string): void;
    writeLine(text: string): void;
    flush(): void;
    close(): void;
}