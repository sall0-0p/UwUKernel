export interface IHandle {

}

export interface IReadHandle extends IHandle {
    isEmpty(): boolean;

    // Read all's
    readAll(): string;
    readAllNumbers(): number[];
    readAllLines(): string[];
    readAllChars(): string[];
    readAllStrings(): string[];
    readAllBytes(): number[];

    // Reads
    readNumber(): number;
    readLine(): string;
    readChar(): string;
    readString(): string;
    readByte(): number;
}

export interface IWriteHandle extends IHandle {
    write(text: string): void;
    writeLine(text: string): void;
    flush(): void;
    close(): void;
}