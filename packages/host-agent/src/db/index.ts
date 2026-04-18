import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

export const db = createClient({
    url: `file:${path.join(dbDir, 'frienddrop.db')}`,
});

export async function initDb() {
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
