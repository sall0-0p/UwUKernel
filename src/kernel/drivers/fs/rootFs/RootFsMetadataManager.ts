import {IFileMetadata} from "../../../vfs/IFileMetadata";
import {Logger} from "../../../lib/Logger";

interface MetadataEntry {
    name: string,
    // f - file, d - directory, s - symlink, m - mount
    type: "f" | "d" | "s" | "m",
    // Octal number: Special + User + Group + Everyone;
    // Special means: SetUID (4), SetGID (2), Sticky (1);
    // Others are: r (4), w (2), x (1),
    permissions: number,
    user: number,
    group: number,
    created: number,
    modified: number,
    // Hex number, currently: 1 - system
    flags: number,
}

interface LoadedMetadata {
    magic: string,
    version: number,
    data: Map<string, MetadataEntry>,
}

const META_MAGIC = "UwUF"
const META_FILE = ".fs_meta";
const CURRENT_VERSION = 1;

export class RootFsMetadataManager {
    constructor(private physicalRoot: string) {

    }

    // Reconcile the tree.
    public init() {
        if (!fs.exists(this.physicalRoot)) {
            Logger.error(`[MT] Root path ${this.physicalRoot} does not exist.`);
            return;
        }
        this.reconcile(this.physicalRoot);
    }

    private reconcile(path: string) {
        if (!fs.isDir(path)) return;

        const files = fs.list(path);
        const metaPath = "/" + fs.combine(path, META_FILE);

        // Load existing metadata or create a clean structure if missing
        let metadata = this.loadInternal(path);
        let dirty = false;

        if (!metadata) {
            metadata = {
                magic: META_MAGIC,
                version: CURRENT_VERSION,
                data: new Map<string, MetadataEntry>()
            };
            dirty = true;
        }

        const validNames = new Set<string>();

        // synchronize physical files with metadata entries
        for (const file of files) {
            if (file === META_FILE) continue;

            validNames.add(file);
            const fullPath = "/" + fs.combine(path, file);

            // If a file exists on disk but not in metadata, create a default entry
            if (!metadata.data.has(fullPath)) {
                const isDir = fs.isDir(fullPath);
                const defaultMeta = this.generateDefault(fullPath);

                // Convert IFileMetadata to internal MetadataEntry format
                metadata.data.set(fullPath, {
                    name: file,
                    type: isDir ? "d" : "f", // Basic reconciliation assumes file or dir
                    permissions: defaultMeta.permissions,
                    user: defaultMeta.owner,
                    group: defaultMeta.group,
                    created: defaultMeta.created,
                    modified: defaultMeta.modified,
                    flags: defaultMeta.isSystem ? 1 : 0
                });
                dirty = true;
                Logger.info(`[MT] Generated missing metadata for ${fullPath}`);
            }

            // Recursively reconcile subdirectories
            if (fs.isDir(fullPath)) {
                this.reconcile(fullPath);
            }
        }

        // Cleanup orphaned metadata entries (metadata exists, but file does not)
        for (const [key, entry] of metadata.data) {
            if (!validNames.has(entry.name)) {
                metadata.data.delete(key);
                dirty = true;
                Logger.info(`[MT] Removed orphaned metadata for ${key}`);
            }
        }

        if (dirty) {
            // We use a dummy path combined with the directory to satisfy saveFile's logic
            // which expects a path to a file *inside* the target directory.
            this.saveFile(fs.combine(path, "meta_placeholder"), metadata);
        }
    }

    // Helper to load metadata specifically for a directory's contents
    // This bypasses loadFile's logic which looks for the parent of the input path.
    private loadInternal(directoryPath: string): LoadedMetadata | undefined {
        // Create a dummy path inside the directory so loadFile looks in directoryPath
        return this.loadFile(fs.combine(directoryPath, "placeholder"));
    }

