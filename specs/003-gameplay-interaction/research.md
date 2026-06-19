# Research: Gameplay Interaction

**Feature**: `003-gameplay-interaction`
**Date**: 2026-06-19

## Behavioral Gaps Discovered

Discovered by reading the starter files before any implementation. Five gaps identified.

---

### Gap 1 — No guess submission endpoint exists

**Location**: `backend/src/api/rooms.ts`, `backend/src/api/router.ts`

The current router has four routes: `POST /rooms`, `POST /rooms/:code/join`, `GET /rooms/:code`, `POST /rooms/:code/start`. There is no endpoint for submitting a guess or retrieving guess history.

**Decision**: Add two new endpoints:
- `POST /rooms/:code/guess` — accepts `{ participantId, guess }`, validates, evaluates, persists to in-memory `Room`, returns updated snapshot.
- Guess history is returned via the existing `GET /rooms/:code` polling endpoint by embedding it in `RoomSnapshot` — no new polling endpoint needed.

**Rationale**: Minimises new surface area. All clients already poll `GET /rooms/:code`; extending the snapshot response is additive and consistent with how `secretWord` was introduced in Scenario 2.

**Alternatives considered**: Separate `GET /rooms/:code/guesses` endpoint — rejected because it adds a second polling call per client per cycle for no benefit; adding guesses to the snapshot is simpler.

---

### Gap 2 — `Room` model has no guess history or score storage

**Location**: `backend/src/models/game.ts`

The `Room` interface has no `guesses` array and no per-player score map. When a guess is submitted, there is nowhere to persist it.

**Decision**: Extend the `Room` interface with:
```ts
guesses: Guess[];
scores: Record<string, number>;  // participantId → score
```
And add a `Guess` interface:
```ts
interface Guess {
  participantId: string;
  playerName: string;
  text: string;         // post-trim, lowercased
  correct: boolean;
  submittedAt: string;  // ISO timestamp
}
```
Both fields default to `[]` and `{}` respectively on room creation.

**Rationale**: Minimal extension; `guesses` is append-only during a round. `scores` is a plain object keyed by `participantId` — easy to serialize into the snapshot.

---

### Gap 3 — `RoomSnapshot` does not include guess history or scores

**Location**: `backend/src/models/game.ts:19`, `frontend/src/services/api.ts:9`

The current `RoomSnapshot` has no `guesses` or `scores` fields. Polling clients cannot see game activity or scoreboard data.

**Decision**: Extend `RoomSnapshot` with:
```ts
guesses: Guess[];                    // full accumulated list
scores: Record<string, number>;      // participantId → score
```
`toRoomSnapshot` copies `room.guesses` and `room.scores` directly — no per-viewer filtering needed (all players see the same guess history and scoreboard).

**Rationale**: Spec FR-010 and FR-014 require full guess history and shared scoreboard for all players. No sensitive information is in either field (unlike `secretWord`).

---

### Gap 4 — `GuessForm` is a stub with no submission logic

**Location**: `frontend/src/components/GuessForm.tsx`

`GuessForm.handleSubmit` calls `event.preventDefault()` and does nothing else. The guess text is held in local state but never sent to the server.

**Decision**: Wire `GuessForm` to call `api.submitGuess(roomCode, participantId, guessText)`. Add client-side validation: reject empty/whitespace-only input before calling the API. On success, clear the input. Disable the form while a submission is in-flight.

**Rationale**: The component structure already exists; only the submit handler needs work. Client-side empty-guess rejection satisfies SC-003 (never reaches server).

---

### Gap 5 — `Scoreboard` and `ResultPanel` are placeholder stubs

**Location**: `frontend/src/components/Scoreboard.tsx`, `frontend/src/components/ResultPanel.tsx`

Both components render static placeholder text. `Scoreboard` shows "Waiting for players... 0" unconditionally; `ResultPanel` shows a static message with no data.

**Decision**:
- `Scoreboard` reads `room.scores` and `room.participants` from the polled `RoomSnapshot` and renders each player's name + score, sorted by score descending.
- `ResultPanel` reads `room.guesses` and renders the full guess history list (guesser name, guess text, correct/incorrect badge), ordered by submission time ascending.

**Rationale**: Both components already exist in `GamePage`'s layout. They need data-driven rendering added; the UI shell stays the same.

---

## Assumption: Canvas is drawer-local (no sync to guessers)

The spec explicitly states: "The canvas is local to the drawer's browser; guessers do not need to see the drawing in this scenario — canvas sync to guessers is out of scope."

**Decision**: The `<canvas>` element renders strokes in the drawer's browser immediately via DOM Canvas API — no network round-trip. No canvas state is persisted to or synced through the server. The `GamePage` stub's `canvas-placeholder` div is replaced with a `<canvas>` element wired to mouse events for the drawer only.

**Rationale**: Local rendering is always instant (SC-001). Syncing canvas strokes across players requires a fundamentally different architecture (e.g., stroke broadcast via polling) — out of scope per constitution Principle IV and spec Assumptions.

---

## Guess Comparison Algorithm

**Decision**:
1. Trim the submitted text: `guess.trim()`
2. Lowercase both sides: `guess.trim().toLowerCase() === secretWord.toLowerCase()`
3. Reject before comparison if `guess.trim() === ""`

**Rationale**: Exactly matches FR-004 (trim), FR-005 (case-insensitive), FR-006 (reject empty). This is a pure function — independently testable with Vitest as required by the constitution's Engineering Standards.

---

## Polling Strategy

**Decision**: Reuse the existing `RoomStore.fetchRoom()` + `setInterval(2000)` pattern established in Scenario 1 (lobby polling). No change to polling interval or mechanism. `fetchRoom` now returns a snapshot with `guesses` and `scores` embedded.

**Rationale**: Spec FR-009 and constitution Principle IV mandate polling only at ~2s interval. The polling infrastructure already exists; extending the payload is the only change needed.

---

## Score Persistence

**Decision**: Scores are stored as `Record<string, number>` (participantId → cumulative score) directly on the `Room` object in the in-memory `Map`. Initialized to `0` for all participants when the room is created; incremented by 100 on each correct guess.

**Rationale**: Simple, consistent with the all-in-memory constraint. Avoids a separate data structure. Score drift is impossible because the map is the only write path.
