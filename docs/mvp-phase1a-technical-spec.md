# FriendDrop — Technical Specification

## Phase 1A: LAN-only MVP

> **Version**: 1.0  
> **Author**: codepraycode  
> **Status**: Pre-implementation  
> **Last Updated**: April 2026  
> **Depends on**: PRD v1.2, Linear Issues (Milestones 1–7)

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Module Responsibilities](#3-module-responsibilities)
4. [Database Schema](#4-database-schema)
5. [API Contract](#5-api-contract)
6. [Identity & Cryptography](#6-identity--cryptography)
7. [LAN Detection Logic](#7-lan-detection-logic)
8. [File Tree Walking](#8-file-tree-walking)
9. [Download Engine](#9-download-engine)
10. [Permission Enforcement](#10-permission-enforcement)
11. [Client-Side Caching](#11-client-side-caching)
12. [Environment & Configuration](#12-environment--configuration)
13. [Security Constraints](#13-security-constraints)
14. [Edge Cases & Error Handling](#14-edge-cases--error-handling)
15. [Local Dev Setup Runbook](#15-local-dev-setup-runbook)

---

## 1. Tech Stack

### Rationale summary

Every choice below is the simplest option that handles Phase 1A correctly. No
premature abstraction for Phase 1B (relay). When Phase 1B starts, additions will
be additive — they will not require rewriting Phase 1A code.

### Backend — Host Agent

| Concern       | Choice                                             | Rationale                                                                         |
| ------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| Runtime       | Node.js 20 LTS                                     | Stable, good `fs` streaming APIs, widely understood                               |
| Language      | TypeScript 5                                       | Shared types with client via `@frienddrop/shared`                                 |
| HTTP server   | Express 4                                          | Simple, mature, well-documented middleware model                                  |
| Database      | SQLite via `better-sqlite3`                        | Local-only storage, zero setup, synchronous API (correct for single-process Node) |
| Crypto        | `@noble/ed25519`                                   | Pure JS, works in Node + browser, audited, no native bindings                     |
| Checksum      | Node.js built-in `crypto` (`createHash('sha256')`) | No external dependency needed                                                     |
| File watching | Node.js built-in `fs.watch`                        | Sufficient for v1; chokidar in v2 if needed                                       |

### Frontend — Client App

| Concern           | Choice                          | Rationale                                                       |
| ----------------- | ------------------------------- | --------------------------------------------------------------- |
| Bundler           | Vite 5                          | Fast dev server, instant HMR, excellent TypeScript support      |
| UI framework      | React 18                        | Familiar, large ecosystem                                       |
| Language          | TypeScript 5                    | Same as host-agent; shared types from `@frienddrop/shared`      |
| Styling           | Tailwind CSS v3                 | Utility-first, no runtime overhead                              |
| State management  | Zustand                         | Minimal boilerplate; download manager state lives here          |
| Server state      | TanStack Query (React Query v5) | Handles loading/error/stale states for file tree fetching       |
| Local persistence | IndexedDB via `idb` wrapper     | Persists file tree cache and download manifests across sessions |
| Virtualisation    | TanStack Virtual                | Renders large folder listings (500+ items) without DOM bloat    |
| QR code           | `qrcode` (npm)                  | Generates invite code QR in the browser                         |
| QR scanning       | `html5-qrcode`                  | Camera-based QR scanning in the browser                         |

### Shared Package

| Concern  | Choice                                                                              |
| -------- | ----------------------------------------------------------------------------------- |
| Contents | TypeScript types, protocol message types, permission enums, crypto utility wrappers |
| Build    | `tsc` only — no bundler needed; consumed directly via PNPM workspace linking        |

### Monorepo

| Concern             | Choice            | Rationale                                                              |
| ------------------- | ----------------- | ---------------------------------------------------------------------- |
| Workspace manager   | PNPM workspaces   | Built-in workspace protocol, disk-efficient, no extra tooling required |
| Build orchestration | Turborepo         | Parallel builds, incremental caching — add in Milestone 1              |
| Code quality        | ESLint + Prettier | Shared config at root, extended in each package                        |

---

## 2. Monorepo Structure

```
frienddrop/
├── package.json                  # Root: workspace scripts, shared dev deps
├── pnpm-workspace.yaml           # Declares packages/*
├── turbo.json                    # Turborepo pipeline config
├── .eslintrc.js                  # Shared ESLint config (root)
├── .prettierrc                   # Shared Prettier config
├── tsconfig.base.json            # Base TS config extended by each package
│
├── packages/
│   │
│   ├── shared/                   # @frienddrop/shared
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── types/
│   │       │   ├── identity.ts
│   │       │   ├── contact.ts
│   │       │   ├── share.ts
│   │       │   ├── file-node.ts
│   │       │   ├── download.ts
│   │       │   └── protocol.ts   # WebSocket message types (Phase 1B)
│   │       ├── crypto/
│   │       │   ├── keypair.ts    # generateKeypair(), sign(), verify()
│   │       │   └── invite.ts     # encodeInviteCode(), decodeInviteCode()
│   │       ├── permissions.ts    # AccessLevel enum, permission helpers
│   │       └── index.ts          # Re-exports everything
│   │
│   ├── host-agent/               # Node.js Express server
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts          # Entry point — starts Express, initialises DB
│   │       ├── config.ts         # Loads env vars, validates them
│   │       ├── db/
│   │       │   ├── client.ts     # better-sqlite3 database connection singleton
│   │       │   ├── migrations/
│   │       │   │   └── 001_initial.sql
│   │       │   └── repositories/
│   │       │       ├── identity.repo.ts
│   │       │       ├── contact.repo.ts
│   │       │       ├── share.repo.ts
│   │       │       └── download-request.repo.ts
│   │       ├── middleware/
│   │       │   ├── auth.middleware.ts     # Signature verification
│   │       │   └── permission.middleware.ts
│   │       ├── routes/
│   │       │   ├── files.route.ts         # GET /files
│   │       │   ├── download.route.ts      # GET /download
│   │       │   └── health.route.ts        # GET /health
│   │       └── services/
│   │           ├── file-tree.service.ts   # Walks directory, respects depth cap
│   │           ├── permission.service.ts  # Resolves access level for a contact+path
│   │           └── checksum.service.ts    # Computes SHA-256 of a file
│   │
│   └── client/                   # Vite + React SPA
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── pages/
│           │   ├── ProfilePage.tsx
│           │   ├── ContactsPage.tsx
│           │   └── BrowsePage.tsx        # File tree browser for a contact
│           ├── components/
│           │   ├── ContactList.tsx
│           │   ├── FileTree.tsx          # Virtualised file tree
│           │   ├── FileItem.tsx
│           │   ├── DownloadProgress.tsx
│           │   ├── AddContactModal.tsx
│           │   └── PermissionBadge.tsx
│           ├── store/
│           │   ├── identity.store.ts     # Zustand: local identity state
│           │   └── download.store.ts     # Zustand: active downloads state
│           ├── services/
│           │   ├── host-api.ts           # Typed fetch wrappers for host-agent endpoints
│           │   ├── download.manager.ts   # Handles Range requests, resume, checksum
│           │   └── lan-detect.ts         # LAN detection logic
│           ├── db/
│           │   └── cache.db.ts           # idb wrapper: file tree cache + manifests
│           └── hooks/
│               ├── useFileTree.ts        # TanStack Query hook
│               └── useDownload.ts        # Download control hook
│
└── README.md
```

---

## 3. Module Responsibilities

### `@frienddrop/shared`

- Exports all TypeScript types used across both packages
- Contains all cryptographic primitives (keypair generation, signing,
  verification, invite encoding)
- Contains the `AccessLevel` enum and permission utility functions
- **Must not import from** `host-agent` or `client` — it is a leaf package

### `host-agent`

- Runs as a persistent background process on the host's machine
- Owns the SQLite database (identity, contacts, shares)
- Serves the file tree and file bytes over HTTP
- Enforces identity verification and permission checks on every request
- **Does not** contain any UI

### `client`

- Single-page React application, works in Chrome and Safari (desktop and mobile)
- Manages its own local state: downloaded identity, contacts list, file tree
  cache, download manifests
- **Does not** have a backend — it communicates exclusively with the host-agent
  over HTTP
- In Phase 1A, the host-agent URL is entered manually or detected via LAN

---

## 4. Database Schema

The database lives on the **host-agent** machine only. The client uses IndexedDB
(see Section 11).

```sql
-- Migration: 001_initial.sql
-- Run automatically on host-agent startup if tables do not exist

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Identity: exactly one row ever exists
CREATE TABLE IF NOT EXISTS identity (
  id          TEXT PRIMARY KEY DEFAULT 'local',
  username    TEXT NOT NULL,
  device_id   TEXT NOT NULL UNIQUE,
  public_key  TEXT NOT NULL,
  private_key TEXT NOT NULL,  -- Ed25519 private key, base64, never leaves this DB
  created_at  INTEGER NOT NULL  -- Unix timestamp (ms)
);

-- Contacts: paired devices that have mutually accepted each other
CREATE TABLE IF NOT EXISTS contacts (
  id           TEXT PRIMARY KEY,  -- UUID v4
  username     TEXT NOT NULL,
  device_id    TEXT NOT NULL UNIQUE,
  public_key   TEXT NOT NULL,
  invite_code  TEXT NOT NULL,
  added_at     INTEGER NOT NULL,
  last_seen_at INTEGER
);

-- Shares: per-contact per-folder permission records
-- A contact with no share record for a path sees nothing (default deny)
CREATE TABLE IF NOT EXISTS shares (
  id           TEXT PRIMARY KEY,  -- UUID v4
  contact_id   TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  path         TEXT NOT NULL,     -- Absolute path on host filesystem
  access_level TEXT NOT NULL CHECK(access_level IN ('READ', 'READ_DOWNLOAD')),
  status       TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'REVOKED')),
  created_at   INTEGER NOT NULL,
  revoked_at   INTEGER,
  UNIQUE(contact_id, path)        -- One rule per contact+path pair
);

-- Download requests: READ-only contacts requesting download approval
-- Ephemeral — cleared after decision or TTL expiry
CREATE TABLE IF NOT EXISTS download_requests (
  id           TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  file_path    TEXT NOT NULL,
  file_size    INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING'
                CHECK(status IN ('PENDING', 'APPROVED', 'DENIED', 'EXPIRED')),
  created_at   INTEGER NOT NULL,
  decided_at   INTEGER,
  expires_at   INTEGER NOT NULL  -- created_at + 48 hours
);

-- Indexes for frequent queries
CREATE INDEX IF NOT EXISTS idx_shares_contact ON shares(contact_id);
CREATE INDEX IF NOT EXISTS idx_shares_contact_path ON shares(contact_id, path, status);
CREATE INDEX IF NOT EXISTS idx_download_requests_requester ON download_requests(requester_id, status);
```

**Key design decisions:**

- `ON DELETE CASCADE` on `contact_id` in both `shares` and `download_requests` —
  deleting a contact automatically removes all their permission records and
  pending requests. No orphaned rows possible.
- `UNIQUE(contact_id, path)` on `shares` — prevents duplicate rules for the same
  contact+path. `INSERT OR REPLACE` handles updates.
- `PRAGMA foreign_keys = ON` — SQLite does not enforce foreign keys by default.
  Must be set on every connection.
- `PRAGMA journal_mode = WAL` — allows concurrent reads while a write is in
  progress. Better performance for a server handling multiple simultaneous
  requests.

---

## 5. API Contract

All endpoints are served by the **host-agent** Express server.  
All protected endpoints require two headers:

| Header        | Value                                                               |
| ------------- | ------------------------------------------------------------------- |
| `X-Device-Id` | The requester's `deviceId` (UUID)                                   |
| `X-Signature` | Ed25519 signature of the canonical request string (see Section 6.3) |

### `GET /health`

No authentication required.

**Response `200 OK`:**

```json
{
    "status": "ok",
    "deviceId": "550e8400-e29b-41d4-a716-446655440000",
    "username": "olumide"
}
```

---

### `GET /files`

Returns the file tree for a given path. The requester must have at least `READ`
access to the path.

**Query parameters:**

| Parameter | Type     | Required | Description                                                  |
| --------- | -------- | -------- | ------------------------------------------------------------ |
| `path`    | `string` | Yes      | Absolute path on host to list. Must be within a shared root. |
| `depth`   | `number` | No       | Max recursion depth (default: 3, max: 15)                    |

**Response `200 OK`:**

```json
{
    "path": "/Movies/2024",
    "tree": [
        {
            "name": "Dune Part Two",
            "type": "directory",
            "size": null,
            "mimeType": null,
            "children": [
                {
                    "name": "dune2.mkv",
                    "type": "file",
                    "size": 8589934592,
                    "mimeType": "video/x-matroska",
                    "children": null
                }
            ]
        }
    ],
    "cachedAt": 1714000000000
}
```

**Error responses:**

| Status | Code                | Meaning                                                 |
| ------ | ------------------- | ------------------------------------------------------- |
| `400`  | `INVALID_PATH`      | Path is missing, malformed, or fails traversal check    |
| `401`  | `INVALID_SIGNATURE` | Signature verification failed                           |
| `403`  | `NO_ACCESS`         | Contact exists but has no READ permission for this path |
| `404`  | `CONTACT_NOT_FOUND` | Requester's `deviceId` is not in the contacts list      |
| `404`  | `PATH_NOT_FOUND`    | Path does not exist on the host filesystem              |

---

### `GET /download`

Streams a file to the client. The requester must have `READ_DOWNLOAD` access to
the file's parent folder.  
Supports HTTP Range requests for resumable downloads.

**Query parameters:**

| Parameter  | Type     | Required | Description                                                      |
| ---------- | -------- | -------- | ---------------------------------------------------------------- |
| `path`     | `string` | Yes      | Absolute path to the file on host. Must be within a shared root. |
| `checksum` | `string` | No       | If `true`, response includes `X-Checksum-SHA256` header          |

**Request headers (optional for resume):**

| Header  | Example          | Description             |
| ------- | ---------------- | ----------------------- |
| `Range` | `bytes=1048576-` | Resume from byte offset |

**Response `200 OK`** (full file):

| Header              | Value                                           |
| ------------------- | ----------------------------------------------- |
| `Content-Type`      | MIME type of the file (e.g. `video/x-matroska`) |
| `Content-Length`    | Total file size in bytes                        |
| `Accept-Ranges`     | `bytes`                                         |
| `X-Checksum-SHA256` | SHA-256 hex digest of the complete file         |

**Response `206 Partial Content`** (resumed download):

| Header              | Value                                                         |
| ------------------- | ------------------------------------------------------------- |
| `Content-Range`     | `bytes 1048576-8589934591/8589934592`                         |
| `Content-Length`    | Number of bytes being sent in this response                   |
| `X-Checksum-SHA256` | SHA-256 hex digest of the **complete** file (not the partial) |

**Error responses:**

| Status | Code                    | Meaning                                              |
| ------ | ----------------------- | ---------------------------------------------------- |
| `400`  | `INVALID_PATH`          | Path fails traversal check or is not a file          |
| `400`  | `NOT_A_FILE`            | Path points to a directory                           |
| `401`  | `INVALID_SIGNATURE`     | Signature verification failed                        |
| `403`  | `READ_ONLY`             | Contact has READ but not READ_DOWNLOAD for this path |
| `403`  | `NO_ACCESS`             | Contact has no permission for this path              |
| `404`  | `CONTACT_NOT_FOUND`     | Requester not in contacts list                       |
| `404`  | `FILE_NOT_FOUND`        | File does not exist on the filesystem                |
| `416`  | `RANGE_NOT_SATISFIABLE` | Range header requests bytes beyond the file's size   |

---

### Error response shape (all endpoints)

```json
{
    "error": {
        "code": "NO_ACCESS",
        "message": "You do not have permission to access this path."
    }
}
```

---

## 6. Identity & Cryptography

### 6.1 Keypair generation

Algorithm: **Ed25519** via `@noble/ed25519`.

```typescript
// packages/shared/src/crypto/keypair.ts

import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha512';

// noble/ed25519 v2 requires this in Node.js
ed.etc.sha512Sync = (...m) => sha512(...m);

export async function generateKeypair(): Promise<{
    publicKey: string;
    privateKey: string;
}> {
    const privateKeyBytes = ed.utils.randomPrivateKey();
    const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);
    return {
        privateKey: Buffer.from(privateKeyBytes).toString('base64'),
        publicKey: Buffer.from(publicKeyBytes).toString('base64'),
    };
}
```

Called once on first launch. Both keys stored in the `identity` table. The
private key is **never** included in any HTTP request, log output, or response
body.

### 6.2 Invite code encoding

An invite code encodes:

- The host's `publicKey` (base64)
- The host's `deviceId` (UUID)
- The host's `username`

Encoding: base64url of a JSON payload, then truncated to a human-readable length
with a checksum suffix. QR code is generated from the full base64url string; the
short alphanumeric code is for manual entry.

```typescript
// packages/shared/src/crypto/invite.ts

export function encodeInviteCode(identity: {
    publicKey: string;
    deviceId: string;
    username: string;
}): string {
    const payload = JSON.stringify(identity);
    return Buffer.from(payload).toString('base64url');
}

export function decodeInviteCode(code: string): {
    publicKey: string;
    deviceId: string;
    username: string;
} {
    const payload = Buffer.from(code, 'base64url').toString('utf8');
    return JSON.parse(payload);
}
```

### 6.3 Request signing

Every HTTP request to the host-agent is signed by the client. The signature
covers a canonical string:

```
{METHOD}\n{PATH}\n{QUERY_STRING}\n{TIMESTAMP_MS}
```

Example canonical string for `GET /files?path=/Movies&depth=3` at timestamp
`1714000000000`:

```
GET
/files
path=%2FMovies&depth=3
1714000000000
```

The `X-Timestamp` header must be included alongside `X-Signature`. The
host-agent rejects requests where `|now - timestamp| > 60000` (60 seconds) to
prevent replay attacks.

```typescript
// packages/shared/src/crypto/keypair.ts

export async function signRequest(params: {
    method: string;
    path: string;
    query: string;
    timestamp: number;
    privateKey: string;
}): Promise<string> {
    const canonical = [
        params.method,
        params.path,
        params.query,
        params.timestamp,
    ].join('\n');
    const message = new TextEncoder().encode(canonical);
    const privateKeyBytes = Buffer.from(params.privateKey, 'base64');
    const signatureBytes = await ed.signAsync(message, privateKeyBytes);
    return Buffer.from(signatureBytes).toString('base64');
}

export async function verifyRequest(params: {
    method: string;
    path: string;
    query: string;
    timestamp: number;
    signature: string;
    publicKey: string;
}): Promise<boolean> {
    const canonical = [
        params.method,
        params.path,
        params.query,
        params.timestamp,
    ].join('\n');
    const message = new TextEncoder().encode(canonical);
    const signatureBytes = Buffer.from(params.signature, 'base64');
    const publicKeyBytes = Buffer.from(params.publicKey, 'base64');
    return ed.verifyAsync(signatureBytes, message, publicKeyBytes);
}
```

### 6.4 Auth middleware (host-agent)

```typescript
// packages/host-agent/src/middleware/auth.middleware.ts

export async function authMiddleware(req, res, next) {
    const deviceId = req.headers['x-device-id'];
    const signature = req.headers['x-signature'];
    const timestamp = Number(req.headers['x-timestamp']);

    if (!deviceId || !signature || !timestamp) {
        return res.status(401).json({ error: { code: 'MISSING_AUTH' } });
    }

    // Reject stale requests (replay attack prevention)
    if (Math.abs(Date.now() - timestamp) > 60_000) {
        return res.status(401).json({ error: { code: 'STALE_REQUEST' } });
    }

    // Look up contact by deviceId
    const contact = contactRepo.findByDeviceId(deviceId);
    if (!contact) {
        return res.status(404).json({ error: { code: 'CONTACT_NOT_FOUND' } });
    }

    // Verify signature against pinned public key
    const valid = await verifyRequest({
        method: req.method,
        path: req.path,
        query: req.query, // Already parsed by Express
        timestamp,
        signature,
        publicKey: contact.publicKey,
    });

    if (!valid) {
        return res.status(401).json({ error: { code: 'INVALID_SIGNATURE' } });
    }

    req.contact = contact; // Attach for downstream use
    next();
}
```

---

## 7. LAN Detection Logic

Phase 1A operates exclusively on LAN. The client must know the host-agent's
local IP address to connect.

### 7.1 How the host advertises its IP

On startup, the host-agent:

1. Calls `os.networkInterfaces()` to get its local IP addresses
2. Picks the first non-loopback IPv4 address (e.g. `192.168.1.42`)
3. Stores it in the identity record and includes it in the invite code

### 7.2 How the client detects LAN

When the client attempts to connect to a contact:

1. Extract the host's local IP from the stored contact record
2. Make a short `GET /health` request to
   `http://{hostLocalIp}:{hostPort}/health` with a 3-second timeout
3. If the response is `200 OK` and `deviceId` matches → host is reachable on LAN
   → use direct HTTP
4. If the request times out or fails → host is not reachable on LAN (Phase 1B:
   fall back to relay)

```typescript
// packages/client/src/services/lan-detect.ts

export async function isHostOnLAN(
    hostLocalIp: string,
    port: number,
    expectedDeviceId: string,
): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(`http://${hostLocalIp}:${port}/health`, {
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) return false;
        const body = await res.json();
        return body.deviceId === expectedDeviceId;
    } catch {
        return false;
    }
}
```

**Why check `deviceId` in the health response**: Prevents connecting to a
different device that happens to occupy the same LAN IP (e.g. after a DHCP lease
change).

### 7.3 Phase 1A: No relay

In Phase 1A, if LAN detection fails, the client shows:

> "Olumide is not reachable on your current network. Ask them to check their
> connection or that FriendDrop is running."

No fallback in Phase 1A — that is Phase 1B's job.

---

## 8. File Tree Walking

### 8.1 `file-tree.service.ts`

```typescript
// packages/host-agent/src/services/file-tree.service.ts

import fs from 'fs';
import path from 'path';
import { FileNode } from '@frienddrop/shared';
import mime from 'mime-types';

const MAX_DEPTH = 15;
const MAX_ITEMS_PER_DIR = 500;

export function walkDirectory(rootPath: string, currentDepth = 0): FileNode[] {
    if (currentDepth >= MAX_DEPTH) return [];

    let entries: fs.Dirent[];
    try {
        entries = fs.readdirSync(rootPath, { withFileTypes: true });
    } catch {
        return []; // Permission error or directory removed while listing
    }

    const capped = entries.slice(0, MAX_ITEMS_PER_DIR);

    return capped.map((entry): FileNode => {
        const fullPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            return {
                name: entry.name,
                type: 'directory',
                size: null,
                mimeType: null,
                children: walkDirectory(fullPath, currentDepth + 1),
            };
        } else {
            const stat = fs.statSync(fullPath);
            return {
                name: entry.name,
                type: 'file',
                size: stat.size,
                mimeType: mime.lookup(entry.name) || null,
                children: null,
            };
        }
    });
}
```

### 8.2 Path safety check

Every path received from a client request is validated before any filesystem
operation:

```typescript
// packages/host-agent/src/middleware/permission.middleware.ts

export function isSafePath(
    requestedPath: string,
    allowedRoot: string,
): boolean {
    const resolved = path.resolve(requestedPath);
    return resolved.startsWith(path.resolve(allowedRoot));
}
```

**This check must happen before any `fs` call.** If `isSafePath` returns
`false`, respond `400 INVALID_PATH` immediately.

---

## 9. Download Engine

### 9.1 Host-agent: serving files with Range support

```typescript
// packages/host-agent/src/routes/download.route.ts

router.get(
    '/download',
    authMiddleware,
    permissionMiddleware,
    async (req, res) => {
        const filePath = req.query.path as string;
        const stat = fs.statSync(filePath);
        const totalBytes = stat.size;

        // Compute and attach checksum
        const checksum = await computeChecksum(filePath);
        res.setHeader('X-Checksum-SHA256', checksum);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader(
            'Content-Type',
            mime.lookup(filePath) || 'application/octet-stream',
        );

        const rangeHeader = req.headers['range'];
        if (rangeHeader) {
            const [startStr, endStr] = rangeHeader
                .replace('bytes=', '')
                .split('-');
            const start = parseInt(startStr, 10);
            const end = endStr ? parseInt(endStr, 10) : totalBytes - 1;

            if (start >= totalBytes || end >= totalBytes) {
                return res
                    .status(416)
                    .setHeader('Content-Range', `bytes */${totalBytes}`)
                    .end();
            }

            res.status(206);
            res.setHeader(
                'Content-Range',
                `bytes ${start}-${end}/${totalBytes}`,
            );
            res.setHeader('Content-Length', end - start + 1);
            fs.createReadStream(filePath, { start, end }).pipe(res);
        } else {
            res.setHeader('Content-Length', totalBytes);
            fs.createReadStream(filePath).pipe(res);
        }
    },
);
```

### 9.2 Client: DownloadManager

State shape in Zustand:

```typescript
// packages/client/src/store/download.store.ts

interface DownloadState {
    id: string;
    contactId: string;
    filePath: string;
    fileName: string;
    totalBytes: number;
    bytesReceived: number;
    checksum: string;
    status: 'IN_PROGRESS' | 'PAUSED' | 'COMPLETE' | 'FAILED';
    startedAt: number;
    completedAt: number | null;
    localPath: string;
}

interface DownloadStore {
    downloads: Record<string, DownloadState>;
    start: (contactId: string, filePath: string) => void;
    pause: (id: string) => void;
    resume: (id: string) => void;
    cancel: (id: string) => void;
}
```

Resume logic:

```typescript
// packages/client/src/services/download.manager.ts

async function resume(manifest: DownloadState, hostUrl: string) {
    const headers = buildAuthHeaders(); // Signs the request
    headers['Range'] = `bytes=${manifest.bytesReceived}-`;

    const response = await fetch(
        `${hostUrl}/download?path=${encodeURIComponent(manifest.filePath)}`,
        {
            headers,
        },
    );

    if (response.status !== 206 && response.status !== 200) {
        throw new Error(`Unexpected status: ${response.status}`);
    }

    const reader = response.body!.getReader();
    let received = manifest.bytesReceived;

    // Write chunks to the local file (using File System Access API or fallback)
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        await appendToFile(manifest.localPath, value);
        received += value.byteLength;
        updateProgress(manifest.id, received); // Zustand store update
    }

    // Verify checksum
    const expectedChecksum = response.headers.get('X-Checksum-SHA256');
    const actualChecksum = await computeFileChecksum(manifest.localPath);
    if (expectedChecksum !== actualChecksum) {
        throw new Error('Checksum mismatch — file may be corrupted');
    }

    markComplete(manifest.id);
}
```

### 9.3 Download manifest persistence

Manifests are persisted to IndexedDB so downloads survive page refreshes:

```typescript
// packages/client/src/db/cache.db.ts

const db = await openDB('frienddrop', 1, {
    upgrade(db) {
        db.createObjectStore('file-tree-cache', { keyPath: 'id' });
        db.createObjectStore('download-manifests', { keyPath: 'id' });
    },
});

export async function saveManifest(manifest: DownloadState) {
    await db.put('download-manifests', manifest);
}

export async function loadManifests(): Promise<DownloadState[]> {
    return db.getAll('download-manifests');
}
```

---

## 10. Permission Enforcement

### 10.1 Permission check flow (host-agent)

Permission is checked in `permissionMiddleware`, which runs **after**
`authMiddleware` (so `req.contact` is already populated):

```typescript
// packages/host-agent/src/middleware/permission.middleware.ts

export function permissionMiddleware(requiredLevel: AccessLevel) {
    return (req, res, next) => {
        const requestedPath = req.query.path as string;
        const contact = req.contact;

        // Safety check first — always
        const sharedRoots = shareRepo.findActiveRootsForContact(contact.id);
        const matchingRoot = sharedRoots.find((root) =>
            isSafePath(requestedPath, root.path),
        );

        if (!matchingRoot) {
            return res.status(400).json({ error: { code: 'INVALID_PATH' } });
        }

        // Permission check
        const share = shareRepo.findByContactAndPath(
            contact.id,
            matchingRoot.path,
        );

        if (!share || share.status === 'REVOKED') {
            return res.status(403).json({ error: { code: 'NO_ACCESS' } });
        }

        if (requiredLevel === 'READ_DOWNLOAD' && share.accessLevel === 'READ') {
            return res.status(403).json({ error: { code: 'READ_ONLY' } });
        }

        next();
    };
}
```

### 10.2 Permission resolution rules

| Scenario                                            | Result                            |
| --------------------------------------------------- | --------------------------------- |
| Contact not in contacts table                       | `404 CONTACT_NOT_FOUND`           |
| Contact exists, no share record for path            | `403 NO_ACCESS`                   |
| Contact exists, share record is `REVOKED`           | `403 NO_ACCESS`                   |
| Contact has `READ`, requesting `/files`             | `200 OK`                          |
| Contact has `READ`, requesting `/download`          | `403 READ_ONLY`                   |
| Contact has `READ_DOWNLOAD`, requesting `/download` | `200 OK` or `206 Partial Content` |
| Path fails `isSafePath` check                       | `400 INVALID_PATH`                |

**Important:** Permission is checked on every request. There is no session or
cached permission state. Revoking a share takes effect on the very next HTTP
request — no grace period.

---

## 11. Client-Side Caching

### 11.1 File tree cache (IndexedDB)

Cache key: `{contactId}:{path}`

```typescript
interface CachedFileTree {
    id: string; // "{contactId}:{path}"
    contactId: string;
    path: string;
    tree: FileNode[];
    cachedAt: number; // Unix timestamp (ms)
}
```

**Cache update strategy:**

- On successful `GET /files` response → write to IndexedDB, overwriting any
  existing entry for the same key
- On host unreachable → read from IndexedDB; show `cachedAt` timestamp as "Last
  seen: X"
- On contact deleted → delete all cache entries where `contactId` matches

### 11.2 TanStack Query integration

```typescript
// packages/client/src/hooks/useFileTree.ts

export function useFileTree(contactId: string, path: string) {
    return useQuery({
        queryKey: ['file-tree', contactId, path],
        queryFn: async () => {
            try {
                const tree = await hostApi.getFileTree(contactId, path);
                await cacheDb.saveTree({
                    contactId,
                    path,
                    tree,
                    cachedAt: Date.now(),
                });
                return tree;
            } catch (err) {
                // Host unreachable — fall back to cache
                const cached = await cacheDb.getTree(contactId, path);
                if (cached) return cached; // TanStack Query will mark this as stale
                throw err; // No cache available either — show error state
            }
        },
        staleTime: 30_000, // Re-fetch after 30 seconds
        retry: 1,
    });
}
```

---

## 12. Environment & Configuration

### Host-agent environment variables

| Variable         | Default                | Description                                      |
| ---------------- | ---------------------- | ------------------------------------------------ |
| `HOST_PORT`      | `4242`                 | Port the Express server listens on               |
| `HOST_DB_PATH`   | `./data/frienddrop.db` | Path to the SQLite database file                 |
| `HOST_LOG_LEVEL` | `info`                 | Logging level (`debug`, `info`, `warn`, `error`) |

All variables are read and validated at startup in `config.ts`. If a required
variable is missing or invalid, the process exits with a descriptive error
message.

### Client environment variables (Vite)

| Variable                 | Default | Description                                    |
| ------------------------ | ------- | ---------------------------------------------- |
| `VITE_DEFAULT_HOST_PORT` | `4242`  | Default port shown in the "Connect to host" UI |

---

## 13. Security Constraints

These are hard rules. None of them may be relaxed without a PRD change and
explicit discussion.

1. **Private key isolation**: The private key stored in SQLite is never logged,
   never included in any HTTP response, never sent to any external service.
   Accessing `identity.privateKey` in code should be considered a high-risk
   operation and reviewed carefully.

2. **Path traversal prevention**: Every path received from any client request
   passes through `isSafePath()` before any filesystem operation. This check
   must be the first operation in any route or service that touches the
   filesystem with user-supplied paths.

3. **Permission at request time**: Permissions are never cached or stored in
   memory between requests. The `shares` table is queried on every protected
   request. This ensures revocation is immediate.

4. **Timestamp validation**: All authenticated requests include an `X-Timestamp`
   header. Requests where `|now - timestamp| > 60 seconds` are rejected with
   `401 STALE_REQUEST` to prevent replay attacks.

5. **Signature covers method + path + query + timestamp**: The signature
   canonical string includes the timestamp, which means captured signatures
   cannot be replayed even if the attacker knows the private key's output for a
   given message.

6. **No anonymous access**: Every endpoint (except `/health`) requires a valid
   `X-Device-Id` that corresponds to a known contact. There are no public or
   unauthenticated endpoints that serve file content.

7. **CORS restriction**: The host-agent should restrict CORS to only the client
   app's origin. In Phase 1A (local development), this is
   `http://localhost:5173`. In a deployed setup, it is the specific IP and port
   of the client.

---

## 14. Edge Cases & Error Handling

| Scenario                                                   | Handling                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Host offline when client tries to browse                   | Show cached file tree with "Last seen: X" label; disable download button                                              |
| File deleted on host between tree fetch and download       | `404 FILE_NOT_FOUND` on `/download` → client shows "File no longer available"                                         |
| Download interrupted mid-transfer                          | Manifest saved to IndexedDB with `bytesReceived`; next open offers "Resume download"                                  |
| Checksum mismatch after download                           | Mark manifest `FAILED`; show "Download may be corrupted — retry"                                                      |
| Range request beyond file size                             | Host returns `416 Range Not Satisfiable`; client resets `bytesReceived` to 0 and retries as full download             |
| Large directory (>500 items)                               | Host caps response at 500 items; includes `"truncated": true` in response body; client shows "Showing 500 of N items" |
| Tree depth limit reached                                   | Host stops recursion at depth 15; leaf directories are included as empty `children: []` with a note                   |
| Contact deleted while download active                      | Client notified on next request with `404 CONTACT_NOT_FOUND`; download cancelled                                      |
| Same contact added twice                                   | `UNIQUE(device_id)` constraint on `contacts` table rejects duplicate insert                                           |
| Permission changed from READ_DOWNLOAD to READ mid-download | Next Range request returns `403 READ_ONLY`; download paused with user notification                                    |
| Host DB locked (rare with WAL mode)                        | Express middleware catches `SQLITE_BUSY`; responds `503 Service Unavailable`                                          |

---

## 15. Local Dev Setup Runbook

### Prerequisites

| Tool    | Version | Check            |
| ------- | ------- | ---------------- |
| Node.js | 20 LTS  | `node --version` |
| PNPM    | 9+      | `pnpm --version` |
| Git     | Any     | `git --version`  |

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/codepraycode/frienddrop.git
cd frienddrop

# 2. Install all dependencies across all packages
pnpm install

# 3. Build the shared package first (both client and host-agent depend on it)
pnpm --filter @frienddrop/shared build

# 4. Copy the example env files
cp packages/host-agent/.env.example packages/host-agent/.env

# Edit the .env file if you want non-default values
# HOST_PORT=4242 is the default and works fine for development

# 5. Start both client and host-agent in parallel (from the root)
pnpm dev
# This runs: pnpm dev:client and pnpm dev:host concurrently

# Or run each separately:
pnpm dev:host    # Starts Express on http://localhost:4242
pnpm dev:client  # Starts Vite on http://localhost:5173
```

### Verifying the setup

```bash
# Check the host-agent is running
curl http://localhost:4242/health
# Expected: {"status":"ok","deviceId":"...","username":"..."}

# Open the client
# Navigate to http://localhost:5173 in Chrome or Safari
```

### Running on two devices (LAN test)

1. Find your machine's local IP: `ipconfig` (Windows) or `ifconfig | grep inet`
   (Mac/Linux)
2. On the second device (phone, another laptop), open
   `http://{your-local-ip}:5173` in the browser
3. The host-agent is already binding to `0.0.0.0` so it accepts connections from
   any device on the same WiFi

### Running linting and type checks

```bash
pnpm lint      # ESLint across all packages
pnpm typecheck # tsc --noEmit across all packages
pnpm test      # Run all unit tests (Vitest)
```

---

_This document is a living technical spec. Update version and date on every
meaningful revision._  
**Version**: 1.0 — April 2026
