import path from 'path';

const validLogLevels = ['debug', 'info', 'warn', 'error'] as const;
export type LogLevel = (typeof validLogLevels)[number];

export const config = {
    PORT: 4242,
    DB_PATH: path.join(process.cwd(), 'data', 'frienddrop.db'),
    LOG_LEVEL: 'info' as LogLevel,
};

function validateEnv() {
    if (process.env.HOST_PORT) {
        const port = Number(process.env.HOST_PORT);
        if (isNaN(port) || port <= 0 || port > 65535) {
            console.error('FATAL: HOST_PORT must be a valid port number.');
            process.exit(1);
        }
        config.PORT = port;
    }

    if (process.env.HOST_DB_PATH) {
        config.DB_PATH = process.env.HOST_DB_PATH;
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
