import express from 'express';
import { initDb } from './db/index.js';
import { getOrInitializeIdentity } from './identity.js';
import { healthCheck } from './routes/health.js';

import { config } from './config.js';

async function bootstrap() {
    // Initialize SQLite database
    await initDb();

    // Ensure device identity is initialized
    const identity = await getOrInitializeIdentity();
    console.log(
        `Identity initialized for device: ${identity.deviceId} (${identity.username})`,
    );

    const app = express();

    // Middleware
    app.use(express.json());

    // Routes
    app.get('/api/health', healthCheck);

    // Default catch-all
    app.use((_req, res) => {
        res.status(404).json({ error: 'Not Found' });
    });

    app.listen(config.PORT, () => {
        console.log(
            `FriendDrop host-agent running on http://localhost:${config.PORT}`,
        );
    });
}

bootstrap().catch((err) => {
    console.error('Failed to bootstrap host-agent', err);
    process.exit(1);
});
