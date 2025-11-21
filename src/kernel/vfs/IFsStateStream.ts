export interface IFsStateStream {
    /**
     * Read data from file.
     * @param count - number of bytes to be read.
     */
    read(count: number): string | null;

    /**
     * Read line from a file.
     */
    readLine(): string | null;

    /**
     * Reads the rest of the file.
     */
    readAll(): string | null;

    /**
     * Write data to the file.
     */
    write(data: string): void;

    /**
     * Write a line.
     */
    writeLine(data: string): void;

    /**
     * Move the cursor.
     */
    seek(whence: "set" | "cur" | "end", offset?: number): number;

    /**
     * Flush current stream / handle.
     */
    flush(): void;

    /**
     * Close the underlying stream / handle.
     */
    close(): void;
}