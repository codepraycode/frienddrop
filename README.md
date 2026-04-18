# FriendDrop

**LAN-first P2P file sharing** — Your private AirDrop alternative.

Secure, resumable, permission-controlled file sharing between devices on the same network (and later over the internet via relay).

---

## ✨ Features (Phase 1A — LAN-only MVP)

- End-to-end cryptographic identity (Ed25519)
- Contact system with mutual invite codes + QR
- Granular per-folder permissions
- Full file tree browsing with offline cache
- Resumable downloads (HTTP Range requests)
- Direct LAN mode (zero latency)
- Future-proof architecture for relay mode

---

## Architecture

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

### Connection Lifecycle

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

---

## Tech Stack

- **Monorepo**: PNPM Workspaces + Turborepo
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Host Agent**: Express + TypeScript + better-sqlite3
- **Shared**: Types, Ed25519 crypto, protocol definitions
- **Crypto**: Ed25519 (Web Crypto + noble-curves)
- **Database**: SQLite (host) + IndexedDB (client cache)

---

## Project Structure

```
frienddrop/
├── packages/
│   ├── client/          ← React + Vite frontend
│   ├── host-agent/      ← Express backend + file server
│   └── shared/          ← Common types & utilities
├── README.md
├── pnpm-workspace.yaml
├── turbo.json           (optional)
└── package.json
```

---

## Quick Start (Local Development)

```bash
git clone https://github.com/YOUR_USERNAME/frienddrop.git
cd frienddrop
pnpm install
pnpm dev          # runs client + host-agent together
```

See full setup instructions in the [Technical](https://linear.app/codepraycode/document/frienddrop-technical-specification-phase-1a-566269eaa982) documentation.

---

## Roadmap

Full Phase 1A milestones are tracked in **Linear** → [FriendDrop Phase 1A](https://linear.app) (internal link).

---

**Made with ❤️**
Phase 1A — LAN-only MVP (April 2026)
