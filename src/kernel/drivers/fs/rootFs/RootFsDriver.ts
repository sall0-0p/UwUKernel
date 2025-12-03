import {FsOpenMode, IFsDriver} from "../../../vfs/IFsDriver";
import {IFileMetadata} from "../../../vfs/IFileMetadata";
import {IFsStateStream} from "../../../vfs/IFsStateStream";
import {RootFsStateStream} from "./RootFsStateStream";
import {RootFsMetadataManager} from "./RootFsMetadataManager";
import {Logger} from "../../../lib/Logger";
import {Process} from "../../../process/Process";

export class RootFsDriver implements IFsDriver {
    public readonly id: string = "rootFs";
    public readonly isReadOnly: boolean = false;
    public readonly metadataManager: RootFsMetadataManager;

    public constructor(private physicalRoot: string) {
        this.metadataManager = new RootFsMetadataManager(this.physicalRoot);
    }

    exists(path: string): boolean {
        path = "/" + fs.combine(this.physicalRoot, path);
        return fs.exists(path);
    }

    open(path: string, mode: FsOpenMode, process?: Process): IFsStateStream | undefined {
        path = "/" + fs.combine(this.physicalRoot, path);
        const alreadyExists = fs.exists(path);

        // @ts-ignore
        const [handle] = fs.open(path, mode);
        if (handle) {
            if (!alreadyExists && (mode === FsOpenMode.Write || mode === FsOpenMode.Append)) {
                this.metadataManager.set(path, {
                    type: "f",
                    owner: process ? process.euid : 0,
                    group: process ? process.gid : 0,
                    permissions: 0o644, // Default file permissions
                    created: os.epoch("utc"),
                    modified: os.epoch("utc"),
                    isDirectory: false,
                    isSystem: false,
                    isReadOnly: false,
                    size: 0
                });
            }

            return new RootFsStateStream(path, handle, mode, this.metadataManager);
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
        this.metadataManager.move(from, to);
    }

    copy(from: string, to: string): void {
        from = "/" + fs.combine(this.physicalRoot, from);
        to = "/" + fs.combine(this.physicalRoot, to);
        fs.copy(from, to);
        this.metadataManager.copy(from, to);
    }

    delete(path: string): void {
        path = "/" + fs.combine(this.physicalRoot, path);
        fs.delete(path);
        this.metadataManager.delete(path);
    }

    getCapacity(): number {
        return fs.getCapacity(this.physicalRoot);
    }

    getFreeSpace(): number {
        return fs.getFreeSpace(this.physicalRoot);
    }

    getMetadata(path: string): IFileMetadata {
        path = "/" + fs.combine(this.physicalRoot, path);
        return this.metadataManager.get(path);
    }

    setMetadata(path: string, metadata: IFileMetadata): void {
        path = "/" + fs.combine(this.physicalRoot, path);
        Logger.info(path);
        Logger.info(textutils.serialize(metadata));
        Logger.info(debug.traceback());
        const result = this.metadataManager.set(path, metadata);
        Logger.info(`${result}`);
    }

    getSize(path: string): number {
        path = "/" + fs.combine(this.physicalRoot, path);
        return fs.getSize(path);
    }
}