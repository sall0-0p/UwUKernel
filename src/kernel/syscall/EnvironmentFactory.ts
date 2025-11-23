import {Process} from "../process/Process";
import {Syscall} from "./Syscall";
import {IEvent} from "../event/Event";

export namespace EnvironmentFactory {
    function sys(id: Syscall, ...args: any[]): any[] {
        const [success, ...results] = coroutine.yield("syscall", id, ...args);
        if (!success) {
            error(results[0], 2);
        }
        return results;
    }

    export function getEnvironment(process: Process): object {
        return {
            /**
             * Prints to the screen.
             * @param str strings to be printed to the screen.
             */
            print(...str: string[]): number {
                // @ts-ignore There is tendency of compile to insert first argument as ____, which leads to first argument being eaten up by whatever is called. It means that all methods should be threated as with unexisting first argument ____, that is ts-ignored previously.
                const [result] = sys(Syscall.Print, self, ...str);
                return result;
            },

            /**
             * Yields for certain amount of time. After yielding ends, is moved to ready queue.
             * @param time amount in seconds to yield for.
             */
            sleep(time: number): void {
                // @ts-ignore
                sys(Syscall.Sleep, self);
            },

            os: {
                /**
                 * Yields for certain amount of time. After yielding ends, is moved to ready queue.
                 *
                 * Alias of `_G.sleep(time)`;
                 * @param time amount of time in seconds to yield for.
                 */
                sleep(time: number): void {
                    // @ts-ignore
                    sys(Syscall.Sleep, self);
                },

                /**
                 * Returns os version as a string;
                 */
                version(): string {
                    return "UwUntuCC v0.1";
                },

                /**
                 * Waits for an event to arrive.
                 * @param filter - filter for events that arrive. Can be either single string (for CraftOS-PC compatability) or array of strings.
                 * @param timeout - timeout after which thread is resumed if no event was received. Results in nil being returned for event data and type.
                 * @return event - type of event that was supplied.
                 * @return object - event arguments as a key value pair.
                 */
                pullEvent(timeout?: number): IEvent {
                    // @ts-ignore
                    const [data] = sys(Syscall.PullEvent, self || [], timeout || math.huge);
                    return data;
                },

                /**
                 * Returns time in milliseconds depending on mode (defaults `ingame`).
                 *
                 * If called with `ingame`, returns the number of in-game milliseconds since the world was created. This is the default.
                 *
                 * If called with `utc`, returns the number of milliseconds since 1 January 1970 in the UTC timezone.
                 *
                 * If called with `local`, returns the number of milliseconds since 1 January 1970 in the server's local timezone.
                 *
                 * (Identical to default ComputerCraft behaviour).
                 * @param type - locale to get epoch for
                 * @returns number in milliseconds since the epoch depending on selected locale.
                 */
                epoch(type: "ingame" | "utc" | "local"): number {
                    // @ts-ignore
                    const [epoch] = sys(Syscall.Epoch, self);
                    return epoch;
                },

                /**
                 * Returns PID of process the thread belongs.
                 */
                getPid(): number {
                    const [time] = sys(Syscall.GetPid);
                    return time;
                },

                /**
                 * Returns current working directory.
                 */
                getWorkingDirectory(): string {
                    const [cwd] = sys(Syscall.GetCWD);
                    return cwd;
                },

                /**
                 * Sets current working directory.
                 */
                setWorkingDirectory(path: string): void {
                    // @ts-ignore
                    sys(Syscall.SetCWD, self);
                },

                /**
                 * Returns table, with two arguments `cpuTime` and `sysTime`.
                 * Values are global and not per-thread.
                 * @return cpuTime - time used by the process execution.
                 * @return sysTime - time used by syscalls invoked by this process.
                 */
                getProcessTime(): { cpuTime: number, sysTime: number } {
                    const [cpuTime, sysTime] = sys(Syscall.GetProcessTime);
                    return { cpuTime, sysTime };
                },

                /**
                 * Makes you foreground process.
                 * Will be removed later.
                 */
                setForegroundProcess() {
                    sys(Syscall.SetForegroundProcess);
                },

                /**
                 * Determines if stdin should eat your inputs or not (for terminal).
                 * @param enabled - if raw input mode should be enabled (system default is false)
                 */
                setRawInputMode(enabled: boolean) {
                    // @ts-ignore
                    sys(Syscall.SetRawInputMode, ____);
                }
            },

            fs: {
                open(path: string, mode: string) {
                    // @ts-ignore
                    const [handleId] = sys(Syscall.FsOpen, self, path);
                    if (path === "r") {
                        return {
                            read(count?: number): string {
                                // @ts-ignore
                                const [data] = sys(Syscall.rHandleRead, handleId, self || 1);
                                return data;
                            },

                            readLine(): string | null {
                                const [data] = sys(Syscall.rHandleReadLine, handleId);
                                return data;
                            },

                            readAll(): string | null {
                                const [data] = sys(Syscall.rHandleReadAll, handleId);
                                return data;
                            },

                            close(): void {
                                sys(Syscall.aHandleClose, handleId);
                            },
                        }
                    } else if (path === "w" || path === "a") {
                        return {
                            write(text: string): void {
                                // @ts-ignore
                                sys(Syscall.wHandleWrite, handleId, self);
                            },

                            writeLine(text: string): void {
                                // @ts-ignore
                                sys(Syscall.wHandleWriteLine, handleId, self);
                            },

                            flush(): void {
                                sys(Syscall.wHandleFlush, handleId);
                            },

                            close(): void {
                                sys(Syscall.aHandleClose, handleId);
                            },
                        }
                    }
                },

                list(path: string): string[] {
                    // @ts-ignore
                    const [data] = sys(Syscall.FsList, self);
                    return data;
                },

                exists(path: string): boolean {
                    // @ts-ignore
                    const [exists] = sys(Syscall.FsExists, self);
                    return exists;
                },

                makeDir(path: string): void {
                    // @ts-ignore
                    sys(Syscall.FsMakeDir, self);
                },

                isDir(path: string): void {
                    // @ts-ignore
                    sys(Syscall.FsIsDir, self);
                },

                move(from: string, to: string): void {
                    // @ts-ignore
                    sys(Syscall.FsMove, self, from);
                },

                copy(from: string, to: string): void {
                    // @ts-ignore
                    sys(Syscall.FsCopy, self, from);
                },

                delete(path: string): void {
                    // @ts-ignore
                    sys(Syscall.FsDelete, self);
                },

                getSize(path: string): number {
                    // @ts-ignore
                    const [result] = sys(Syscall.FsSize, self);
                    return result;
                },

                getCapacity(path: string): number {
                    // @ts-ignore
                    const [result] = sys(Syscall.FsGetCapacity, self);
                    return result;
                },

                getFreeSpace(path: string): number {
                    // @ts-ignore
                    const [result] = sys(Syscall.FsGetFreeSpace, self);
                    return result;
                },

                getMetadata(path: string): object {
                    // @ts-ignore
                    const [result] = sys(Syscall.FsGetMetadata, self);
                    return result;
                }
            },

            stdin: {
                isEmpty(): boolean {
                    const [bool] = sys(Syscall.rHandleIsEmpty, 0);
                    return bool;
                },

                read(count?: number): string | null  {
                    // @ts-ignore
                    const [data] = sys(Syscall.rHandleRead, 0, self || 1);
                    return data;
                },

                readLine(): string | null {
                    const [data] = sys(Syscall.rHandleReadLine, 0);
                    return data;
                },

                readAll(): string | null {
                    const [data] = sys(Syscall.rHandleReadAll, 0);
                    return data;
                },

                close(): void {
                    sys(Syscall.aHandleClose, 0);
                },
            },

            stdout: {
                write(text: string): void {
                    // @ts-ignore
                    sys(Syscall.wHandleWrite, 1, self);
                },

                writeLine(text: string): void {
                    // @ts-ignore
                    sys(Syscall.wHandleWriteLine, 1, self);
                },

                flush(): void {
                    sys(Syscall.wHandleFlush, 1);
                },

                close(): void {
                    sys(Syscall.aHandleClose, 1);
                },
            },

            stderr: {
                write(text: string): void {
                    // @ts-ignore
                    sys(Syscall.wHandleWrite, 2, self);
                },

                writeLine(text: string): void {
                    // @ts-ignore
                    csys(Syscall.wHandleWriteLine, 2, self);
                },

                flush(): void {
                    sys(Syscall.wHandleFlush, 2);
                },

                close(): void {
                    sys(Syscall.aHandleClose, 2);
                },
            },

            _G: {

            },

            term: term,
            keys: keys,
            math: math,
            table: table,
            unpack: unpack,
        }
    }
}