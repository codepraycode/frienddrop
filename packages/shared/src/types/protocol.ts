import type { FileNode } from './file-node.js';

/**
 * Stub definitions for Phase 1B (Relay Server WebSocket types).
 * Not used in Phase 1A LAN-only HTTP calls.
 */
export type WebSocketMessage =
    | {
          type: 'REGISTER';
          deviceId: string;
          username: string;
          publicKey: string;
      }
    | { type: 'REGISTERED'; sessionId: string }
    | {
          type: 'GET_FILE_TREE';
          targetDeviceId: string;
          path: string;
          requesterDeviceId: string;
      }
    | { type: 'FILE_TREE_REQUEST'; requesterDeviceId: string; path: string }
    | {
          type: 'FILE_TREE_RESPONSE';
          requesterDeviceId: string;
          path: string;
          tree: FileNode[];
      }
    | {
          type: 'DOWNLOAD_REQUEST';
          targetDeviceId: string;
          filePath: string;
          requesterDeviceId: string;
      }
    | {
          type: 'DOWNLOAD_READY';
          transferToken: string;
          mode: 'direct' | 'relay';
          endpoint: string;
      }
    | { type: 'DOWNLOAD_PENDING'; requestId: string }
    | {
          type: 'APPROVAL_NEEDED';
          requestId: string;
          requesterUsername: string;
          filePath: string;
          fileSize: number;
      }
    | {
          type: 'APPROVAL_DECISION';
          requestId: string;
          decision: 'APPROVED' | 'DENIED';
      }
    | {
          type: 'APPROVAL_RESULT';
          requestId: string;
          decision: 'APPROVED' | 'DENIED';
          transferToken?: string;
      };
