export interface Contact {
    id: string; // UUID v4
    username: string;
    deviceId: string;
    publicKey: string;
    inviteCode: string;
    addedAt: number; // Unix timestamp (ms)
    lastSeenAt: number | null;
}