    private loadFile(path: string): LoadedMetadata | undefined {
        const targetDir = fs.getDir(path);
        const metadataFile = "/" + fs.combine(targetDir, META_FILE);
        if (!fs.exists(metadataFile)) {
            // Silent return is acceptable here as the caller handles initialization
            return;
        }

        const [file] = fs.open(metadataFile, "r");
        if (!file) return;

        // Validate header;
        const header = file.readLine();
        if (!header) {
            file.close();
            return;
        }

        const [magic, version] = header.split(":");

        if (magic !== META_MAGIC) {
            Logger.error(`[MT] Corrupted metadata for ${path}`);
            file.close();
            return;
        }

        if (tonumber(version) !== CURRENT_VERSION) {
            Logger.error(`[MT] Invalid metadata file version for ${path}`);
            file.close();
            return;
        }

        // Read all entries
        const entries = new Map<string, MetadataEntry>;
        while (true) {
            const nextFile = file.readLine();
            // Check if reached EOF.
            if (nextFile === null) break;
            const [name, type, mask, user, group, created, modified, flags] = nextFile.split(":");

            // Parse permissions
            const sPerm = tonumber(mask.charAt(0));
            const uPerm = tonumber(mask.charAt(1));
            const gPerm = tonumber(mask.charAt(2));
            const wPerm = tonumber(mask.charAt(3));
            const permissions = bit32.bor(
                bit32.lshift(sPerm!, 9),
                bit32.lshift(uPerm!, 6),
                bit32.lshift(gPerm!, 3),
                wPerm!
            );

            if (!["f", "d", "s", "m"].includes(type)) continue;

            // Constructs the full absolute path for the map key
            const full = "/" + fs.combine(targetDir, name);
            entries.set(full, {
                name: name,
                // @ts-ignore
                type: type,
                permissions: permissions,
                user: tonumber(user)!,
                group: tonumber(group)!,
                created: tonumber(created)!,
                modified: tonumber(modified)!,
                flags: tonumber(flags)!,
            })
        }

        file.close();

        return {
            magic,
            version: tonumber(version)!,
            data: entries,
        }
    }

    private load(path: string): IFileMetadata {
        const metadata = this.loadFile(path);
        if (!metadata) {
            // If metadata file is missing, we cannot return valid metadata
            return this.generateDefault(path);
        }
        const entry = metadata.data.get(path);
        if (!entry) {
            return this.generateDefault(path);
        }

        return {
            owner: entry.user,
            group: entry.group,
            permissions: entry.permissions,
            created: entry.created,
            modified: entry.modified,
            isDirectory: entry.type === "d",
            isSystem: entry.flags === 1,
            isReadOnly: fs.isReadOnly(path),
            size: fs.getSize(path),
        }
    }

    private saveFile(path: string, metadata: LoadedMetadata): boolean {
        const targetDir = fs.getDir(path);
        const metadataFile = "/" + fs.combine(targetDir, META_FILE);

        const [file] = fs.open(metadataFile, "w");
        if (!file) {
            Logger.error(`[MT] Failed to open metadata file for writing at ${path}`);
            return false;
        }

        file.writeLine(`${metadata.magic}:${metadata.version}`);
        for (const entry of metadata.data.values()) {
            const sPerm = bit32.band(bit32.rshift(entry.permissions, 9), 7);
            const uPerm = bit32.band(bit32.rshift(entry.permissions, 6), 7);
            const gPerm = bit32.band(bit32.rshift(entry.permissions, 3), 7);
            const wPerm = bit32.band(entry.permissions, 7);

            const mask = `${sPerm}${uPerm}${gPerm}${wPerm}`;

            const line = [
                entry.name,
                entry.type,
                mask,
                entry.user,
                entry.group,
                entry.created,
                entry.modified,
                entry.flags
            ].join(":");

            file.writeLine(line);
        }

        file.close();
        return true;
    }

    public get(path: string): IFileMetadata {
        return this.load(path);
    }

