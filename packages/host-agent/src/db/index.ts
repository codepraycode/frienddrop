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
            accessLevel TEXT NOT NULL CHECK (accessLevel IN ('READ', 'READ_DOWNLOAD')),
            status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
            createdAt INTEGER NOT NULL,
            revokedAt INTEGER
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

    const permissionSchema = await db.execute('PRAGMA table_info(permissions)');
    const permissionColumns = permissionSchema.rows as Array<{ name?: unknown }>;
    const hasAccessLevelColumn = permissionColumns.some(
        (column) => column.name === 'accessLevel',
    );
    const hasLegacyBooleanColumns = permissionColumns.some(
        (column) => column.name === 'allowRead' || column.name === 'allowWrite',
    );

    // Migrate legacy boolean permissions schema to AccessLevel-based schema.
    if (!hasAccessLevelColumn || hasLegacyBooleanColumns) {
        await db.executeMultiple(`
            BEGIN;
            CREATE TABLE permissions_next (
                id TEXT PRIMARY KEY,
                folderPath TEXT NOT NULL,
                accessLevel TEXT NOT NULL CHECK (accessLevel IN ('READ', 'READ_DOWNLOAD')),
                status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
                createdAt INTEGER NOT NULL,
                revokedAt INTEGER
            );
            INSERT INTO permissions_next (id, folderPath, accessLevel, status, createdAt, revokedAt)
            SELECT
                id,
                folderPath,
                CASE
                    WHEN allowWrite = 1 THEN 'READ_DOWNLOAD'
                    ELSE 'READ'
                END,
                CASE
                    WHEN allowRead = 1 OR allowWrite = 1 THEN 'ACTIVE'
                    ELSE 'REVOKED'
                END,
                CAST(strftime('%s', 'now') AS INTEGER) * 1000,
                CASE
                    WHEN allowRead = 1 OR allowWrite = 1 THEN NULL
                    ELSE CAST(strftime('%s', 'now') AS INTEGER) * 1000
                END
            FROM permissions;
            DROP TABLE permissions;
            ALTER TABLE permissions_next RENAME TO permissions;
            COMMIT;
        `);
    }
}
