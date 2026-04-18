# FriendDrop — Product Requirements Document

> **Version**: 1.2 — Final Polished Draft (LAN-first focus)  
> **Author:** codepraycode  
> **Status:** Ready for Implementation  
> **Last Updated:** April 2026

## Table of Contents

1. [Overview](#1-overview)
2. [Problem Statement](#2-problem-statement)
3. [Personas](#3-personas)
4. [Goals & Non-Goals](#4-goals--non-goals)
5. [v1 Feature Scope](#5-v1-feature-scope)
6. [v2 Roadmap](#6-v2-roadmap)
7. [Architecture](#7-architecture)
8. [Data Model](#8-data-model)
9. [API & Protocol Design](#9-api--protocol-design)
10. [Security & Privacy Plan](#10-security--privacy-plan)
11. [Technical Decisions Log](#11-technical-decisions-log)
12. [Metrics & Success Criteria](#12-metrics--success-criteria)
13. [Risks & Mitigations](#13-risks--mitigations)
14. [Decisions Made & Open Questions](#14-decisions-made--open-questions)

---

## 1. Overview

**FriendDrop** is a peer-to-peer file sharing application that lets trusted
friends browse and download files directly from each other’s devices — without
cloud storage, without manual one-off transfers, and without needing to be on
the same WiFi initially (though LAN is fastest).

**The mental model**: When you download a movie from the internet, the file
lives on someone’s computer. Clicking “Download” simply pulls it from their
machine. FriendDrop makes that possible between friends, with the owner keeping
full control over visibility and permissions.

**Key differentiator**: Scoped, permissioned access to a friend’s file system,
like a private web server running on their laptop or phone.

---

## 2. Problem Statement

Sharing large files (movies, music, documents) between friends today involves
one of the following:

- **USB drives** — physical, manual, requires proximity
- **WhatsApp/Telegram** — size-limited, compresses media, requires uploading
  first
- **Google Drive / iCloud** — requires the sender to upload to a third-party
  cloud; slow on low bandwidth
- **Xender / SHAREit** — fast but requires both people to be on the same WiFi
  and manually initiate a session every time

None of these let you **browse** a friend's files on demand and pull what you
want, on your own time, without involving a third-party server holding your
data.

**Core insight:** Files should travel directly from the owner's device to the
requester's device. The owner should control exactly what is visible and
downloadable, with no intermediary storing the content.

---

## 3. Personas

### Olumide — The Host (File Owner)

- Has a large collection of movies, music, and documents on his laptop
- Wants to share specific folders with specific friends
- Does not want to manually initiate transfers every time
- Wants full control: who can see what, who can download what, and the ability
  to revoke access anytime

### Precious — The Client (File Browser)

- Knows Olumide has movies he wants
- Wants to browse what's available, pick what he wants, and download it
- May be on a different network (data, home WiFi) when downloading
- Expects downloads to resume if connection drops

### The Friend Group

- A small, trusted network (5–20 people)
- Not technical — setup should be simple (add contact by code, done)
- Primarily use phones, but also laptops

---

## 4. Goals & Non-Goals

### Goals — v1 (Phased)

**Phase 1A — LAN-only (Core MVP)**

- Direct laptop-to-laptop and laptop-to-phone (browser) file sharing on the same
  local network
- Contacts system with invite-code-based mutual pairing
- Per-folder permission model: READ (browse) vs READ+DOWNLOAD
- Revocable permissions
- Resumable downloads (HTTP Range Requests)
- Offline browsing using cached file tree
- Simple download permission request flow

**Phase 1B — Internet Mode (Relay)**

- Add relay server for cross-network transfers
- Auto-select LAN (direct) when possible, fall back to relay
- All other v1 features work seamlessly over relay

### Goals (v2)

- Phone-to-phone (native app, background hosting)
- End-to-end encryption for file transfers
- LAN auto-discovery (mDNS)
- File preview (images, video thumbnails)
- Simultaneous multi-file downloads
- Download queue management
- Transfer speed display and progress history

### Non-Goals (explicit)

- Cloud storage of any kind — files never leave the owner's device except in
  transit
- Public sharing links (no anonymous access)
- File editing or syncing (this is not Dropbox)
- Streaming/playback in-app (v1 is download only)
- User accounts on a central server (identity is device-local)

---

## 5. v1 Feature Scope

### 5.1 Identity & Contacts

- On first launch, the app generates a **username + device keypair** locally
- No email, no central account required
- To add a contact, one party shares their **invite code** (a short alphanumeric
  string encoding their public key + relay address)
- Both parties must accept each other before a contact relationship is
  established (mutual)
- Contacts are stored locally on each device

### 5.2 Permission Model

Tunde (host) can configure access per contact per folder: | Access Level | What
the contact can do | |---|---| | **READ** | Browse folder tree, see filenames
and sizes | | **READ + DOWNLOAD** | Browse and directly download files | |
**None (default)** | Contact exists, but sees nothing |

- Permissions are **persistent** — configured once and remembered
- Permissions can be **revoked at any time** — takes effect on the next request
- If a contact tries to download a file they only have READ access to, a
  **download request** is sent to the host for approval

### 5.3 File Tree Browsing

- Client opens a contact → sees the folder tree the host has shared
- Navigation works like a file explorer: tap folders to enter, see files with
  name, size, and type
- If the host is **offline**, the app shows the **last cached file tree** with a
  "Last seen: X" timestamp
- Cache is stored locally on the client, keyed by `contact_id + path`

> **Performance Guardrails**: Host limits tree walking to max depth 15 and adds
> soft limits on very large directories (>500 items). Client uses virtualization
> or pagination for folders with many entries. Full tree caching still supported
> for offline use.

### 5.4 Download Flow

**Case A — File has DOWNLOAD permission:**

1. Client taps file → download begins immediately (direct or via relay)
2. Progress bar shown; transfer is streamed via relay or direct LAN
3. If connection drops, download is paused and resumes from last byte on
   reconnect

**Case B — File has READ-only permission:**

1. Client taps file → sees "Request Download" button
2. Client sends a download request (stored in relay queue)
3. Host receives the request (in-app notification if online; shown on next open
   if offline)
4. Host approves or denies
5. If approved, client is notified and can now download the file
6. Approval is **one-time** unless host explicitly grants persistent DOWNLOAD
   permission

### 5.5 Transfer & Connectivity

**Phase 1A (LAN-only):**

- Direct HTTP connection when devices are on the same subnet
- LAN detection via local IP subnet comparison + short direct connection attempt
  with fallback (if needed)

**Phase 1B (Internet):**

- Relay proxies bytes when not on same LAN
- Auto-selection: prefer direct LAN, fall back to relay transparently
- User sees unified progress bar regardless of path

### 5.6 Resumable Downloads

- Client stores a **download manifest** locally:
  `{ file_id, bytes_received, total_bytes, checksum }`
- On resume, client sends HTTP `Range: bytes={bytes_received}-` to the host
  agent
- Host agent supports `206 Partial Content` responses
- On completion, client verifies file checksum (SHA-256)

---

## 6. v2 Roadmap

### 6.1 Phone-to-Phone Sharing

- Native mobile app (React Native) running a background file server
- Handle iOS/Android background process constraints
- Persistent connection management (foreground service on Android, background
  fetch on iOS)

### 6.2 End-to-End Encryption

- File bytes encrypted before leaving the host, decrypted on the client only
- Keys derived from the identity keypair established during contact pairing
- Relay server becomes fully blind to content

### 6.3 LAN Auto-Discovery (mDNS)

- Devices on the same network advertise themselves automatically
- No relay needed at all for LAN sessions
- Instant connection without relay handshake

### 6.4 File Preview

- Image thumbnails in the file browser
- Video duration and thumbnail for common video formats
- No in-app playback — preview only

### 6.5 Download Queue & History

- Queue multiple files for download
- Download history log per contact
- Resume any previously interrupted download

### 6.6 Selective Sync (Optional Push)

- Host can "push" a file to a contact (contact receives a notification)
- Think: Tunde drops a new movie and notifies Kola directly

---

## 7. Architecture

### 7.1 System Overview

**Phase 1A (LAN-only)**: No relay needed. Client connects directly to host’s
local HTTP server after permission check.

**Phase 1B**: Introduce lightweight relay server for presence, signaling, and
byte proxying when devices are on different networks.

```
┌─────────────────────────────────────────────────────┐
│ RELAY SERVER                                        │
│ (hosted by you — lightweight Node.js service)       │
│                                                     │
│ • Device registration & presence                    │
│ • Connection matchmaking                            │
│ • Byte proxying (internet mode only)                │
│ • Download request queue                            │
│ • Does NOT store files or file content              │
└──────────────┬────────────────────────┬─────────────┘
               │                        │
     WebSocket │                        │ WebSocket
    (signaling)│                        │(signaling)
               │                        │
┌──────────────▼───────────┐    ┌──────────▼─────────────────┐
│ HOST AGENT               │    │       CLIENT APP           │
│ (Olumide's laptop)       │    │ (Precious's laptop/phone)  │
│                          │    │                            │
│ • Express file server    │◄───┤ • Contacts list            │
│ • Permission store       │    │ • File tree browser        │
│ • Folder watcher         │    │ • Local file tree cache    │
│ • Download approvals     │    │ • Download manager         │
│ • LAN + relay mode       │    │ • Resume state store       │
└──────────────────────────┘    └────────────────────────────┘
         ▲                              │
         │        (LAN: direct HTTP)    │
         └──────────────────────────────┘
              (Internet: via relay proxy)
```

### 7.2 Connection Lifecycle

```
1. REGISTRATION
   Both devices connect to relay via WebSocket on startup
   Relay maps: username → { socket_id, public_key, last_seen }
2. BROWSE REQUEST (Precious → Olumide)
   Precious's app requests file tree for Olumide
   Relay checks: are both online?
     YES → relay asks Olumide's agent to return file tree for Kola
           (validates Precious's identity + READ permission)
     NO → relay returns nothing; client shows cached tree
3. DOWNLOAD INITIATION
   Client sends download intent to relay
   Relay checks permission level:
     READ+DOWNLOAD → relay opens proxy tunnel or signals direct LAN connect
     READ only → relay queues a download request for host approval
4. TRANSFER
   LAN: Client connects directly to host's local HTTP server
   Internet: Client streams through relay's proxy tunnel
   Both: HTTP Range Requests used; transfer is resumable
5. APPROVAL FLOW (if needed)
   Host receives request notification
   Host approves/denies in-app
   Relay notifies client of decision
   If approved: transfer begins (step 4) -->

```

### 7.3 Module Breakdown

| Module            | Location                          | Responsibility                                       | Phase |
| ----------------- | --------------------------------- | ---------------------------------------------------- | ----- |
| `relay-server`    | Your VPS / Railway / Render       | Presence, matchmaking, proxy, request queue          | 1B    |
| `host-agent`      | Host's machine (bg process)       | File server, permission enforcement, approvals       | 1A+   |
| `client-app`      | Browser (works on laptop + phone) | UI, file tree, download manager, cache               | 1A+   |
| `shared-protocol` | Shared package                    | Message types, permission schema, transfer handshake | 1A+   |

---

## 8. Data Model

### 8.1 Identity

```typescript
// Stored locally on each device (never sent to relay as plaintext)
Identity {
  username: string // chosen by user, e.g. "precious"
  deviceId: string // UUID generated on first launch
  publicKey: string // Ed25519 public key (base64)
  privateKey: string // Ed25519 private key — NEVER leaves device
  createdAt: timestamp
}
```

### 8.2 Contact

```typescript
// Stored locally on both sides after mutual pairing
Contact {
  id: string // UUID
  username: string // their chosen username
  deviceId: string // their device UUID
  publicKey: string // their public key
  inviteCode: string // the code used to pair (stored for reference)
  addedAt: timestamp
  lastSeenAt: timestamp // updated on each successful connection
}
```

### 8.3 Share (Permission Record)

```typescript
// Stored on the HOST device only
Share {
  id: string
  contactId: string // who this applies to (FK → Contact)
  path: string // absolute path on host, e.g. "/Movies/2024"
  accessLevel: "READ" | "READ_DOWNLOAD"
  status: "ACTIVE" | "REVOKED"
  createdAt: timestamp
  revokedAt: timestamp | null
}
```

### 8.4 Download Request

```typescript
// Stored in relay's queue (ephemeral — cleared after decision)
DownloadRequest {
  id: string
  requesterId: string // client's deviceId
  hostId: string // host's deviceId
  filePath: string // path of requested file
  fileSize: number // bytes
  status: "PENDING" | "APPROVED" | "DENIED" | "EXPIRED"
  createdAt: timestamp
  decidedAt: timestamp | null
  expiresAt: timestamp // auto-expire after 48 hours if no decision
}
```

### 8.5 File Tree Cache

```typescript
// Stored on the CLIENT device (local persistence)
CachedFileTree {
  contactId: string // whose tree this is
  path: string // root path of this cache entry
  tree: FileNode[] // recursive tree structure
  cachedAt: timestamp // when this was last fetched from host
}
FileNode {
  name: string
  type: "file" | "directory"
  size: number | null // null for directories
  mimeType: string | null // null for directories
  children: FileNode[] | null
}
```

### 8.6 Download Manifest

```typescript
// Stored on the CLIENT device — enables resumable downloads
DownloadManifest {
  id: string
  contactId: string
  filePath: string // path on host
  fileName: string
  totalBytes: number
  bytesReceived: number // updated as chunks arrive
  checksum: string // SHA-256 of complete file (provided by host)
  status: "IN_PROGRESS" | "PAUSED" | "COMPLETE" | "FAILED"
  startedAt: timestamp
  completedAt: timestamp | null
  localPath: string // where the file is being saved on client
}
```

---

## 9. API & Protocol Design

### 9.1 WebSocket Messages (Relay ↔ Devices)

All messages are JSON with a `type` field.

```typescript
// Device → Relay: announce presence
{ type: "REGISTER", deviceId, username, publicKey }
// Relay → Device: acknowledge
{ type: "REGISTERED", sessionId }
// Client → Relay: request file tree
{ type: "GET_FILE_TREE", targetDeviceId, path, requesterDeviceId }
// Relay → Host: forward tree request (after auth check)
{ type: "FILE_TREE_REQUEST", requesterDeviceId, path }
// Host → Relay: respond with tree
{ type: "FILE_TREE_RESPONSE", requesterDeviceId, path, tree: FileNode[] }
// Client → Relay: initiate download
{ type: "DOWNLOAD_REQUEST", targetDeviceId, filePath, requesterDeviceId }
// Relay → Client: download approved, here's where to connect
{ type: "DOWNLOAD_READY", transferToken, mode: "direct" | "relay", endpoint }
// Relay → Client: download request pending host approval
{ type: "DOWNLOAD_PENDING", requestId }
// Relay → Host: someone wants to download
{ type: "APPROVAL_NEEDED", requestId, requesterUsername, filePath, fileSize }
// Host → Relay: decision
{ type: "APPROVAL_DECISION", requestId, decision: "APPROVED" | "DENIED" }
// Relay → Client: host's decision
{ type: "APPROVAL_RESULT", requestId, decision, transferToken? }
```

### 9.2 HTTP Endpoints (Host Agent)

```
GET /files?path=<path> List files in a directory (requires valid token)
GET /download?path=<path> Download a file (supports Range header)
GET /health Relay uses this to confirm host is alive
```

## All endpoints validate a `X-Transfer-Token` header issued by the relay.

## 10. Security & Privacy Plan

### 10.1 Threat Model

| Threat                          | Likelihood        | Mitigation                                                         |
| ------------------------------- | ----------------- | ------------------------------------------------------------------ |
| Stranger accesses files         | Low (invite-only) | Mutual contact pairing required; no public access                  |
| Replay attack with stolen token | Medium            | Transfer tokens are single-use and short-lived (TTL: 5 min)        |
| Relay server compromised        | Low–Medium        | Relay never sees file contents in v1; content encryption in v2     |
| Contact impersonation           | Low               | Public key pinned during pairing; used to verify every request     |
| Permission bypass (direct HTTP) | Medium            | Host agent validates identity + permission on every single request |
| Revoked contact retains access  | Low               | Permission checked at request time, not at connection time         |

### 10.2 Identity & Authentication

- **Device keypair (Ed25519)** generated locally on first launch, never
  transmitted to relay
- Every request from a client is **signed with its private key**
- Host agent verifies the signature against the pinned public key for that
  contact
- If public key doesn't match → request rejected, regardless of other
  credentials
- Transfer tokens are issued by the relay, are **single-use**, expire in 5
  minutes, and are scoped to a specific `(requester, file, host)` triple

### 10.3 Permission Enforcement

- Permissions are enforced **at request time** on the host agent — not at
  connection time
- This means: if Tunde revokes Kola's access while Kola is mid-browse, the next
  file tree request or download attempt will be rejected
- There is no grace period on revoked permissions
- The relay does a **pre-check** (is this contact in the host's contacts list?),
  but the host agent does the **authoritative check** (does this contact have
  READ/DOWNLOAD for this specific path?)

### 10.4 Data Residency

- **Files never touch the relay server in v1** — the relay only proxies the TCP
  stream
- Contact lists, permissions, and cached file trees are **stored locally only**
  — no cloud backup
- Download manifests are stored locally on the client
- The relay stores only: device presence (volatile, cleared on disconnect) and
  download request queue (ephemeral, cleared after decision or TTL expiry)

### 10.5 v2 Security Upgrades (Planned)

- **End-to-end encryption:** File bytes encrypted (AES-256-GCM) with a session
  key derived via ECDH from both parties' identity keypairs. Relay becomes fully
  blind.
- **Certificate pinning:** Client pins the relay server's TLS certificate to
  prevent MITM
- **Audit log:** Host device keeps a local log of all access — who browsed what,
  who downloaded what, when
- **Mutual TLS (mTLS):** Device-to-relay connections authenticated by client
  certificate, not just API key

### 10.6 What This App Intentionally Does NOT Do

- **No anonymous access** — every request is tied to a known, paired contact
- **No server-side storage** — the relay cannot be subpoenaed for your files
- **No telemetry** — no usage data is collected or transmitted

---

## 11. Technical Decisions Log

| Decision                | Options Considered                         | Choice                                | Rationale                                                                                      |
| ----------------------- | ------------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Identity model          | Username+password, OAuth, Device keypair   | **Device keypair (Ed25519)**          | No central account server; identity is portable and offline-capable                            |
| Internet transport      | Hole punching (WebRTC), Tunneling, Relay   | **Relay (v1)**                        | 100% reliable, fully understood, no NAT edge cases                                             |
| Client platform         | Native desktop app, Native mobile, Web app | **Web app (v1)**                      | Works on both laptop and phone browser; one codebase                                           |
| File server             | Custom protocol, FTP, HTTP                 | **HTTP with Range support**           | Universal, debuggable, resumable downloads for free                                            |
| Offline file tree       | No cache, Full cache, Partial cache        | **Full tree cache with timestamp**    | UX wins; user sees something meaningful even when contact is offline                           |
| Permission granularity  | Whole-device, Per-folder, Per-file         | **Per-folder**                        | Practical for real use; per-file is too granular for v1                                        |
| Download approval scope | Persistent, Per-session, One-time          | **One-time (with option to upgrade)** | Safe default; host can grant persistent DOWNLOAD later                                         |
| **Development order**   | Full relay first, LAN first                | LAN-first (Phase 1A)                  | Faster feedback loop, learn core transfer/permission logic before adding networking complexity |
| **Relay introduction**  | From day 1, After LAN stable               | After LAN stable                      | Reduces risk and debugging pain                                                                |

---

## 12. Metrics & Success Criteria (New)

**Phase 1A Success:**

- Setup time for new user + add first contact: < 2 minutes
- Browse a 500-file folder: < 2 seconds
- Download 2 GB file on LAN: stable speed, resumable after disconnect
- Revoke permission: takes effect on next request (< 5s)
- Works on Chrome + Safari (desktop + mobile browser) **Overall v1 Success:**
- Two non-technical friends can share movies/documents reliably
- No crashes or data loss on interrupted transfers
- Host CPU/memory usage stays reasonable while sharing large folders

---

## 13. Risks & Mitigations

| Risk                           | Likelihood | Mitigation                                                                         |
| ------------------------------ | ---------- | ---------------------------------------------------------------------------------- |
| Large folder slows host        | Medium     | Depth cap (15 levels), limit files per directory response, lazy loading subfolders |
| Relay costs (Phase 1B)         | Low–Medium | Monitor usage; set soft file size limit (10–20 GB) initially                       |
| Background browser limitations | Medium     | Warn users; encourage keeping tab open or install as Progressive Web App (PWA)     |
| Permission race conditions     | Low        | Authoritative check always performed on host at request time                       |
| NAT / firewall issues on LAN   | Medium     | Provide clear instructions + fallback guidance in UI                               |

---

## 14. Decisions Made & Open Questions

### Decisions Made

- **Name**: **FriendDrop** (chosen)
- **Development Order**: LAN-first (Phase 1A), then add relay (Phase 1B)
- **Relay Hosting**: Use Railway or Render for v1
- **LAN Detection**: Subnet comparison via handshake + short direct connection
  attempt with fallback
- **Invite Code**: Support both alphanumeric string and QR code
- **Contact Deletion**: Remove cached file tree on client + terminate/cancel all
  pending/active downloads
- **Max File Size (relay mode)**: Soft limit of 10–20 GB initially
- **File Tree Depth & Large Directory Handling**: No hard depth limit. Enforce
  recursion cap of 15 levels on host + item limits / lazy loading on client
  (details in v1 Feature Scope). Test performance early in Phase 1A.
- **PWA Support**: Add basic PWA (web manifest + simple service worker for
  caching) in Phase 1B for improved mobile experience.

### Remaining Open Questions

- [ ] None critical for starting implementation

---

_This document is a living PRD. Update the version number and Last Updated date
on every meaningful revision._
