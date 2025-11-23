import {Scheduler} from "./kernel/process/Scheduler";
import {ProcessManager} from "./kernel/process/ProcessManager";
import {EventManager} from "./kernel/event/EventManager";
import {Logger} from "./kernel/lib/Logger";
import {SyscallExecutor} from "./kernel/syscall/SyscallExecutor";
import {VFSManager} from "./kernel/vfs/VFSManager";
import {RootFsDriver} from "./kernel/drivers/fs/RootFsDriver";
import {RomFSDriver} from "./kernel/drivers/fs/RomFsDriver";

Logger.init();
Logger.info("Hallo!");
print("Hallo!");

const vfsManager = new VFSManager();
vfsManager.mount("/", new RootFsDriver(""));
vfsManager.mount("/rom", new RomFSDriver("rom"));

const scheduler = new Scheduler();
const pm = new ProcessManager(scheduler);
const em = new EventManager(scheduler, pm);
const se = new SyscallExecutor(scheduler, em, pm, vfsManager);
scheduler.eventManager = em;
scheduler.processManager = pm;
scheduler.syscallExecutor = se;
//
// const code1 = "print('Running 1!') _G.counter = 0; while true do _G.counter = _G.counter + 1 end";
// const process1 = pm.createProcess("/", code1);
// //
// const code2 = "print('Running 2!') while true do term.setCursorPos(1, 19); term.write(_G.counter); end";
// const thread2 = pm.createThread(code2, process1);

// const code3 = "print('Hallo from third thread, shall die here!');"
// const thread3 = pm.createThread(code3, process1);

// const code4 = "local count = print('Testing line return!'); print(count)";
// const process4 = pm.createProcess("/", code4);

// const code5 = "print('Testing sleep! Zzz Zzz Zzz') sleep(1) print('Woke up!')";
// const process5 = pm.createProcess("/", code5);
//
const code6 =
    "stdout.writeLine('Version: ' .. os.version()); " +
    "stdout.writeLine('PID: ' .. os.getPid());" +
    "local processTime = os.getProcessTime();" +
    "stdout.writeLine('CPU time: ' .. processTime.cpuTime);" +
    "stdout.writeLine('SYS time: ' .. processTime.sysTime);" +
    "stdout.writeLine('epoch: ' .. os.epoch('utc'));";
// const process6 = pm.createProcess("/", code6);

const code7 = "os.setForegroundProcess() while true do local command = stdin.readLine(); if command == 'raw' then stdout.writeLine(''); stdout.writeLine('Process: Switching to raw input mode! Your yapping rights are revoked.'); os.setRawInputMode(true); end end";
// const process7 = pm.createProcess("/", code7);

const code8 =
    "print('Starting Pi calculation...'); " +
    "local iterations = 2000000; " +
    "local pi = 0; " +
    "local start = os.epoch('utc'); " +
    "for i = 0, iterations do " +
    "    local term = 4 * ((-1)^i) / (2*i + 1); " +
    "    pi = pi + term; " +
    "    if i % 250000 == 0 then " +
    "       print('Syscall at ' .. i .. ' instructions'); " + // This print adds to SYS time
    "    end " +
    "end " +
    "print('Calculation finished.'); " +
    "print('Pi ~= ' .. pi); " +
    "local t = os.getProcessTime(); " +
    "print('------------------'); " +
    "print('CPU (User): ' .. t.cpuTime .. 'ms'); " +
    "print('SYS (Kern): ' .. t.sysTime .. 'ms'); " +
    "print('Total Real: ' .. (os.epoch('utc') - start) / 1000); ";

// const process8 = pm.createProcess("/", code8);

const code9 =
    "local file = fs.open('startup.lua', 'r');" +
    "stdout.write(file.readAll());" +
    "file.close();" +
    " " +
    "local list = fs.list('/');" +
    "local i = 1;" +
    "while i <= #list do" +
    "   stdout.writeLine(list[i]);" +
    "   i = i + 1;" +
    "end;" +
    " " +
    "stdout.writeLine(fs.exists('startup.lua'));" +
    " " +
    "fs.mkdir('/cool/folder/for/you');" +
    " " +
    ""
const process9 = pm.createProcess("/", code9);

scheduler.run();