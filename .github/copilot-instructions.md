# FriendDrop AI Coding Agent Instructions

This document outlines the core architecture, conventions, and workflows for the
FriendDrop project to help AI agents be productive.

## Project Architecture & Monorepo Structure

FriendDrop is a LAN-first P2P file sharing project (AirDrop alternative) built
as a `pnpm` monorepo orchestrated with `turborepo`. It contains three primary
packages located in `packages/`:

- **`packages/client`**: The frontend React Single Page Application (SPA).
    - Built with Vite and Tailwind CSS v4 (`@tailwindcss/vite`).
    - Tailwind is configured via the `@import "tailwindcss";` directive in
      `src/index.css` (no `tailwind.config.js`).
- **`packages/host-agent`**: The backend Node.js service.
    - Built with Express and `@libsql/client`.
    - Manages permissions, file serving, folder watching, and download
      approvals.
- **`packages/shared`**: Shared TypeScript types, utility functions, and
  cryptographic routines utilized by both host and client.

## Developer Workflows & Commands

- **Dependency Management**: Always use `pnpm`. Install root dependencies
  directly, or workspace specific dependencies from the root using `--filter`
  (e.g., `pnpm add express --filter=host-agent`) or by `cd`ing into the package
  directory.
- **Running the Application**:
    - Full stack: `pnpm run dev` (Runs turbo dev pipeline)
    - Client only: `pnpm run dev:client`
    - Host only: `pnpm run dev:host`
- **Building and Linting**: Use `pnpm run build` and `pnpm run lint` from the
  root workspace.

## Coding Conventions

- **TypeScript**: Used strictly across all packages. Avoid `any` types. Prefer
  exact typings and define interfaces/schemas in `packages/shared` when used
  across stack boundaries.
- **Frontend Styling**: Use Tailwind CSS functional utility classes entirely.
  Avoid adding CSS unless completely unavoidable (such as for specialized
  `index.css` global theme variables).
- **Tooling**: Ensure ESLint (v9+) and Prettier configurations are respected.
  Run `pnpm run format` if you need to auto-format.
- **Backend Database**: Interactions with SQLite should use `@libsql/client` to
  avoid native build issues across environments.
