export enum Syscall {
    // Default syscalls
    Print = "print",
    Sleep = "os.sleep",
    PullEvent = "os.pullEvent",
    Epoch = "os.epoch", //

    // My syscalls
    GetPid = "os.getPid", //
    GetProcessTime = "os.getProcessTime", //

    SetForegroundProcess = "os.setForegroundProcess",
    SetRawInputMode = "os.setRawInputMode",

    // Stdin
    rHandleIsEmpty = "handle.isEmpty",
    rHandleRead = "handle.read",
    rHandleReadLine = "handle.readLine",
    rHandleReadAll = "handle.readAll",

    // Stdout
    wHandleWrite = "handle.write",
    wHandleWriteLine = "handle.writeLine",
    wHandleFlush = "handle.flush",

    // Any
    aHandleClose = "handle.close",
}