import {HandleId, Process, ProcessDetails} from "../process/Process";
import {Syscall} from "./Syscall";
import {IEvent} from "../event/Event";

const DEFAULT_PACKAGE_PATH = "/?.lua;/?/init.lua;/System/Library/?/init.lua";
export namespace EnvironmentFactory {
    function sys(id: Syscall, ...args: any[]): any[] {
        const [success, ...results] = coroutine.yield("syscall", id, ...args);
        if (success === false) {
            error(results[0], 2);
        }
        return results;
    }

    function normalizePath(path: string) {
        const parts: string[] = [];
        for (const [part] of string.gmatch(path, "([^/]+)")) {
            parts.push(part);
        }

        const stack: string[] = [];
        for (const part of parts) {
            if (part === "" || part === ".") continue;
            if (part === "..") {
                if (stack.length > 0) stack.pop();
            } else {
                stack.push(part);
            }
        }

        return "/" + stack.join("/");
    }

    function getCycleTrace(loadingMap: Record<string, string>, currentModule: string, targetModule: string): string {
        let trace = `\n1. ${targetModule}`;
        let current = currentModule;
        let step = 2;

        while (current && current !== "ROOT") {
            trace += `\n${step}. ${current} (imports previous)`;
            if (current === targetModule) break;

            current = loadingMap[current];
            step++;
        }

        return trace;
    }

    function require(moduleName: string, process: Process) {
        let searchPaths: string[] = [];

        const pkg = process.environment.package;

        let callerPath = "ROOT";
        const callerInfo = debug.getinfo(2, "S");
        if (callerInfo && callerInfo.source && callerInfo.source.startsWith("@")) {
            callerPath = normalizePath(callerInfo.source.substring(1));
        }

        if (moduleName.startsWith("/")) {
            const normalized = normalizePath(moduleName);
            searchPaths.push(normalized);
            searchPaths.push(normalized + ".lua");
        } else if (moduleName.startsWith(".")) {
            const info = debug.getinfo(2, "S");
            const source = info?.source;
            if (!source) error("Failed to determine source file!", 2);

            let currentDir = "/";
            if (source.startsWith("@")) {
                const filePath = source.substring(1);
                const [match] = string.match(filePath, "^(.+)/");
                if (match) {
                    currentDir = match;
                }
            }

            const normalized = normalizePath(currentDir + "/" + moduleName);
            searchPaths.push(normalized);
            searchPaths.push(normalized + ".lua");
        } else {
            const [modulePath] = string.gsub(moduleName, "%.", "/");

            const templates: string[] = [];
            for (const [template] of string.gmatch(pkg.path, "([^;]+)")) {
                templates.push(template);
            }

            for (const template of templates) {
                const path = template.replace("?", modulePath);

                const normalized = normalizePath(path);
                searchPaths.push(normalized);
                searchPaths.push(normalized + ".lua");
            }
        }

        for (const path of searchPaths) {
            if (pkg.loaded[path] !== undefined) {
                return pkg.loaded[path];
            }

            if (pkg.loading[path]) {
                const trace = getCycleTrace(pkg.loading, callerPath, path);
                error(`Circular dependency detected: '${callerPath}' tried to require '${path}' which is already loading. Require trace:${trace}`, 2);
            }

            const [exists] = sys(Syscall.FsExists, path);
            if (exists) {
                const [isDir] = sys(Syscall.FsIsDir, path);

                if (!isDir) {
                    pkg.loading[path] = callerPath;

                    const [handleId] = sys(Syscall.FsOpen, path, "r");
                    const [content] = sys(Syscall.rHandleReadAll, handleId);
                    sys(Syscall.aHandleClose, handleId);

                    if (typeof content !== "string") {
                        error(`Failed to read module: ${path}`, 2);
                    }

                    const [chunk, err] = loadstring(content, "@" + path);
                    if (!chunk) {
                        error(`Error loading module ${moduleName}: ${err}`, 2);
                    }
                    setfenv(chunk, process.environment);

                    const result = chunk();
                    if (result !== undefined) {
                        pkg.loaded[path] = result;
                    }

                    const finalResult = result !== undefined ? result : true;
                    pkg.loaded[path] = finalResult;

                    pkg.loading[path] = undefined;
                    return finalResult;
                }
            }
        }

        error(`Module '${moduleName}' not found`, 2);
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

                getUid(): number {
                    const [uid] = sys(Syscall.GetUid);
                    return uid;
                },

                getGid(): number {
                    const [gid] = sys(Syscall.GetGid);
                    return gid;
                },

                getGroups(): number[] {
                    const [groups] = sys(Syscall.GetGroups);
                    return groups;
                },

                setUid(uid: number) {
                    // @ts-ignore
                    sys(Syscall.SetUid, self);
                },

                setGid(gid: number[]) {
                    // @ts-ignore
                    sys(Syscall.SetGid, self);
                },

                setGroups(groups: number[]) {
                    // @ts-ignore
                    sys(Syscall.SetGroups, self);
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
                },

                /**
                 * Exits current process, with code (optional, defaults to 0) and exitReason.
                 * @param code - code to exit with, generally 0 means good, 1 means error.
                 * @param exitReason - reason the code exits, for example error message.
                 */
                exit(code?: number, exitReason?: string): void {
                    // @ts-ignore
                    sys(Syscall.Exit, self, code);
                },

                /**
                 * Waits for the process with designated PID to finish.
                 * @param pid - child to wait for, pass -1 to wait for any.
                 * @returns number, number, string - first number corresponds to pid of the child that was waited for, second for its return code and third for reason.
                 */
                waitForChildExit(pid: number): LuaMultiReturn<[number, number, string]> {
                    // @ts-ignore
                    const [returnedPid, code, reason] = sys(Syscall.WaitForChildExit, self);
                    return $multi(returnedPid, code, reason);
                },

                getProcessList(): number[] {
                    const [processList] = sys(Syscall.GetProcessList);
                    return processList;
                },

                getProcessDetails(pid: number): ProcessDetails {
                    // @ts-ignore
                    const [processDetails] = sys(Syscall.GetProcessDetails, self);
                    return processDetails
                },

                createProcess(path: string, name: string, args?: any[], env?: Map<string, any>, cwd?: string, stdio?: Map<number, number>): number {
                    // @ts-ignore
                    const [pid] = sys(Syscall.CreateProcess, self, path, name, args, env, cwd);
                    return pid;
                },

                createThread(func: () => any, args?: any[]): number {
                    // @ts-ignore
                    const [tid] = sys(Syscall.CreateThread, self, func);
                    return tid;
                },

                joinThread(tid: number) {
                    // @ts-ignore
                    sys(Syscall.JoinThread, self);
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
                    const [result] = sys(Syscall.FsIsDir, self);
                    return result;
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
                },

                setPermissions(path: string, permissions: number) {
                    // @ts-ignore
                    sys(Syscall.FsChmod, self, path);
                },

                setOwner(path: string, uid: number) {
                    // @ts-ignore
                    sys(Syscall.FsChown, self, path, -1);
                },

                setGroup(path: string, gid: number) {
                    // @ts-ignore
                    sys(Syscall.FsChown, self, -1, path);
                },
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
            string: string,
            pcall: pcall,
            tostring: tostring,

            package: {
                path: DEFAULT_PACKAGE_PATH,
                loaded: {},
                loading: {},
            },

            require(path: string): any {
                // @ts-ignore
                return require(self, process);
            }
        }
    }
}