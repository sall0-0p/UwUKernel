import {Syscall} from "./SyscallExecutor";

export namespace EnvironmentFactory {
    export function getEnvironment(): object {
        return {
            print: (...str): number => {
                // @ts-ignore There is tendency of compile to insert first argument as ____, which leads to first argument being eaten up by whatever is called. It means that all methods should be threated as with unexisting first argument ____, that is ts-ignored previously.
                return coroutine.yield("syscall", Syscall.Print, ____, ...str);
            },

            sleep: (time: number): void => {
                // @ts-ignore
                coroutine.yield("syscall", Syscall.Sleep, ____);
            },

            term: term,

            _G: {

            },
        }
    }
}