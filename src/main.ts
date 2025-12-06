import {Scheduler} from "./kernel/process/Scheduler";
import {ProcessManager} from "./kernel/process/ProcessManager";
import {EventManager} from "./kernel/event/EventManager";
import {Logger} from "./kernel/lib/Logger";
import {SyscallExecutor} from "./kernel/syscall/SyscallExecutor";
import {VFSManager} from "./kernel/vfs/VFSManager";
import {RomFSDriver} from "./kernel/drivers/fs/RomFsDriver";
import {RootFsDriver} from "./kernel/drivers/fs/rootFs/RootFsDriver";

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
// // const code1 = "print('Running 1!') _G.counter = 0; while true do _G.counter = _G.counter + 1 end";
// // const process1 = pm.createProcess("/", code1);
//
// // const code2 = "print('Running 2!') while true do term.setCursorPos(1, 19); term.write(_G.counter); end";
// // const thread2 = pm.createThread(code2, process1);
//
// // const code3 = "print('Hallo from third thread, shall die here!');"
// // const thread3 = pm.createThread(code3, process1);
//
// // const code4 = "local count = print('Testing line return!'); print(count)";
// // const process4 = pm.createProcess("/", code4);
//
// // const code5 = "print('Testing sleep! Zzz Zzz Zzz') sleep(1) print('Woke up!')";
// // const process5 = pm.createProcess("/", code5);
//
// const code6 =
//     "stdout.writeLine('Version: ' .. os.version()); " +
//     "stdout.writeLine('PID: ' .. os.getPid());" +
//     "local processTime = os.getProcessTime();" +
//     "stdout.writeLine('CPU time: ' .. processTime.cpuTime);" +
//     "stdout.writeLine('SYS time: ' .. processTime.sysTime);" +
//     "stdout.writeLine('epoch: ' .. os.epoch('utc'));";
// // const process6 = pm.createProcess("/", code6);
//
// const code7 = "os.setForegroundProcess() while true do local command = stdin.readLine(); if command == 'raw' then stdout.writeLine(''); stdout.writeLine('Process: Switching to raw input mode! Your yapping rights are revoked.'); os.setRawInputMode(true); end end";
// // const process7 = pm.createProcess("/", code7);
//
// const code8 =
//     "print('Starting Pi calculation...'); " +
//     "local iterations = 2000000; " +
//     "local pi = 0; " +
//     "local start = os.epoch('utc'); " +
//     "for i = 0, iterations do " +
//     "    local term = 4 * ((-1)^i) / (2*i + 1); " +
//     "    pi = pi + term; " +
//     "    if i % 250000 == 0 then " +
//     "       print('Syscall at ' .. i .. ' instructions'); " + // This print adds to SYS time
//     "    end " +
//     "end " +
//     "print('Calculation finished.'); " +
//     "print('Pi ~= ' .. pi); " +
//     "local t = os.getProcessTime(); " +
//     "print('------------------'); " +
//     "print('CPU (User): ' .. t.cpuTime .. 'ms'); " +
//     "print('SYS (Kern): ' .. t.sysTime .. 'ms'); " +
//     "print('Total Real: ' .. (os.epoch('utc') - start) / 1000); ";
// // const process8 = pm.createProcess("/", code8);
//
// const code9 =
//     "local file = fs.open('startup.lua', 'r');" +
//     "stdout.write(file.readAll());" +
//     "file.close();" +
//     " " +
//     "local list = fs.list('/');" +
//     "local i = 1;" +
//     "while i <= #list do" +
//     "   stdout.writeLine(list[i]);" +
//     "   i = i + 1;" +
//     "end;" +
//     " " +
//     "stdout.writeLine(fs.exists('startup.lua'));" +
//     " " +
//     "fs.makeDir('/cool/folder/for/you');" +
//     " " +
//     ""
// // const process9 = pm.createProcess("/", code9);
//
// const codeVfsTest =
//     "print('=== VFS TEST SUITE STARTED ==='); " +
//     "fs.list('/'); " +
//
//     // 1. CWD and Path Navigation Tests
//     "print('[Test] CWD Navigation'); " +
//     "local initialCwd = os.getWorkingDirectory(); " +
//     "print('Initial CWD: ' .. initialCwd); " +
//
//     "os.setWorkingDirectory('/rom'); " +
//     "if os.getWorkingDirectory() == '/rom' then print('PASS: Changed to /rom'); else print('FAIL: CWD is ' .. os.getWorkingDirectory()); end; " +
//
//     "os.setWorkingDirectory('/'); " +
//     "print('Restored CWD to /'); " +
//
//     // 2. Directory Creation & Relative Path Logic
//     "print('[Test] Directory & Path Logic'); " +
//     "fs.makeDir('testing_zone'); " +
//     "fs.makeDir('testing_zone/sub_folder'); " +
//
//     "if fs.isDir('testing_zone/sub_folder') then print('PASS: Sub-folder created'); else print('FAIL: Sub-folder missing'); end; " +
//
//     // Change into directory to test relative file creation
//     "os.setWorkingDirectory('/testing_zone/sub_folder'); " +
//     "print('Current CWD: ' .. os.getWorkingDirectory()); " + // Should be /testing_zone/sub_folder
//
//     // 3. File Write (Relative)
//     "print('[Test] File Write (Relative)'); " +
//     "local f = fs.open('test_file.txt', 'w'); " +
//     "f.writeLine('Line 1: This file was created via relative path.'); " +
//     "f.writeLine('Line 2: Inside /testing_zone/sub_folder.'); " +
//     "f.close(); " +
//
//     // Verify file exists using Absolute Path
//     "if fs.exists('/testing_zone/sub_folder/test_file.txt') then print('PASS: File exists (Absolute check)'); else print('FAIL: File not found absolute'); end; " +
//
//     // 4. Parent Directory Resolution (..)
//     "print('[Test] Parent Directory Resolution (..)'); " +
//     // We are in /testing_zone/sub_folder. Writing to ../sibling.txt should create /testing_zone/sibling.txt
//     "f = fs.open('../sibling.txt', 'w'); " +
//     "f.write('Sibling content'); " +
//     "f.close(); " +
//
//     "if fs.exists('/testing_zone/sibling.txt') then print('PASS: Path .. resolution worked'); else print('FAIL: Path .. resolution failed'); end; " +
//
//     // 5. File Read & Content Verification
//     "print('[Test] Read Verification'); " +
//     "os.setWorkingDirectory('/'); " + // Go back to root
//     "f = fs.open('testing_zone/sub_folder/test_file.txt', 'r'); " +
//     "local line1 = f.readLine(); " +
//     "if line1 == 'Line 1: This file was created via relative path.' then print('PASS: Content match'); else print('FAIL: Content mismatch: ' .. line1); end; " +
//     "f.close(); " +
//
//     // 6. Move, Copy, Delete
//     "print('[Test] Manipulation (Move/Copy/Delete)'); " +
//     // Move sibling.txt to moved.txt
//     "fs.move('/testing_zone/sibling.txt', '/testing_zone/moved.txt'); " +
//     "if fs.exists('/testing_zone/moved.txt') and not fs.exists('/testing_zone/sibling.txt') then print('PASS: Move successful'); else print('FAIL: Move failed'); end; " +
//
//     // Copy moved.txt to copied.txt
//     "fs.copy('/testing_zone/moved.txt', '/testing_zone/copied.txt'); " +
//     "if fs.exists('/testing_zone/moved.txt') and fs.exists('/testing_zone/copied.txt') then print('PASS: Copy successful'); else print('FAIL: Copy failed'); end; " +
//
//     // 7. List
//     "print('[Test] Listing /testing_zone'); " +
//     "local list = fs.list('/testing_zone'); " +
//     "for i = 1, #list do " +
//     "    print(' - ' .. list[i]); " +
//     "end; " +
//
//     // 8. Metadata
//     "local metadata = fs.getMetadata('/testing_zone/moved.txt'); " +
//     "print(metadata.owner, metadata.group, metadata.permissions, metadata.modified, metadata.size);" +
//
//     // 9. Setting permissions
//     "fs.setPermissions('/testing_zone/moved.txt', 484); " +
//     "fs.setOwner('/testing_zone/moved.txt', 1000); " +
//     "fs.setGroup('/testing_zone/moved.txt', 1000); " +
//     "local metadataNew = fs.getMetadata('/testing_zone/moved.txt'); " +
//     "print(metadataNew.owner, metadataNew.group, metadataNew.permissions, metadataNew.modified, metadataNew.size); " +
//
//     // Cleanup
//     "print('[Cleanup] Deleting /testing_zone...'); " +
//     "fs.delete('/testing_zone'); " +
//     "if not fs.exists('/testing_zone') then print('PASS: Cleanup successful'); else print('FAIL: Cleanup failed'); end; " +
//
//     "print('=== VFS TEST COMPLETE ==='); ";
// const process10 = pm.createProcess("/", "VFS Test", codeVfsTest);
//
// const parentCode = `
//     local myPid = os.getPid()
//     local targetPid = myPid + 1;
//
//     os.sleep(1);
//     print("Parent ("..myPid.."): Waiting for child PID " .. targetPid)
//
//     -- This call should block until child exits
//     local pid, code = os.waitForChildExit(targetPid)
//
//     print("Parent ("..myPid.."): Resume! Child " .. pid .. " exited with code " .. code)
// `;
// // const parentProcess = pm.createProcess("/", parentCode);
// // print("Parent", parentProcess.pid);
//
// // Waitpid test (I just learned ` means multiline comment, lol)
// const childCode = `
//     local myPid = os.getPid()
//     print("Child ("..myPid.."): Starting work...")
//     os.sleep(2)
//     print("Child ("..myPid.."): Work done. Exiting with code 33.")
//     os.exit(33)
// `;
// // const childProcess = pm.createProcess("/", childCode, parentProcess);
// // print("Child", childProcess.pid);
//
// // const processTest = `
// //     local processList = os.getProcessList();
// //     print(unpack(processList));
// //     local processDetails = os.getProcessDetails(1);
// //     print(processDetails.name);
// // `
// // const processLast = pm.createProcess("/", "Last process", processTest);

pm.createProcess("/", "system", `
    os.createProcess("/hello.lua", "launchd");
`)

scheduler.run();