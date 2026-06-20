# Implementation Plan: Result, Restart & Final Validation

**Branch**: `004-result-restart-validation` | **Date**: 2026-06-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-result-restart-validation/spec.md`

## Summary

Add a `"result"` room state that is entered automatically when all guessers guess correctly, revealing the correct word, final scores (descending, drawer included at 0), and full guess history to every player. The host can then click "Restart" to return all players to the lobby with players preserved and all round state cleared. State transitions are delivered to all clients via the existing 2-second polling mechanism with no new infrastructure.

## Technical Context

**Language/Version**: TypeScript (strict mode) — Node.js 20+ backend, React 18 frontend

**Primary Dependencies**: Express + Zod (backend); React + React Router + Vite (frontend); Vitest (both)

**Storage**: In-memory only (`Map<string, Room>` in `roomStore.ts`)

**Testing**: Vitest — unit tests for pure game-logic in backend; component tests in frontend

**Target Platform**: Local dev — Node.js server + browser

**Project Type**: Web application (frontend + backend)

**Performance Goals**: State transition visible to all polling clients within 2 seconds (polling interval = 2000ms)

**Constraints**: No WebSockets; no DB; no timers; strict TypeScript; `npm run build` must pass in both `backend/` and `frontend/`

**Scale/Scope**: Small room (2–10 players); single active round; in-memory state

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Brownfield Discipline | ✅ PASS | 12 behavioral gaps documented in research.md; extending existing files only |
| II. Spec-Driven Development | ✅ PASS | Spec accepted with clarifications; no code written yet |
| III. Deterministic Game Rules | ✅ PASS | Word = `room.currentWord` (from `STARTER_WORDS[0]`); 100/0 scoring; case-insensitive compare preserved |
| IV. Polling-Based Sync Only | ✅ PASS | No WebSockets or SSE; existing 2s poll loop delivers result state |
| V. AI Usage Rules | ✅ PASS | Spec-first prompting; build verification required before every commit |
| VI. Review Discipline | ✅ PASS | Each commit must reference task ID; two-browser validation required per scenario |
| TypeScript hygiene | ✅ PASS | strict mode; no `any`; no `@ts-ignore` |
| Out-of-scope check | ✅ PASS | No timers, no cumulative scoring, no new libraries, no WebSockets |

**Post-design re-check**: All gates pass. No complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-result-restart-validation/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api.md           ← Phase 1 output
└── tasks.md             ← Phase 2 output (created by /speckit-tasks, not here)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts            ← add "result" to RoomStatus; add currentWord to Room & RoomSnapshot
│   ├── services/
│   │   └── roomStore.ts       ← update startRoom (set currentWord + host score init); update submitGuess
│   │                             (use room.currentWord; add round-end detection; transition to "result");
│   │                             add restartRoom; update toRoomSnapshot (expose currentWord on "result")
│   └── api/
│       ├── schemas.ts         ← add restartRoomSchema
│       └── rooms.ts           ← add POST /:code/restart route

frontend/
├── src/
│   ├── services/
│   │   └── api.ts             ← add "result" to RoomSnapshot.status; add currentWord?; add restartRoom()
│   ├── state/
│   │   └── roomStore.ts       ← add restartRoom() method
│   ├── pages/
│   │   ├── GamePage.tsx       ← navigate to /result when room.status === "result"
│   │   └── ResultPage.tsx     ← NEW: result screen with word, scores, history, Restart button (host only)
│   └── routes/
│       └── index.tsx          ← add /result route → ResultPage
```

**Structure Decision**: Web application (Option 2). Existing `backend/` and `frontend/` directories. No new directories at repository root level — all changes are additive within existing source trees.

## Implementation Sequence

Steps are ordered to satisfy TypeScript compilation dependencies. Each step must compile cleanly (`npm run build` in the relevant directory) before proceeding.

### Step 1 — Backend: extend data model (`game.ts`)
- Add `"result"` to `RoomStatus` union
- Add `currentWord: string` to `Room` interface
- Add `currentWord?: string` to `RoomSnapshot` interface

### Step 2 — Backend: update service logic (`roomStore.ts`)
- `startRoom`: set `room.currentWord = STARTER_WORDS[0]`; initialize `room.scores[hostId] = 0`
- `submitGuess`: replace hardcoded `STARTER_WORDS[0]` with `room.currentWord`; add round-end detection (all guessers correct → `room.status = "result"`)
- `toRoomSnapshot`: include `currentWord` in snapshot when `status === "result"`
- Add `restartRoom(code, participantId)`: validates host + "result" status; resets `status → "lobby"`, `currentWord → ""`, `guesses → []`, `scores → {}`

### Step 3 — Backend: API layer (`schemas.ts` + `rooms.ts`)
- Add `restartRoomSchema = z.object({ participantId: z.string().min(1) })`
- Add `POST /:code/restart` route handler

### Step 4 — Frontend: type and API client (`api.ts`)
- Extend `RoomSnapshot.status` to `"lobby" | "active" | "result"`
- Add `currentWord?: string` to `RoomSnapshot`
- Add `restartRoom(code, participantId)` to `api` object

### Step 5 — Frontend: store method (`roomStore.ts`)
- Add `restartRoom(code, participantId)` method (calls `api.restartRoom`, updates snapshot)

### Step 6 — Frontend: GamePage transition
- Add `useEffect` watching `room?.status`; navigate to `/result?room=${room.code}` when status is `"result"`

### Step 7 — Frontend: ResultPage (new file)
- Poll at 2s interval; navigate to `/lobby` when `room.status === "lobby"`
- Display: correct word (`room.currentWord`), score list (participants sorted descending by score, including drawer at 0), full guess history
- Host sees enabled "Restart" button; non-host does not see it

### Step 8 — Frontend: register route (`routes/index.tsx`)
- Add `<Route path="/result" element={<ResultPage />} />`

### Step 9 — Tests
- Backend: unit tests for `restartRoom` (happy path, 403 non-host, 400 wrong status); update `submitGuess` tests for `"result"` transition
- Frontend: api.ts tests for `restartRoom`
