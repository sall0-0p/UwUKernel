import {FsOpenMode, IFsDriver} from "./IFsDriver";
import {FileHandle} from "../handle/FileHandle";
import {IFileMetadata} from "./IFileMetadata";
import {IFsStateStream} from "./IFsStateStream";
import {Process} from "../process/Process";
import {IPermissionSet, PermissionUtils} from "../lib/PermissionUtils";
import {Logger} from "../lib/Logger";

interface MountPoint {
    path: string,
    driver: IFsDriver,
}

export class VFSManager {
    private mounts: MountPoint[] = [];

    public mount(path: string, driver: IFsDriver) {
        let cleanPath = path.startsWith("/") ? path : "/" + path;
        if (cleanPath.length > 1 && cleanPath.endsWith("/")) {
            cleanPath = cleanPath.substring(0, cleanPath.length - 1);
        }

        this.mounts.push({ path: cleanPath, driver });
        this.mounts.sort((a, b) => b.path.length - a.path.length);

        if (path !== "/") {
            const resolved = this.resolve(path);
            const driver = resolved?.driver;
            if (!resolved || !driver) return;
            const prevMetadata = this.getMetadata(path);
            prevMetadata.type = "m";
            Logger.info(path);
            Logger.info(resolved.driver.id);
            Logger.info(resolved.relativePath);
            driver.setMetadata(resolved.relativePath, prevMetadata);
        }
    }

    public unmount(path: string): boolean {
        const index = this.mounts.findIndex(m => m.path === path);
        if (index >= 0) {
            this.mounts.splice(index, 1);
            return true;
        }
        return false;
    }

    private resolve(virtualPath: string): { driver: IFsDriver, relativePath: string } | undefined {
        const cleanPath = "/" + fs.combine("/", virtualPath);

        for (const mount of this.mounts) {
            if (mount.path === "/") {
                return { driver: mount.driver, relativePath: cleanPath.substring(1) };
            } else if (cleanPath.startsWith(mount.path + "/")) {
                const relativePath = cleanPath.substring(mount.path.length + 1);
                return { driver: mount.driver, relativePath };
            }
        }
        return undefined;
    }

