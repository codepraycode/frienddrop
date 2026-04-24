import { db } from './db/index.js';
import { generateKeypair } from '@frienddrop/shared';
import os from 'os';

/**
 * Initializes or retrieves the local device identity.
 * If no identity exists, generates a new Ed25519 keypair and random device ID.
 */
export async function getOrInitializeIdentity() {
    const existing = await db.execute('SELECT * FROM identity WHERE id = 1');
    
    if (existing.rows.length > 0) {
        return existing.rows[0];
    }

    console.log('No local identity found. Generating new Ed25519 keypair...');

    const { publicKey, privateKey } = generateKeypair();
    const deviceId = crypto.randomUUID();
    const username = os.userInfo().username || 'FriendDrop User';

    await db.execute({
        sql: 'INSERT INTO identity (id, deviceId, username, publicKey, privateKey) VALUES (1, ?, ?, ?, ?)',
        args: [deviceId, username, publicKey, privateKey]
    });

    return {
        id: 1,
        deviceId,
        username,
        publicKey,
        privateKey
    };
}
