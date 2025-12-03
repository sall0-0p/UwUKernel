import {IFsStateStream} from "./IFsStateStream";
import {IFileMetadata} from "./IFileMetadata";
import {Process} from "../process/Process";

export enum FsOpenMode {
    Read = "r",
    Write = "w",
    Append = "a",
    Execute = "x",
}

export interface IFsDriver {
    readonly id: string;
    readonly isReadOnly: boolean;
    exists(path: string): boolean;
    open(path: string, mode: FsOpenMode, process?: Process): IFsStateStream | undefined;
    list(path: string): string[];
    mkdir(path: string): void;
    delete(path: string): void;
    move(from: string, to: string): void;
    copy(from: string, to: string): void
    getMetadata(path: string): IFileMetadata;
    setMetadata(path: string, metadata: IFileMetadata): void;
    getSize(path: string): number;
    getCapacity(): number;
    getFreeSpace(): number;
}