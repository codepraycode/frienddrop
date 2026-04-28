import { db } from './db/index.js';
import { generateKeypair } from '@frienddrop/shared';
import os from 'os';

export interface PublicIdentity {
    id: number;
    deviceId: string;
    username: string;
    publicKey: string;
    createdAt: number;
}

type StoredIdentityRow = PublicIdentity & {
    privateKey: string;
};

async function getStoredIdentity(): Promise<StoredIdentityRow | undefined> {
    const existing = await db.execute(
        'SELECT id, deviceId, username, publicKey, privateKey, createdAt FROM identity WHERE id = 1',
    );

    if (existing.rows.length === 0) {
        return undefined;
    }

    return existing.rows[0] as StoredIdentityRow;
}

/**
 * Initializes or retrieves the local device identity.
 * If no identity exists, generates a new Ed25519 keypair and random device ID.
 */
export async function getOrInitializeIdentity(): Promise<PublicIdentity> {
    const existing = await getStoredIdentity();

    if (existing) {
        return {
            id: existing.id,
            deviceId: existing.deviceId,
            username: existing.username,
            publicKey: existing.publicKey,
            createdAt: existing.createdAt,
        };
    }

    console.log('No local identity found. Generating new Ed25519 keypair...');

    const { publicKey, privateKey } = generateKeypair();
    const deviceId = crypto.randomUUID();
    const username = os.userInfo().username || 'FriendDrop User';
    const timeCreated = Date.now();

    await db.execute({
        sql: 'INSERT INTO identity (id, deviceId, username, publicKey, privateKey, createdAt) VALUES (1, ?, ?, ?, ?, ?)',
        args: [deviceId, username, publicKey, privateKey, timeCreated],
    });

    return {
        id: 1,
        deviceId,
        username,
        publicKey,
        createdAt: timeCreated,
    };
}

/**
 * Retrieves the stored private key for signing operations.
 */
export async function getIdentityPrivateKey(): Promise<string> {
    const existing = await getStoredIdentity();

    if (!existing) {
        throw new Error('Local identity has not been initialized.');
    }

    return existing.privateKey;
}
