import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { config } from '../config.js';

export const db = createClient({
    url: pathToFileURL(path.join(config.DB_DIR, 'frienddrop.db')).href,
});

export async function initDb() {
    if (!fs.existsSync(config.DB_DIR)) {
        fs.mkdirSync(config.DB_DIR, { recursive: true });
    }

    await db.executeMultiple(`
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            publicKey TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS permissions (
            id TEXT PRIMARY KEY,
            folderPath TEXT NOT NULL,
            allowRead INTEGER DEFAULT 1,
            allowWrite INTEGER DEFAULT 0
        );
    `);
}
