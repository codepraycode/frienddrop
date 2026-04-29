export const config = {
    DEFAULT_HOST_PORT: 4242,
};

function validateEnv() {
    // Vite injects these via import.meta.env
    const portStr: string = import.meta.env.VITE_DEFAULT_HOST_PORT || "4242";
    if (portStr) {
        const port = Number(portStr.trim());
        if (
            isNaN(port) ||
            !Number.isInteger(port) ||
            port <= 0 ||
            port > 65535
        ) {
            const msg = `FATAL: VITE_DEFAULT_HOST_PORT must be a valid port number, got ${portStr}`;
            console.error(msg);
            throw new Error(msg);
        }
        config.DEFAULT_HOST_PORT = port;
    }
}

validateEnv();
