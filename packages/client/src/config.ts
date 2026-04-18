export const config = {
    DEFAULT_HOST_PORT: 4242,
};

function validateEnv() {
    // Vite injects these via import.meta.env
    const portStr = import.meta.env.VITE_DEFAULT_HOST_PORT;
    if (portStr) {
        const port = Number(portStr);
        if (isNaN(port) || port <= 0 || port > 65535) {
            const msg = `FATAL: VITE_DEFAULT_HOST_PORT must be a valid port number, got ${portStr}`;
            console.error(msg);
            throw new Error(msg);
        }
        config.DEFAULT_HOST_PORT = port;
    }
}

validateEnv();
