# Implementation Plan: Gameplay Interaction

**Branch**: `ravi/assignment` | **Date**: 2026-06-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-gameplay-interaction/spec.md`

## Summary

Extend the existing room infrastructure to implement in-round gameplay: add `Guess` entity and `guesses`/`scores` fields to the `Room` model; implement `POST /rooms/:code/guess` to evaluate guesses (trim + case-insensitive comparison, 100-pt award, empty/drawer rejection); embed `guesses` and `scores` in `RoomSnapshot` for all polling clients; wire the frontend `GuessForm` to submit guesses and clear on success; replace the `Scoreboard` and `ResultPanel` stubs with data-driven rendering; and replace the canvas placeholder with a `<canvas>` element for the drawer.

## Technical Context

**Language/Version**: TypeScript 5.6 (frontend + backend)

**Primary Dependencies**:
- Backend: Express 4, Zod 3, Node.js crypto — no additions
- Frontend: React 18, React Router 6, Vite 5, DOM Canvas API — no additions

**Storage**: In-memory `Map<string, Room>` in `backend/src/services/roomStore.ts` — no database. `Room.guesses` (array) and `Room.scores` (plain object) added to in-memory state only.

**Testing**: Vitest (both `backend/` and `frontend/`)

**Target Platform**: Desktop browser (Chrome/Firefox); Node.js 20 backend

**Performance Goals**: Guess round-trip completes within one polling cycle (~2s) for all players (SC-004)

**Constraints**: No WebSockets, no persistent storage, no new top-level dependencies

**Scale/Scope**: Small-scale (lab environment); two-browser manual validation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Brownfield Discipline | PASS | 5 behavioral gaps documented in research.md. All changes extend existing files. No starter rewrites. |
| II. Spec-Driven Development | PASS | All changes traceable to FR-001–FR-014 and SC-001–SC-006. |
| III. Deterministic Game Rules | PASS | Guess comparison: `trim().toLowerCase()` both sides. Correct = exactly 100 pts. Deterministic, reproducible. |
| IV. Polling-Based Sync Only | PASS | Existing `setInterval(2000)` polling reused. `guesses`/`scores` embedded in existing snapshot. No WebSockets. Canvas is drawer-local — no sync needed. |
| V. AI Usage Rules | PENDING | Developer must run `npm run build`, explain changes line by line, author commit messages. |
| VI. Review Discipline | PENDING | Each commit must reference a task ID and address exactly one acceptance criterion. |
| Engineering Standards | PASS | `strict` mode on in both tsconfigs. `Guess` interface uses typed fields, no `any`. Pure `compareGuess` function independently testable with Vitest. |

**Post-design re-check**: All Phase 1 artifacts introduce additive changes only. `POST /rooms/:code/guess` is a new route (no existing signatures change). `guesses: Guess[]` and `scores: Record<string, number>` are new optional-initialized fields on `Room`. Canvas is DOM-only — no new API surface. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/003-gameplay-interaction/
├── plan.md              # This file
├── research.md          # Phase 0 — 5 behavioral gaps + decisions
├── data-model.md        # Phase 1 — Room/Guess/RoomSnapshot extensions
├── quickstart.md        # Phase 1 — 7 manual validation scenarios
├── contracts/
│   └── api.md           # Phase 1 — POST /guess + extended RoomSnapshot
└── tasks.md             # Phase 2 — /speckit-tasks output (not yet created)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts             # Add Guess interface
│   │                           # Add guesses: Guess[] and scores: Record<string,number> to Room
│   │                           # Add guesses and scores to RoomSnapshot
│   ├── api/
│   │   ├── rooms.ts            # Add POST /:code/guess route handler
│   │   └── schemas.ts          # Add submitGuessSchema (participantId, guess)
│   └── services/
│       └── roomStore.ts        # Add submitGuess(code, participantId, guess): RoomSnapshot
│                               # Add compareGuess(input, secretWord): boolean (pure, exported)
│                               # Update createRoom: initialize guesses:[], scores:{}
│                               # Update startRoom: seed scores with 0 for all participants
│                               # Update toRoomSnapshot: include guesses and scores

frontend/
├── src/
│   ├── services/
│   │   └── api.ts              # Add Guess interface and guesses/scores to RoomSnapshot type
│   │                           # Add api.submitGuess(code, participantId, guess): Promise<{room}>
│   ├── components/
│   │   ├── GuessForm.tsx       # Wire handleSubmit: validate non-empty, call api.submitGuess,
│   │   │                       # clear input on success, disable while in-flight
│   │   │                       # Accept isDrawer prop: disable entire form for drawer
│   │   ├── Scoreboard.tsx      # Replace stub: render room.scores + room.participants as list
│   │   ├── ResultPanel.tsx     # Replace stub: render room.guesses as activity feed
│   │   └── DrawingCanvas.tsx   # NEW component: <canvas> with mouse draw + clear button
│   │                           # Rendered only for drawer (isDrawer === true)
│   └── pages/
│       └── GamePage.tsx        # Pass isDrawer prop to GuessForm
│                               # Replace canvas-placeholder div with DrawingCanvas (drawer)
│                               # or static "Waiting for drawing..." message (guesser)
│                               # Pass room.scores and room.participants to Scoreboard
│                               # Pass room.guesses to ResultPanel
```

## Complexity Tracking

No constitution violations. All changes extend existing files using existing patterns. `DrawingCanvas.tsx` is a new component file but not a new top-level module — it lives inside the existing `components/` directory.
