export interface IFileMetadata {
    owner: number,
    permissions: number,
    created: number,
    modified: number,
    isDirectory: boolean,
    size: number,
}