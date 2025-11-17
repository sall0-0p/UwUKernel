const DEFAULT_LOGS_LOCATION = "/temp/logs";
const MESSAGE_INDENT = 55;
const MAX_LOGS = 5;

const latestPath = fs.combine(DEFAULT_LOGS_LOCATION, "latest.log");

/**
 * Clears old logs from the log folder, keeping only the most recent ones.
 */
function clearLogs(logFolder: string): void {
    type LogEntry = {
        path: string;
        modified: number;
    };

    const logs: LogEntry[] = [];

    for (const file of fs.list(logFolder)) {
        const filePath = fs.combine(logFolder, file);

        if (!fs.isDir(filePath) && file !== "latest.log") {
            const attr = fs.attributes(filePath);
            // Use push instead of table.insert
            logs.push({ path: filePath, modified: attr.modified });
        }
    }

    // Use array.sort instead of table.sort
    logs.sort((a, b) => a.modified - b.modified);

    // Use array.length and array.shift
    while (logs.length > MAX_LOGS - 1) {
        // table.remove(logs, 1) is equivalent to array.shift()
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
        error(`[Logger] Failed to open log file: ${latestPath}`);
        return;
    }

    const timestamp = os.date("%T");

    // debug.getinfo(3) gets info about the caller of (fatal, error, etc.)
    const debugInfo = debug.getinfo(3);

    let prefix = `[${timestamp}] ${debugInfo.short_src}:${debugInfo.currentline} `;

    // Use string.format with rest parameters
    const content = string.format("[%s] " + (message || "nil"), type, ...args);

    // Use padEnd for cleaner padding logic
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

        // Check if the file exists and we can read from it
        if (oldLatestLog) {
            // Note: The original 'readLine(1)' was likely a typo.
            // readLine() reads the timestamp line.
            const timestamp = oldLatestLog.readLine();
            oldLatestLog.close();

            if (timestamp) {
                fs.move(latestPath, fs.combine(fs.getDir(latestPath), `log-${timestamp}.log`));
            }
        }

        const [newLatestLog] = fs.open(latestPath, "w");
        if (!newLatestLog) {
            error(`[Logger] Failed to create new log file: ${latestPath}`);
            return;
        }

        // os.time(os.date("!*t")) is a Lua idiom to get the current UTC timestamp.
        // We use 'as any' to satisfy TS, as TSTL knows how to compile this.
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
clearLogs(DEFAULT_LOGS_LOCATION);
Logger.init();