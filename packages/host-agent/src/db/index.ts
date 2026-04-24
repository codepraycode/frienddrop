import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { config } from '../config.js';

export const db = createClient({
    url: pathToFileURL(config.DB_PATH).href,
});

export async function initDb() {
    const dbDir = path.dirname(config.DB_PATH);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
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
        CREATE TABLE IF NOT EXISTS identity (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            deviceId TEXT NOT NULL,
            username TEXT NOT NULL,
            publicKey TEXT NOT NULL,
            privateKey TEXT NOT NULL,
            createdAt INTEGER NOT NULL
        );
    `);
}
