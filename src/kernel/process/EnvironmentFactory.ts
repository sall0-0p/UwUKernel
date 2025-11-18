import {Syscall} from "./SyscallExecutor";
import {Process} from "./Process";

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
            },

            term: term,
        }
    }
}