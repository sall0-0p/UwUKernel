export enum Syscall {
    // Default syscalls
    Print = "print",
    Sleep = "os.sleep",
    PullEvent = "os.pullEvent",
    Epoch = "os.epoch",

    // My os syscalls
    GetPid = "os.getPid",
    GetProcessTime = "os.getProcessTime",
    GetCWD = "os.getWorkingDirectory",
    SetCWD = "os.setWorkingDirectory",
    Exit = "os.exit",
    WaitForChildExit = "os.waitForChildExit",

    SetForegroundProcess = "os.setForegroundProcess",
    SetRawInputMode = "os.setRawInputMode",

    // My fs syscalls
    FsExists = "fs.exists",
    FsOpen = "fs.open",
    FsList = "fs.list",
    FsMakeDir = "fs.mkDir",
    FsDelete = "fs.delete",
    FsMove = "fs.move",
    FsCopy = "fs.copy",

    FsIsDir = "fs.isDir",
    FsGetMetadata = "fs.getMetadata",
    FsSize = "fs.getSize",
    FsGetCapacity = "fs.getCapacity",
    FsGetFreeSpace = "fs.getFreeSpace",


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