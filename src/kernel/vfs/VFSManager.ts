import {FsOpenMode, IFsDriver} from "./IFsDriver";
import {FileHandle} from "../handle/FileHandle";
import {IFileMetadata} from "./IFileMetadata";
import {IFsStateStream} from "./IFsStateStream";

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
            if (cleanPath === mount.path) {
                return { driver: mount.driver, relativePath: "" };
            }

            if (mount.path === "/") {
                return { driver: mount.driver, relativePath: cleanPath.substring(1) };
            } else if (cleanPath.startsWith(mount.path + "/")) {
                const relativePath = cleanPath.substring(mount.path.length + 1);
                return { driver: mount.driver, relativePath };
            }
        }
        return undefined;
    }

    public open(path: string, mode: FsOpenMode): FileHandle {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");

        const stream = resolved.driver.open(resolved.relativePath, mode);
        if (!stream) error("Could not open file");

        return new FileHandle(stream);
    }

    public list(path: string): string[] {
        const resolved = this.resolve(path);
        if (!resolved) error("No such directory");

        return resolved.driver.list(resolved.relativePath);
    }

    public exists(path: string): boolean {
        const resolved = this.resolve(path);
        if (!resolved) return false;
        return resolved.driver.exists(resolved.relativePath);
    }

    public isDir(path: string): boolean {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");
        return resolved.driver.getMetadata(resolved.relativePath).isDirectory;
    }

    public getMetadata(path: string): IFileMetadata {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");
        return resolved.driver.getMetadata(resolved.relativePath);
    }

    public getSize(path: string): number {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");
        return resolved.driver.getSize(resolved.relativePath);
    }

    public getCapacity(path: string): number {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");
        return resolved.driver.getCapacity();
    }

    public getFreeSpace(path: string): number {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");
        return resolved.driver.getFreeSpace();
    }

    public makeDir(path: string): void {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");
        try {
            resolved.driver.mkdir(resolved.relativePath);
            return;
        } catch (e: any) {
            error(e.message || "Unknown error");
        }
    }

    public delete(path: string): boolean | string {
        const resolved = this.resolve(path);
        if (!resolved) error("Unable to resolve path: are you sure it is correct?");
        try {
            resolved.driver.delete(resolved.relativePath);
            return true;
        } catch (e: any) {
            error(e.message || "Unknown error");
        }
    }

    public copy(from: string, to: string): void {
        const src = this.resolve(from);
        const dest = this.resolve(to);
        if (!src) error("Source not found!");
        if (!dest) error("Destination not found!");
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

    public move(from: string, to: string): void {
        const src = this.resolve(from);
        const dest = this.resolve(to);
        if (!src) error("Source not found!");
        if (!dest) error("Destination not found!");
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
    }
}