    public open(path: string, mode: FsOpenMode, process?: Process): FileHandle {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");

        if (process && !this.checkTraversalPermissions(path, process)) error("No permissions.");
        if (mode === "r") {
            if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Read, process)) error("No permissions.");
        } else if (mode === "w" || mode === "a") {
            if (!this.exists(path)) {
                // If file does not exist, we want to create it, so check parent dir write permissions
                if (process && !this.checkPermissions(this.getMetadata("/" + fs.getDir(path)), FsOpenMode.Write, process)) error("No permissions.");
            } else {
                // Otherwise, check file write permissions.
                if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Write, process)) error("No permissions.");
            }
        } else if (mode === "x") {
            if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Execute, process)) error("No permissions.");
        }

        if (mode === FsOpenMode.Execute) mode = FsOpenMode.Read;
        const stream = resolved.driver.open(resolved.relativePath, mode);
        if (!stream) error("Could not open file");

        return new FileHandle(stream);
    }

    public list(path: string, process?: Process): string[] {
        const resolved = this.resolve(path);
        if (!resolved) error("No such directory;");
        if (!this.isDir(path)) error("Cannot list a file, it must be a directory");

        if (process && !this.checkTraversalPermissions(path, process)) error("No permissions.");
        if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Read, process)) error("No permissions.");

        return resolved.driver.list(resolved.relativePath);
    }

    public exists(path: string, process?: Process): boolean {
        const resolved = this.resolve(path);
        if (!resolved) return false;

        const result = resolved.driver.exists(resolved.relativePath);
        if (!result) return false;
        if (process && !this.checkTraversalPermissions(path, process)) error("No permissions.");
        if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Read, process)) error("No permissions.");
        return true;
    }

    public isDir(path: string, process?: Process): boolean {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");

        if (process && !this.checkTraversalPermissions(path, process)) error("No permissions.");
        if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Read, process)) error("No permissions.");

        return resolved.driver.getMetadata(resolved.relativePath).isDirectory;
    }

    public getMetadata(path: string, process?: Process): IFileMetadata {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");

        if (process && !this.checkTraversalPermissions(path, process)) error("No permissions.");
        if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Read, process)) error("No permissions.");

        return resolved.driver.getMetadata(resolved.relativePath);
    }

    public getSize(path: string, process?: Process): number {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");

        if (process && !this.checkTraversalPermissions(path, process)) error("No permissions.");
        if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Read, process)) error("No permissions.");

        return resolved.driver.getSize(resolved.relativePath);
    }

    public getCapacity(path: string, process?: Process): number {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");

        if (process && !this.checkTraversalPermissions(path, process)) error("No permissions.");
        if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Read, process)) error("No permissions.");

        return resolved.driver.getCapacity();
    }

    public getFreeSpace(path: string, process?: Process): number {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");

        if (process && !this.checkTraversalPermissions(path, process)) error("No permissions.");
        if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Read, process)) error("No permissions.");

        return resolved.driver.getFreeSpace();
    }

    public makeDir(path: string, process?: Process): void {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");

        if (process && !this.checkTraversalPermissions(path, process)) error("No permissions.");
        if (process && !this.checkPermissions(this.getMetadata("/" + fs.getDir(path)), FsOpenMode.Write, process)) error("No permissions.");

        try {
            resolved.driver.mkdir(resolved.relativePath);
            return;
        } catch (e: any) {
            error(e.message || "Unknown error");
        }
    }

    public delete(path: string, process?: Process): boolean | string {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");

        const targetMeta = this.getMetadata(path);
        if (process && !this.checkTraversalPermissions(path, process)) error("No permissions.");
        if (process && !this.checkPermissions(targetMeta, FsOpenMode.Write, process)) error("No permissions.");

        if (process) {
            const parentPath = "/" + fs.getDir(path);
            const parentMeta = this.getMetadata(parentPath);
            if (!this.checkStickyBit(parentMeta, targetMeta, process)) {
                error("Operation not permitted (Sticky bit restriction)");
            }
        }

        try {
            resolved.driver.delete(resolved.relativePath);
            return true;
        } catch (e: any) {
            error(e.message || "Unknown error");
        }
    }

    public copy(from: string, to: string, process?: Process): void {
        const src = this.resolve(from);
        const dest = this.resolve(to);
        if (!src) error("Source not found!");
        if (!dest) error("Destination not found!");
        if (process && !this.checkPermissions(this.getMetadata(from), FsOpenMode.Read, process)) error("No permissions.");
        if (process && !this.checkPermissions(this.getMetadata("/" + fs.getDir(to)), FsOpenMode.Write, process)) error("No permissions.");
        if (dest.driver.exists(dest.relativePath))
            error("Destination exists!");

        if (src.driver === dest.driver) {
            try {
                src.driver.copy(src.relativePath, dest.relativePath);
            } catch (e: any) {
                error(e.message || "Copy failed");
            }
        }

        this.manualCopy(src.driver, src.relativePath, dest.driver, dest.relativePath);
    }

    public move(from: string, to: string, process?: Process): void {
        const src = this.resolve(from);
        const dest = this.resolve(to);
        if (!src) error("Source not found!");
        if (!dest) error("Destination not found!");

        const fromMeta = this.getMetadata(from);
        if (process && !this.checkPermissions(fromMeta, FsOpenMode.Write, process)) error("No permissions.");
        if (process && !this.checkPermissions(this.getMetadata("/" + fs.getDir(to)), FsOpenMode.Write, process)) error("No permissions.");

        if (process) {
            const parentFromPath = "/" + fs.getDir(from);
            const parentFromMeta = this.getMetadata(parentFromPath);
            if (!this.checkStickyBit(parentFromMeta, fromMeta, process)) {
                error("Operation not permitted (Sticky bit restriction)");
            }
        }

        if (dest.driver.exists(dest.relativePath))
            error("Destination exists!");

        if (src.driver === dest.driver) {
            try {
                src.driver.move(src.relativePath, dest.relativePath);
                return;
            } catch (e: any) {
                error(e.message || "Move failed");
            }
        }

        this.manualCopy(src.driver, src.relativePath, dest.driver, dest.relativePath);
        try {
            src.driver.delete(src.relativePath);
            return;
        } catch (e: any) {
            error("Moved partially (Source delete failed): " + e.message);
        }
    }

    public chmod(path: string, octalPerms: number, process?: Process): void {
        const resolved = this.resolve(path);
        if (resolved === undefined) error("Failed to resolve path!");

        resolved.driver.setMetadata(resolved.relativePath, {
            permissions: octalPerms,
        })
    }

    public chown(path: string, uid: number, gid: number, process?: Process) {
        const resolved = this.resolve(path);
        if (resolved === undefined) error("Failed to resolve path!");

        if (process && !this.checkPermissions(this.getMetadata(path), FsOpenMode.Write, process)) error("No permissions!");

        if (uid >= 0) {
            resolved.driver.setMetadata(resolved.relativePath, { owner: uid })
        }

        if (gid >= 0) {
            resolved.driver.setMetadata(resolved.relativePath, { group: gid })
        }
    }

    private manualCopy(srcDriver: IFsDriver, srcPath: string, destDriver: IFsDriver, destPath: string): void {
        const sourceStream: IFsStateStream | undefined = srcDriver.open(srcPath, FsOpenMode.Read);
        if (!sourceStream) error("Could not open source file");

        const destStream: IFsStateStream | undefined = destDriver.open(destPath, FsOpenMode.Write);
        if (!destStream) {
            sourceStream.close();
            error("Could not open destination file");
        }

        try {
            const content = sourceStream.readAll();
            if (content !== null) {
                destStream.write(content);
            }
        } catch (e: any) {
            sourceStream.close();
            destStream.close();
            try { destDriver.delete(destPath); } catch {}
            error("Data transfer failed: " + (e.message || "Unknown error"));
        }

        sourceStream.close();
        destStream.close();

        const meta = srcDriver.getMetadata(srcPath);
        destDriver.setMetadata(destPath, meta);
    }

    private checkPermissions(meta: IFileMetadata, mode: FsOpenMode, process: Process): boolean {
        if (process.euid === 0) {
            return true;
        }

        const perms = PermissionUtils.parse(meta.permissions);
        let activeSet: IPermissionSet;

        if (process.euid === meta.owner) {
            activeSet = perms.user;
        } else if (process.gid === meta.group || process.groups.includes(meta.group)) {
            activeSet = perms.group;
        } else {
            activeSet = perms.other;
        }

        switch (mode) {
            case FsOpenMode.Read:
                return activeSet.read;
            case FsOpenMode.Write:
            case FsOpenMode.Append:
                return activeSet.write;
            case FsOpenMode.Execute:
                return activeSet.execute;
            default:
                return false;
        }
    }

    private checkTraversalPermissions(path: string, process: Process): boolean {
        const parts = path.split('/').filter(p => p.length > 0);
        let currentPath = "";

        for (const part of parts) {
            currentPath = "/" + (currentPath.length > 1 ? fs.combine(currentPath, part) : part);

            if (currentPath === path) {
                break;
            }

            const resolved = this.resolve(currentPath);
            if (!resolved) {
                return false;
            }

            const meta = resolved.driver.getMetadata(resolved.relativePath);
            if (!this.checkPermissions(meta, FsOpenMode.Execute, process)) {
                return false;
            }
        }
        return true;
    }

    public canAccessDirectory(path: string, process: Process): boolean {
        const resolved = this.resolve(path);
        if (!resolved) return false;

        if (!this.checkTraversalPermissions(path, process)) {
            return false;
        }

        const meta = resolved.driver.getMetadata(resolved.relativePath);
        return this.checkPermissions(meta, FsOpenMode.Execute, process);
    }

    private checkStickyBit(parentMeta: IFileMetadata, targetMeta: IFileMetadata, process: Process): boolean {
        if (process.euid === 0) return true;

        const perms = PermissionUtils.parse(parentMeta.permissions);

        if (!perms.sticky) return true;

        if (process.euid === targetMeta.owner || process.euid === parentMeta.owner) {
            return true;
        }

        return false;
    }
}