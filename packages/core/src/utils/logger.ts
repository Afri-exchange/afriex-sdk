export const LogLevel= {
    DEBUG : 'debug',
    INFO : 'info',
    WARN : 'warn',
    ERROR : 'error',
    NONE : 'none',
} as const;
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

const LOG_LEVEL_PRIORITY = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.NONE]: 4,
};

export class Logger {
    constructor(
        private level: LogLevel = LogLevel.ERROR,
        private enabled: boolean = true
    ) { }

    debug(message: string, data?: unknown): void {
        this.log(LogLevel.DEBUG, message, data);
    }

    info(message: string, data?: unknown): void {
        this.log(LogLevel.INFO, message, data);
    }

    warn(message: string, data?: unknown): void {
        this.log(LogLevel.WARN, message, data);
    }

    error(message: string, data?: unknown): void {
        this.log(LogLevel.ERROR, message, data);
    }

    private log(level: LogLevel, message: string, data?: unknown): void {
        if (!this.enabled || !this.shouldLog(level)) {
            return;
        }

        const timestamp = new Date().toISOString();
        const prefix = `[Afriex SDK] [${timestamp}] [${level.toUpperCase()}]`;

        switch (level) {
            case LogLevel.DEBUG:
                console.debug(prefix, message, data || '');
                break;
            case LogLevel.INFO:
                console.info(prefix, message, data || '');
                break;
            case LogLevel.WARN:
                console.warn(prefix, message, data || '');
                break;
            case LogLevel.ERROR:
                console.error(prefix, message, data || '');
                break;
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
    }
}
