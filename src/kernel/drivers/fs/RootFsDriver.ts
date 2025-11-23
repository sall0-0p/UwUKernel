import {FsOpenMode, IFsDriver} from "../../vfs/IFsDriver";
import {IFileMetadata} from "../../vfs/IFileMetadata";
import {IFsStateStream} from "../../vfs/IFsStateStream";

export class RootFsStateStream implements IFsStateStream {
    private isOpen: boolean = true;

    public constructor(
        // specific CC handle type intersection
        private handle: ReadFileHandle & WriteFileHandle,
        private mode: FsOpenMode
    ) {}

    public read(count: number): string | null {
        if (!this.isOpen) return null;
        if (this.mode !== "r") error("File is write-only");

        const res = this.handle.read(count);
        return res === undefined ? null : res as string;
    }

    public readLine(withTrailing: boolean = false): string | null {
        if (!this.isOpen) return null;
        if (this.mode !== "r") error("File is write-only");

        const res = this.handle.readLine(withTrailing);
        return res === undefined ? null : res;
    }

    public readAll(): string | null {
        if (!this.isOpen) return null;
        if (this.mode !== "r") error("File is write-only");

        const res = this.handle.readAll();
        return res === undefined ? null : res;
    }

    public write(data: string): void {
        if (!this.isOpen) return;
        if (this.mode === "r") error("File is read-only");
        this.handle.write(data);
    }

    public writeLine(data: string): void {
        if (!this.isOpen) return;
        if (this.mode === "r") error("File is read-only");
        this.handle.writeLine(data);
    }

    public seek(whence: "set" | "cur" | "end", offset: number = 0): number {
        if (!this.isOpen) return -1;
        return this.handle.seek(whence, offset);
    }

    public flush(): void {
        if (!this.isOpen) return;
        this.handle.flush();
    }

    public close(): void {
        if (this.isOpen) {
            this.handle.close();
            this.isOpen = false;
        }
    }
}

export class RootFsDriver implements IFsDriver {
    public readonly id: string = "rootFs";
    public readonly isReadOnly: boolean = false;

    public constructor(private physicalRoot: string) {

    }

    exists(path: string): boolean {
        path = "/" + fs.combine(this.physicalRoot, path);
        return fs.exists(path);
    }

    open(path: string, mode: FsOpenMode): IFsStateStream | undefined {
        path = "/" + fs.combine(this.physicalRoot, path);
        // @ts-ignore
        const [handle] = fs.open(path, mode);
        if (handle) {
            return new RootFsStateStream(handle, mode);
        } else {
            return undefined;
        }
    }

    list(path: string): string[] {
        path = "/" + fs.combine(this.physicalRoot, path);
        return fs.list(path);
    }

    mkdir(path: string): void {
        path = "/" + fs.combine(this.physicalRoot, path);
        fs.makeDir(path);
    }

    move(from: string, to: string): void {
        from = "/" + fs.combine(this.physicalRoot, from);
        to = "/" + fs.combine(this.physicalRoot, to);
        fs.move(from, to);
    }


    copy(from: string, to: string): void {
        from = "/" + fs.combine(this.physicalRoot, from);
        to = "/" + fs.combine(this.physicalRoot, to);
        fs.copy(from, to);
    }

    delete(path: string): void {
        path = "/" + fs.combine(this.physicalRoot, path);
        fs.delete(path);
    }

    getCapacity(): number {
        return fs.getCapacity(this.physicalRoot);
    }

    getFreeSpace(): number {
        return fs.getFreeSpace(this.physicalRoot);
    }

    getMetadata(path: string): IFileMetadata {
        path = "/" + fs.combine(this.physicalRoot, path);
        return {
            owner: 0,
            permissions: 0o000,
            created: os.epoch("utc"),
            modified: os.epoch("utc"),
            isDirectory: fs.isDir(path),
            size: fs.getSize(path),
        } as IFileMetadata;
    }

    getSize(path: string): number {
        path = "/" + fs.combine(this.physicalRoot, path);
        return fs.getSize(path);
    }
}