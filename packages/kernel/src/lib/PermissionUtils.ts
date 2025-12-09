export interface IPermissionSet {
    read: boolean;
    write: boolean;
    execute: boolean;
}

export interface IParsedPermissions {
    user: IPermissionSet;
    group: IPermissionSet;
    other: IPermissionSet;
    setuid: boolean;
    setgid: boolean;
    sticky: boolean;
}

export namespace PermissionUtils {
    export function parse(mode: number): IParsedPermissions {
        return {
            setuid: (mode & 0o4000) !== 0,
            setgid: (mode & 0o2000) !== 0,
            sticky: (mode & 0o1000) !== 0,

            user: {
                read:    (mode & 0o0400) !== 0,
                write:   (mode & 0o0200) !== 0,
                execute: (mode & 0o0100) !== 0,
            },

            group: {
                read:    (mode & 0o0040) !== 0,
                write:   (mode & 0o0020) !== 0,
                execute: (mode & 0o0010) !== 0,
            },

            other: {
                read:    (mode & 0o0004) !== 0,
                write:   (mode & 0o0002) !== 0,
                execute: (mode & 0o0001) !== 0,
            }
        };
    }

    export function serialize(p: IParsedPermissions): number {
        let mode = 0;

        // Special
        if (p.setuid) mode |= 0o4000;
        if (p.setgid) mode |= 0o2000;
        if (p.sticky) mode |= 0o1000;

        // User
        if (p.user.read)    mode |= 0o0400;
        if (p.user.write)   mode |= 0o0200;
        if (p.user.execute) mode |= 0o0100;

        // Group
        if (p.group.read)    mode |= 0o0040;
        if (p.group.write)   mode |= 0o0020;
        if (p.group.execute) mode |= 0o0010;

        // Other
        if (p.other.read)    mode |= 0o0004;
        if (p.other.write)   mode |= 0o0002;
        if (p.other.execute) mode |= 0o0001;

        return mode;
    }
}