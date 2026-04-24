import path from 'path';

const validLogLevels = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof validLogLevels)[number];

export const config = {
    PORT: 4242,
    DB_DIR: path.join(process.cwd(), 'data'),
    LOG_LEVEL: 'info' as LogLevel,
};

function validateEnv() {
    if (process.env.HOST_DB_DIR) {
        config.DB_DIR = process.env.HOST_DB_DIR;
    }

    if (process.env.HOST_LOG_LEVEL) {
        if (!validLogLevels.includes(process.env.HOST_LOG_LEVEL as LogLevel)) {
            console.error(
                `FATAL: HOST_LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`,
            );
            process.exit(1);
        }
        config.LOG_LEVEL = process.env.HOST_LOG_LEVEL as LogLevel;
    }
}

validateEnv();
