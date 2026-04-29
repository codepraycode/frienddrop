export type DownloadStatus = 'IN_PROGRESS' | 'PAUSED' | 'COMPLETE' | 'FAILED';

export interface DownloadManifest {
    id: string;
    contactId: string;
    filePath: string;
    fileName: string;
    totalBytes: number;
    bytesReceived: number;
    checksum: string; // SHA-256 of complete file
    status: DownloadStatus;
    startedAt: number; // Unix timestamp (ms)
    completedAt: number | null;
    localPath: string; // Local storage path on client
}

export interface DownloadRequestInfo {
    id: string;
    requesterId: string; // client's deviceId
    filePath: string;
    fileSize: number;
    status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED';
    createdAt: number;
    decidedAt: number | null;
    expiresAt: number;
}
