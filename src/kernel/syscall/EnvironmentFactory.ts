import {Syscall} from "./SyscallExecutor";
import {Process} from "../process/Process";

export namespace EnvironmentFactory {
    export function getEnvironment(process: Process): object {
        return {
            /**
             * Prints to the screen.
             * @param str strings to be printed to the screen.
             */
            print: (...str): number => {
                // @ts-ignore There is tendency of compile to insert first argument as ____, which leads to first argument being eaten up by whatever is called. It means that all methods should be threated as with unexisting first argument ____, that is ts-ignored previously.
                const [result] = coroutine.yield("syscall", Syscall.Print, ____, ...str);
                return result;
            },

            /**
             * Yields for certain amount of time. After yielding ends, is moved to ready queue.
             * @param time amount in seconds to yield for.
             */
            sleep: (time: number): void => {
                // @ts-ignore
                coroutine.yield("syscall", Syscall.Sleep, ____);
            },

            os: {
                /**
                 * Yields for certain amount of time. After yielding ends, is moved to ready queue.
                 *
                 * Alias of `_G.sleep(time)`;
                 * @param time amount of time in seconds to yield for.
                 */
                sleep: (time: number): void => {
                    // @ts-ignore
                    coroutine.yield("syscall", Syscall.Sleep, ____);
                },

                /**
                 * Returns os version as a string;
                 */
                version: (): string => {
                    return "First version for you!";
                },

                /**
                 * Waits for an event to arrive.
                 * @param filter - filter for events that arrive. Can be either single string (for CraftOS-PC compatability) or array of strings.
                 * @param timeout - timeout after which thread is resumed if no event was received. Results in nil being returned for event data and type.
                 * @return event - type of event that was supplied.
                 * @return object - event arguments as a key value pair.
                 */
                pullEvent: (timeout?: number): object => {
                    // @ts-ignore
                    const [data] = coroutine.yield("syscall", Syscall.PullEvent, ____ || [], timeout || math.huge);
                    return data;
                },

                /**
                 * Makes you foreground process.
                 * Will be removed later.
                 */
                setForegroundProcess: () => {
                    coroutine.yield("syscall", Syscall.SetForegroundProcess);
                },

                /**
                 * Determines if stdin should eat your inputs or not (for terminal).
                 * @param enabled - if raw input mode should be enabled (system default is false)
                 */
                setRawInputMode: (enabled: boolean) => {
                    // @ts-ignore
                    coroutine.yield("syscall", Syscall.SetRawInputMode, ____);
                }
            },

            stdin: {
                isEmpty(): boolean {
                    const [bool] = coroutine.yield("syscall", Syscall.rHandleIsEmpty, 0);
                    return bool;
                },

                read(count?: number): string | number[] | null  {
                    // @ts-ignore
                    const [data] = coroutine.yield("syscall", Syscall.rHandleRead, 0, self || 1);
                    return data;
                },

                readLine(): string | null {
                    const [data] = coroutine.yield("syscall", Syscall.rHandleReadLine, 0);
                    return data;
                },

                readAll(): string | number[] | null {
                    const [data] = coroutine.yield("syscall", Syscall.rHandleReadAll, 0);
                    return data;
                },

                close(): void {
                    coroutine.yield("syscall", Syscall.aHandleClose, 0);
                },
            },

            stdout: {
                write(text: string): void {
                    // @ts-ignore
                    coroutine.yield("syscall", Syscall.wHandleWrite, 1, self);
                },

                writeLine(text: string): void {
                    // @ts-ignore
                    coroutine.yield("syscall", Syscall.wHandleWriteLine, 1, self);
                },

                flush(): void {
                    coroutine.yield("syscall", Syscall.wHandleFlush, 1);
                },

                close(): void {
                    coroutine.yield("syscall", Syscall.aHandleClose, 1);
                },
            },

            stderr: {
                write(text: string): void {
                    // @ts-ignore
                    coroutine.yield("syscall", Syscall.wHandleWrite, 2, self);
                },

                writeLine(text: string): void {
                    // @ts-ignore
                    coroutine.yield("syscall", Syscall.wHandleWriteLine, 2, self);
                },

                flush(): void {
                    coroutine.yield("syscall", Syscall.wHandleFlush, 2);
                },

                close(): void {
                    coroutine.yield("syscall", Syscall.aHandleClose, 2);
                },
            },

            _G: {

            },

            term: term,
        }
    }
}