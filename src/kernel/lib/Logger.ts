const DEFAULT_LOGS_LOCATION = "/temp/logs";
const MESSAGE_INDENT = 55;
const MAX_LOGS = 5;

const latestPath = fs.combine(DEFAULT_LOGS_LOCATION, "latest.log");

/**
 * Clears old logs from the log folder, keeping only the most recent ones.
 */
function clearLogs(logFolder: string): void {
    if (!fs.exists(logFolder)) return; // CHANGE: Prevent error if log folder doesn't exist

    type LogEntry = {
        path: string;
        modified: number;
    };

    const logs: LogEntry[] = [];

    for (const file of fs.list(logFolder)) {
        const filePath = fs.combine(logFolder, file);

        if (!fs.isDir(filePath) && file !== "latest.log") {
            const attr = fs.attributes(filePath);
            logs.push({ path: filePath, modified: attr.modified });
        }
    }

    logs.sort((a, b) => a.modified - b.modified);
    while (logs.length > MAX_LOGS - 1) {
        const oldest = logs.shift();
        if (oldest) {
            fs.delete(oldest.path);
        }
    }
}

/**
 * Core logging function.
 */
function log(type: string, message: string | null | undefined, ...args: any[]): void {
    const [logFile] = fs.open(latestPath, "a");
    if (!logFile) {
        printError(`[Logger] Failed to open log file: ${latestPath}`);
        return;
    }

    const timestamp = os.date("%T");
    const debugInfo = debug.getinfo(3);
    let prefix = `[${timestamp}] ${debugInfo.short_src}:${debugInfo.currentline} `;
    const content = string.format("[%s] " + (message || "nil"), type, ...args);

    prefix = prefix.padEnd(MESSAGE_INDENT, " ");

    logFile.writeLine(prefix + "| " + content);
    logFile.close();
}

/**
 * Static instance of logger
 */
export class Logger {
    /**
     * Initializes the logger, rotating the 'latest.log' file.
     */
    public static init(): void {
        const [oldLatestLog] = fs.open(latestPath, "r");

        if (oldLatestLog) {
            const timestamp = oldLatestLog.readLine();
            oldLatestLog.close();

            if (timestamp) {
                const destinationPath = fs.combine(fs.getDir(latestPath), `log-${timestamp}.log`);

                if (fs.exists(destinationPath)) {
                    fs.delete(destinationPath);
                }
                fs.move(latestPath, destinationPath);
            }
        }

        const [newLatestLog] = fs.open(latestPath, "w");
        if (!newLatestLog) {
            printError(`[Logger] Failed to create new log file: ${latestPath}`);
            return;
        }

        newLatestLog.writeLine(tostring(os.time(os.date("!*t") as any)));
        newLatestLog.close();
    }

    public static fatal(message: string, ...args: any[]): void {
        log("FATAL", message, ...args);
    }

    public static error(message: string, ...args: any[]): void {
        log("ERROR", message, ...args);
    }

    public static warn(message: string, ...args: any[]): void {
        log("WARN", message, ...args);
    }

    public static trace(message: string, ...args: any[]): void {
        log("TRACE", message, ...args);
    }

    public static debug(message: string, ...args: any[]): void {
        log("DEBUG", message, ...args);
    }

    public static info(message: string, ...args: any[]): void {
        log("INFO", message, ...args);
    }
}

// Run initialization logic at module load time
fs.makeDir(DEFAULT_LOGS_LOCATION);
clearLogs(DEFAULT_LOGS_LOCATION);
Logger.init();