    public set(path: string, meta: IFileMetadata): boolean {
        // Load existing metadata for the directory, or initialize empty structure if missing
        let metadata = this.loadFile(path);
        if (!metadata) {
            metadata = {
                magic: META_MAGIC,
                version: CURRENT_VERSION,
                data: new Map<string, MetadataEntry>()
            };
        }

        const name = fs.getName(path);

        // Map IFileMetadata back to internal MetadataEntry format
        const entry: MetadataEntry = {
            name: name,
            type: meta.isDirectory ? "d" : "f",
            permissions: meta.permissions,
            user: meta.owner,
            group: meta.group,
            created: meta.created,
            modified: meta.modified,
            flags: meta.isSystem ? 1 : 0,
        };

        // Update or Insert
        metadata.data.set(path, entry);

        return this.saveFile(path, metadata);
    }

    public edit(path: string, updates: Partial<IFileMetadata>): boolean {
        const metadata = this.loadFile(path);
        if (!metadata) return false;

        const entry = metadata.data.get(path);
        if (!entry) return false;

        // Map IFileMetadata updates to MetadataEntry structure
        if (updates.owner !== undefined) entry.user = updates.owner;
        if (updates.group !== undefined) entry.group = updates.group;
        if (updates.permissions !== undefined) entry.permissions = updates.permissions;
        if (updates.modified !== undefined) entry.modified = updates.modified;
        // Created typically does not change on edit, but logic allows it if requested
        if (updates.created !== undefined) entry.created = updates.created;
        if (updates.isSystem !== undefined) entry.flags = updates.isSystem ? 1 : 0;

        // MetadataEntry stores absolute path as key, verify integrity
        metadata.data.set(path, entry);

        return this.saveFile(path, metadata);
    }

    public move(oldPath: string, newPath: string): boolean {
        const oldDir = fs.getDir(oldPath);
        const newDir = fs.getDir(newPath);
        const newName = fs.getName(newPath);

        // Load source metadata
        const sourceMeta = this.loadFile(oldPath);
        if (!sourceMeta || !sourceMeta.data.has(oldPath)) return false;

        const entry = sourceMeta.data.get(oldPath)!;

        // Remove from source
        sourceMeta.data.delete(oldPath);
        if (!this.saveFile(oldPath, sourceMeta)) return false;

        // Load destination metadata (might be the same file if moving within same dir)
        // If directories are same, reload to get fresh state after save
        const destMeta = (oldDir === newDir)
            ? this.loadFile(newPath) // Reload modified file
            : this.loadFile(newPath) || { magic: META_MAGIC, version: CURRENT_VERSION, data: new Map() };

        if (!destMeta) return false;

        // Update entry properties for the new location
        entry.name = newName;
        // Updates the map key to the new absolute path
        destMeta.data.set(newPath, entry);

        return this.saveFile(newPath, destMeta);
    }

    public copy(oldPath: string, newPath: string): boolean {
        const newName = fs.getName(newPath);

        // Load source
        const sourceMeta = this.loadFile(oldPath);
        if (!sourceMeta || !sourceMeta.data.has(oldPath)) return false;

        const entry = sourceMeta.data.get(oldPath)!;

        // Load destination
        // Handle case where destination metadata file does not exist yet
        let destMeta = this.loadFile(newPath);
        if (!destMeta) {
            destMeta = { magic: META_MAGIC, version: CURRENT_VERSION, data: new Map() };
        }

        // Clone entry to avoid reference issues
        const newEntry = { ...entry };
        newEntry.name = newName;

        // Reset creation time for a copy
        newEntry.created = os.epoch("utc");
        newEntry.modified = os.epoch("utc");

        destMeta.data.set(newPath, newEntry);

        return this.saveFile(newPath, destMeta);
    }

    public delete(path: string): boolean {
        const metadata = this.loadFile(path);
        if (!metadata || !metadata.data.has(path)) return false;

        metadata.data.delete(path);
        return this.saveFile(path, metadata);
    }

    private generateDefault(path: string): IFileMetadata {
        const isDir = fs.isDir(path);
        const defaultPerms = isDir ? 0o0755 : 0o0644;
        return {
            owner: 0,
            group: 0,
            permissions: defaultPerms,
            created: os.epoch("utc"),
            modified: os.epoch("utc"),
            isDirectory: isDir,
            isSystem: false,
            isReadOnly: false,
            size: fs.getSize(path),
        }
    }
}