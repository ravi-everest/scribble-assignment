# Implementation Plan: Room Setup & Lobby

**Branch**: `ravi/assignment` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-room-setup-lobby/spec.md`

## Summary

Extend the starter's existing room create/join/fetch infrastructure to satisfy the full lobby spec: add host identity (`hostId`), enforce display name validation (1–20 chars, required), extend room code to 6 chars, wire automatic polling (~2s) in the lobby, add a `POST /rooms/:code/start` endpoint for host-only game start, and gate the "Start Game" button on host identity and minimum player count. All state remains in-memory; no new libraries.

## Technical Context

**Language/Version**: TypeScript 5.6 (frontend + backend)

**Primary Dependencies**:
- Backend: Express 4, Zod 3, Node.js crypto (UUID) — no additions
- Frontend: React 18, React Router 6, Vite 5 — no additions

**Storage**: In-memory `Map<string, Room>` in `backend/src/services/roomStore.ts` — no database

**Testing**: Vitest (both `backend/` and `frontend/`)

**Target Platform**: Desktop browser (Chrome/Firefox); Node.js 20 backend

**Project Type**: Web application (frontend + backend)

**Performance Goals**: Room create/join < 5s (SC-001/SC-002); lobby poll reflects new joiner within ~2s (SC-003)

**Constraints**: No WebSockets, no persistent storage, no new top-level dependencies, no host migration

**Scale/Scope**: Small-scale (lab environment); no concurrent load requirements beyond two-browser manual validation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Brownfield Discipline | PASS | Extending existing files only; no wholesale rewrites. 6 behavioral gaps documented in research.md. |
| II. Spec-Driven Development | PASS | All changes traceable to FR-001–FR-011 and SC-001–SC-006. |
| III. Deterministic Game Rules | PASS | Word list unchanged. Host = room creator (first participant). Room code = 6-char from 32-char alphabet. |
| IV. Polling-Based Sync Only | PASS | `setInterval(2000)` only. No WebSockets or SSE introduced. |
| V. AI Usage Rules | PENDING | Developer must verify every change, run `npm run build` before committing, and author commit messages. |
| VI. Review Discipline | PENDING | Each commit must reference a task ID and address exactly one acceptance criterion. |
| Engineering Standards | PASS | `strict` mode already on in both tsconfigs. No `any`. Pure functions for game logic. |

**Post-design re-check**: All Phase 1 artifacts (data-model, contracts, quickstart) introduce only `hostId` field addition, `"active"` status extension, and `/rooms/:code/start` endpoint — all within existing patterns. No violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/001-room-setup-lobby/
├── plan.md              # This file
├── research.md          # Phase 0 — behavioral gaps + decisions
├── data-model.md        # Phase 1 — Room/Participant entity definitions
├── quickstart.md        # Phase 1 — manual validation guide
├── contracts/
│   └── api.md           # Phase 1 — REST endpoint contracts
└── tasks.md             # Phase 2 — /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts          # Add hostId to Room; add "active" to RoomStatus
│   ├── services/
│   │   └── roomStore.ts     # Update createRoom (hostId, 6-char code, required name)
│   │                        # Update joinRoom (required name validation)
│   │                        # Update toRoomSnapshot (expose hostId)
│   │                        # Add startRoom(code, participantId) function
│   └── api/
│       ├── schemas.ts        # Update createRoomSchema/joinRoomSchema (required name)
│       │                    # Add startRoomSchema (participantId required)
│       └── rooms.ts          # Add POST /:code/start route
│
frontend/
├── src/
│   ├── services/
│   │   └── api.ts            # Update RoomSnapshot type (add hostId)
│   │                        # Add api.startRoom(code, participantId)
│   ├── state/
│   │   └── roomStore.ts      # Add startRoom() action
│   └── pages/
│       ├── CreateRoomPage.tsx  # Add client-side name validation
│       ├── JoinRoomPage.tsx    # Add client-side name + empty-code validation
│       └── LobbyPage.tsx       # Add setInterval polling (2000ms)
│                              # Add auto-navigate on status === "active"
│                              # Gate Start Game button (host + ≥2 players)
│                              # Call api.startRoom on Start Game click
│                              # Mark host in participant list
```

## Complexity Tracking

No constitution violations. All changes extend existing files using existing patterns.
