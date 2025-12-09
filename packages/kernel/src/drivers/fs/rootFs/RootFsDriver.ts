import {FsOpenMode, IFsActionContext, IFsDriver} from "../../../vfs/IFsDriver";
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
        if (path.endsWith(".fs_meta")) return false;
        return fs.exists(path);
    }

    open(path: string, mode: FsOpenMode, context?: IFsActionContext): IFsStateStream | undefined {
        path = "/" + fs.combine(this.physicalRoot, path);
        const alreadyExists = fs.exists(path);

        if (path.endsWith(".fs_meta")) error("Cannot open .fs_meta, its a metadata file.");

        // @ts-ignore
        const [handle] = fs.open(path, mode);
        if (handle) {
            if (!alreadyExists && (mode === FsOpenMode.Write || mode === FsOpenMode.Append)) {
                this.metadataManager.set(path, {
                    type: "f",
                    owner: context ? context.euid : 0,
                    group: context ? context.gid : 0,
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
        const list = fs.list(path);
        return list.filter((item) => item !== ".fs_meta");
    }

    mkdir(path: string): void {
        path = "/" + fs.combine(this.physicalRoot, path);
        if (path.endsWith(".fs_meta")) error("Cannot overwrite .fs_meta");
        fs.makeDir(path);

        this.metadataManager.set(path, {
            type: "d",
            owner: 0,
            group: 0,
            permissions: 0o755,
            created: os.epoch("utc"),
            modified: os.epoch("utc"),
            isDirectory: true,
            isSystem: false,
            isReadOnly: false,
            size: 0
        });
    }

    move(from: string, to: string): void {
        from = "/" + fs.combine(this.physicalRoot, from);
        to = "/" + fs.combine(this.physicalRoot, to);
        if (from.endsWith(".fs_meta")) error("Cannot move .fs_meta");
        if (to.endsWith(".fs_meta")) error("Cannot overwrite .fs_meta");
        fs.move(from, to);
        this.metadataManager.move(from, to);
    }

    copy(from: string, to: string): void {
        from = "/" + fs.combine(this.physicalRoot, from);
        to = "/" + fs.combine(this.physicalRoot, to);
        if (from.endsWith(".fs_meta")) error("Cannot read .fs_meta");
        if (to.endsWith(".fs_meta")) error("Cannot overwrite .fs_meta");
        fs.copy(from, to);
        this.metadataManager.copy(from, to);
    }

    delete(path: string): void {
        path = "/" + fs.combine(this.physicalRoot, path);
        if (path.endsWith(".fs_meta")) error("Cannot delete .fs_meta");
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
        if (path.endsWith(".fs_meta")) error("Cannot get metadata for .fs_meta, its a metadata file.");
        return this.metadataManager.get(path);
    }

    setMetadata(path: string, metadata: Partial<IFileMetadata>): void {
        path = "/" + fs.combine(this.physicalRoot, path);
        if (path.endsWith(".fs_meta")) error("Cannot set metadata for .fs_meta, its a metadata file.");
        this.metadataManager.edit(path, metadata);
    }

    getSize(path: string): number {
        path = "/" + fs.combine(this.physicalRoot, path);
        return fs.getSize(path);
    }
}