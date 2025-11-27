import {IFsStateStream} from "../../../vfs/IFsStateStream";
import {FsOpenMode} from "../../../vfs/IFsDriver";
import {RootFsMetadataManager} from "./RootFsMetadataManager";

export class RootFsStateStream implements IFsStateStream {
    private isOpen: boolean = true;
    private changed: boolean = false;

    public constructor(
        // specific CC handle type intersection
        private path: string,
        private handle: ReadFileHandle & WriteFileHandle,
        private mode: FsOpenMode,
        private metadataManager: RootFsMetadataManager,
    ) {
        if (mode === "w") {
            this.changed = true;
        }
    }

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
        this.changed = true;
    }

    public writeLine(data: string): void {
        if (!this.isOpen) return;
        if (this.mode === "r") error("File is read-only");
        this.handle.writeLine(data);
        this.changed = true;
    }

    public seek(whence: "set" | "cur" | "end", offset: number = 0): number {
        if (!this.isOpen) return -1;
        return this.handle.seek(whence, offset);
    }

    public flush(): void {
        if (!this.isOpen) return;
        this.handle.flush();
        if (this.changed) this.metadataManager.edit(this.path, {
            modified: os.epoch("utc"),
        })
    }

    public close(): void {
        if (!this.isOpen) return;
        this.handle.close();
        this.isOpen = false;
        if (this.changed) this.metadataManager.edit(this.path, {
            modified: os.epoch("utc"),
        })
    }
}