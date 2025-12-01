// Stream implementation for Read-Only access
import {IFsStateStream} from "../../vfs/IFsStateStream";
import {IFsDriver} from "../../vfs/IFsDriver";
import {IFileMetadata} from "../../vfs/IFileMetadata";
import {RootFsMetadataManager} from "./rootFs/RootFsMetadataManager";

export class RomFsStream implements IFsStateStream {
    private isOpen: boolean = true;

    public constructor(
        private handle: ReadFileHandle,
    ) {
    }

    public read(count: number): string | null {
        if (!this.isOpen) return null;
        const res = this.handle.read(count);
        return res === undefined ? null : res as string;
    }

    public readLine(withTrailing: boolean = false): string | null {
        if (!this.isOpen) return null;
        const res = this.handle.readLine(withTrailing);
        return res === undefined ? null : res;
    }

    public readAll(): string | null {
        if (!this.isOpen) return null;
        const res = this.handle.readAll();
        return res === undefined ? null : res;
    }

    public write(data: string): void {
        error("File is read-only");
    }

    public writeLine(data: string): void {
        error("File is read-only");
    }

    public seek(whence: "set" | "cur" | "end", offset: number = 0): number {
        if (!this.isOpen) return -1;
        return this.handle.seek(whence, offset);
    }

    public flush(): void {
        // No-op for read-only
    }

    public close(): void {
        if (this.isOpen) {
            this.handle.close();
            this.isOpen = false;
        }
    }
}

export class RomFSDriver implements IFsDriver {
    public readonly id: string = "romFs";
    public readonly isReadOnly: boolean = true;

    public constructor(private physicalRoot: string) {
    }

    private resolve(path: string): string {
        return fs.combine(this.physicalRoot, path);
    }

    public exists(path: string): boolean {
        return fs.exists(this.resolve(path));
    }

    public open(path: string, mode: string): IFsStateStream | undefined {
        if (mode !== "r") {
            return undefined;
        }

        const [handle] = fs.open(this.resolve(path), mode);
        if (handle) {
            return new RomFsStream(handle as ReadFileHandle);
        }
        return undefined;
    }

    public getMetadata(path: string): IFileMetadata {
        return {
            type: fs.isDir(path) ? "d" : "f",
            owner: 0,
            group: 0,
            permissions: 0o0555,
            created: 0,
            modified: 0,
            isSystem: false,
            isReadOnly: false,
            isDirectory: fs.isDir(this.resolve(path)),
            size: fs.getSize(this.resolve(path))
        };
    }

    public setMetadata(path: string, metadata: IFileMetadata): void {
        return;
    }

    public list(path: string): string[] {
        return fs.list(this.resolve(path));
    }

    public getSize(path: string): number {
        return fs.getSize(this.resolve(path));
    }

    public mkdir(path: string): void {
        error("Read-only filesystem");
    }

    public delete(path: string): void {
        error("Read-only filesystem");
    }

    public move(from: string, to: string): void {
        error("Read-only filesystem");
    }

    public copy(from: string, to: string): boolean {
        return false;
    }

    public getCapacity(): number {
        return 0;
    }

    public getFreeSpace(): number {
        return 0;
    }
}