# Data Model: Gameplay Interaction

**Feature**: `003-gameplay-interaction`
**Date**: 2026-06-19

## Entity: Room (extended)

Defined in `backend/src/models/game.ts`. Two new fields added.

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | 6-char uppercase room code — unchanged |
| `status` | `"lobby" \| "active"` | `"active"` set by `startRoom()` — unchanged |
| `hostId` | `string` | UUID of the room creator; also drawer for round 1 — unchanged |
| `participants` | `Participant[]` | Ordered by join time — unchanged |
| `createdAt` | `string` | ISO timestamp — unchanged |
| `updatedAt` | `string` | ISO timestamp, updated on every mutation — unchanged |
| `guesses` | `Guess[]` | **New.** Append-only list of all guess submissions for the round. Initialized to `[]`. |
| `scores` | `Record<string, number>` | **New.** Maps `participantId` → cumulative score. Initialized to `{}`. |

### Invariants

- `guesses` is append-only; no deletion or update after submission.
- `scores[participantId]` starts at `0` for every participant when the game starts (set in `startRoom()`).
- `scores[participantId]` increases by `100` on each correct guess; never decreases.
- The drawer (`room.hostId`) has a score entry but is never permitted to submit a guess.

---

## Entity: Guess (new)

Defined in `backend/src/models/game.ts`.

| Field | Type | Notes |
|-------|------|-------|
| `participantId` | `string` | UUID of the guessing participant |
| `playerName` | `string` | Denormalized name for display (avoids participant lookup at render time) |
| `text` | `string` | Post-trim, lowercased guess text (e.g., `"pizza"` not `"  Pizza  "`) |
| `correct` | `boolean` | `true` if `text === secretWord.toLowerCase()` after trim |
| `submittedAt` | `string` | ISO timestamp of server receipt |

### Validation rules

- `participantId` MUST be a non-empty string matching an existing participant in the room.
- `text` MUST NOT be empty or whitespace-only after trimming (rejected before storage).
- The participant identified by `participantId` MUST NOT be the drawer (`room.hostId`).
- `text` is stored post-trim and lowercased — raw input is discarded.

---

## Entity: Participant (unchanged)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID |
| `name` | `string` | 1–20 chars, trimmed, non-empty |
| `joinedAt` | `string` | ISO timestamp |

---

## Entity: RoomSnapshot (extended)

`RoomSnapshot` is the read-only projection sent to clients on every poll. Two new fields added.

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | Room code — unchanged |
| `status` | `"lobby" \| "active"` | Current room status — unchanged |
| `hostId` | `string` | Identifies the drawer for round 1 — unchanged |
| `participants` | `Participant[]` | All participants — unchanged |
| `availableWords` | `string[]` | Full seed list — unchanged |
| `roles` | `ParticipantRole[]` | `["drawer", "guesser"]` — unchanged |
| `secretWord` | `string \| undefined` | Drawer-only field from Scenario 2 — unchanged |
| `guesses` | `Guess[]` | **New.** Full accumulated guess list; same for all viewers. |
| `scores` | `Record<string, number>` | **New.** All players' scores; same for all viewers. |

### No viewer-filtering on guesses/scores

Unlike `secretWord`, `guesses` and `scores` are not filtered by viewer identity — every client receives the complete list on every poll.

---

## Conceptual: Round (not persisted, unchanged from Scenario 2)

Round state is derived from `Room` on every snapshot request. No separate entity is stored.

| Derived field | Derivation |
|--------------|-----------|
| `drawerParticipantId` | `room.hostId` (round 1 only) |
| `secretWord` | `STARTER_WORDS[0]` = `"rocket"` (round 1 only) |
| `roundNumber` | Always `1` (only one round in scope) |

---

## Canvas State (frontend only, not persisted)

| Concept | Details |
|---------|---------|
| Owner | Drawer's browser only |
| Storage | DOM Canvas API — in-memory pixels, never sent to server |
| Cleared by | Drawer clicking the "Clear" button — `context.clearRect(0, 0, canvas.width, canvas.height)` |
| Visible to | Drawer only (no canvas sync to guessers in this scenario) |

---

## State Transitions

```
Room.status (unchanged from Scenario 2):
  "lobby"  ──[POST /rooms/:code/start by host with ≥2 players]──▶  "active"

Room.guesses (new):
  []  ──[POST /rooms/:code/guess with valid non-empty guess]──▶  [...prevGuesses, newGuess]

Room.scores (new):
  { pid: 0, ... }  ──[correct guess by pid]──▶  { pid: 100, ... }
                   ──[incorrect guess by pid]──▶  { pid: 0, ... }  (unchanged)
```

---

## SessionStorage (frontend only, unchanged from Scenario 2)

| Key | Value | Written by | Read by |
|-----|-------|-----------|--------|
| `participantId` | UUID string | `RoomStore.setRoomSession()` | `GamePage` on mount |
