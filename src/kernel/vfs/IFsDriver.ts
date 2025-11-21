import {IFsStateStream} from "./IFsStateStream";
import {IFileMetadata} from "./IFileMetadata";

export enum FsOpenMode {
    Read = "r",
    Write = "w",
    Append = "a",
}

export interface IFsDriver {
    readonly id: string;
    readonly isReadOnly: boolean;
    exists(path: string): boolean;
    open(path: string, mode: FsOpenMode): IFsStateStream | undefined;
    list(path: string): string[];
    mkdir(path: string): void;
    delete(path: string): void;
    move(from: string, to: string): void;
    copy(from: string, to: string): void
    getMetadata(path: string): IFileMetadata;
    getSize(path: string): number;
    getCapacity(): number;
    getFreeSpace(): number;
}