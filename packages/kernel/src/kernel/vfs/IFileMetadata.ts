export interface IFileMetadata {
    type: "f" | "d" | "s" | "m",
    owner: number,
    group: number,
    permissions: number,
    created: number,
    modified: number,
    isDirectory: boolean,
    isSystem: boolean, // Forced readonly, not overwritable by root (unless asked to).
    isReadOnly: boolean, // Forced readonly, not overwritable by root (really this time).
    size: number,
}