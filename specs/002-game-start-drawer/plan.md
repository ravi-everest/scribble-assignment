# Implementation Plan: Game Start & Drawer Flow

**Branch**: `ravi/assignment` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-game-start-drawer/spec.md`

## Summary

Extend the existing room infrastructure to implement the game start and drawer flow: add `secretWord` to `RoomSnapshot` with server-side filtering (drawer sees it, guessers never do), persist `participantId` to `sessionStorage`, pass `roomCode` as a URL query parameter on navigation to `/game`, update `GamePage` to restore session from URL + `sessionStorage` on refresh, and render role labels and the secret word conditionally based on whether the viewer is the drawer.

## Technical Context

**Language/Version**: TypeScript 5.6 (frontend + backend)

**Primary Dependencies**:
- Backend: Express 4, Zod 3, Node.js crypto — no additions
- Frontend: React 18, React Router 6, Vite 5 — no additions

**Storage**: In-memory `Map<string, Room>` in `backend/src/services/roomStore.ts` — no database. `sessionStorage` in browser for `participantId` persistence.

**Testing**: Vitest (both `backend/` and `frontend/`)

**Target Platform**: Desktop browser (Chrome/Firefox); Node.js 20 backend

**Performance Goals**: Game screen loads within polling window (~2s) of host starting game (SC-001)

**Constraints**: No WebSockets, no persistent storage, no new top-level dependencies

**Scale/Scope**: Small-scale (lab environment); two-browser manual validation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Brownfield Discipline | PASS | 5 behavioral gaps documented in research.md. Extending existing files only. |
| II. Spec-Driven Development | PASS | All changes traceable to FR-001 through FR-008 and SC-001–SC-005. |
| III. Deterministic Game Rules | PASS | Drawer = `room.hostId`. Secret word = `STARTER_WORDS[0]` = `"rocket"`. Fixed, reproducible. |
| IV. Polling-Based Sync Only | PASS | Existing `setInterval(2000)` polling reused unchanged. No WebSockets or SSE. |
| V. AI Usage Rules | PENDING | Developer must run `npm run build`, explain changes line by line, and author commit messages. |
| VI. Review Discipline | PENDING | Each commit must reference a task ID and address exactly one acceptance criterion. |
| Engineering Standards | PASS | `strict` mode on in both tsconfigs. `secretWord?: string` optional field — no `any`. |

**Post-design re-check**: All Phase 1 artifacts introduce only additive changes (`secretWord` field, `sessionStorage` write, URL param read). No existing endpoint signatures change. No new libraries. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-game-start-drawer/
├── plan.md              # This file
├── research.md          # Phase 0 — 5 behavioral gaps + decisions
├── data-model.md        # Phase 1 — RoomSnapshot extension + Round derivation
├── quickstart.md        # Phase 1 — 7 manual validation scenarios
├── contracts/
│   └── api.md           # Phase 1 — modified RoomSnapshot + /start contract
└── tasks.md             # Phase 2 — /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts             # Add secretWord?: string to RoomSnapshot
│   └── services/
│       └── roomStore.ts        # Update toRoomSnapshot: populate secretWord
│                               # for drawer when status === "active"

frontend/
├── src/
│   ├── services/
│   │   └── api.ts              # Add secretWord?: string to RoomSnapshot type
│   ├── state/
│   │   └── roomStore.ts        # setRoomSession: write participantId to sessionStorage
│   │                           # Add restoreSession(roomCode, participantId): fetch + seed store
│   ├── pages/
│   │   ├── LobbyPage.tsx       # navigate("/game") → navigate(`/game?room=${room.code}`)
│   │   └── GamePage.tsx        # Read roomCode from useSearchParams()
│   │                           # Read participantId from sessionStorage
│   │                           # Redirect to "/" if either missing
│   │                           # Call restoreSession if store has no room
│   │                           # Render role label (drawer vs guesser)
│   │                           # Render secretWord for drawer only
```

## Complexity Tracking

No constitution violations. All changes extend existing files using existing patterns.
