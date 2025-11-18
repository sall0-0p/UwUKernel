import {Scheduler} from "./kernel/process/Scheduler";
import {ProcessManager} from "./kernel/process/ProcessManager";
import {EventManager} from "./kernel/process/EventManager";
import {Logger} from "./kernel/lib/Logger";
import {SyscallExecutor} from "./kernel/process/SyscallExecutor";

Logger.init();
Logger.info("Hallo!");
print("Hallo!");
const scheduler = new Scheduler();
const pm = new ProcessManager(scheduler);
const em = new EventManager(scheduler, pm);
const se = new SyscallExecutor(scheduler, em, pm);
scheduler.eventManager = em;
scheduler.processManager = pm;
scheduler.syscallExecutor = se;

// const code1 = "print('Running 1!') _G.counter = 0; while true do _G.counter = _G.counter + 1 end";
// const process1 = pm.createProcess("/", code1);

// const code2 = "print('Running 2!') while true do term.setCursorPos(1, 2) term.write(_G.counter) end";
// const thread2 = pm.createThread(code2, process1);

// const code3 = "print('Hallo from third thread, shall die here!');"
// const thread3 = pm.createThread(code3, process1);

// const code4 = "local count = print('Testing line return!'); print(count)";
// const process4 = pm.createProcess("/", code4);

// const code5 = "print('Testing sleep! Zzz Zzz Zzz') sleep(1) print('Woke up!')";
// const process5 = pm.createProcess("/", code5);

const code6 = "stdout.writeLine(os.version())"
const process6 = pm.createProcess("/", code6);

const code7 = "os.setForegroundProcess() while true do local command = stdin.readLine(); if command == 'raw' then stdout.writeLine(''); stdout.writeLine('Process: Switching to raw input mode! Your yapping rights are revoked.'); os.setRawInputMode(true); end end";
const process7 = pm.createProcess("/", code7);

scheduler.run();