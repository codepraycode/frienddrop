export type AccessLevel = 'READ' | 'READ_DOWNLOAD';
export type ShareStatus = 'ACTIVE' | 'REVOKED';

export interface Share {
    id: string; // UUID v4
    contactId: string;
    path: string; // Absolute path on host filesystem
    accessLevel: AccessLevel;
    status: ShareStatus;
    createdAt: number; // Unix timestamp (ms)
    revokedAt: number | null;
}
