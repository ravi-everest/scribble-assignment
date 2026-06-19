# Research: Game Start & Drawer Flow

**Feature**: `002-game-start-drawer`
**Date**: 2026-06-19

## Behavioral Gaps Discovered

Discovered by reading the starter files before any implementation. Five gaps identified.

### Gap 1 — `toRoomSnapshot` ignores `viewerParticipantId`

**Location**: `backend/src/services/roomStore.ts:123`

Current code:
```ts
export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSnapshot {
  void viewerParticipantId;  // <-- deliberately discarded
  ...
}
```

The parameter was added in Scenario 1 as a forward-looking hook but never populated. The `RoomSnapshot` type has no `secretWord` field. No role-filtered response is currently produced.

**Decision**: Extend `toRoomSnapshot` to derive the drawer (= `room.hostId` for round 1), select the secret word (`STARTER_WORDS[0]`), and include `secretWord` in the snapshot only when `status === "active"` AND `viewerParticipantId === drawerParticipantId`. All other callers receive `secretWord: undefined`.

**Rationale**: Enforces FR-006 (server-side word hiding) without breaking any existing callers — `secretWord` is optional in the type.

**Alternatives considered**: UI-only hiding rejected (spec clarification Q1, answer A).

---

### Gap 2 — `RoomSnapshot` has no `secretWord` field

**Location**: `backend/src/models/game.ts:19`, `frontend/src/services/api.ts:9`

`RoomSnapshot` currently exposes `availableWords: string[]` (the full 5-word list) and `roles: ParticipantRole[]` (the two possible roles). Neither conveys the assigned secret word for the active round.

**Decision**: Add `secretWord?: string` to `RoomSnapshot` in both `backend/src/models/game.ts` and `frontend/src/services/api.ts`. Field is optional — absent means "you are not the drawer or the game hasn't started." `availableWords` and `roles` remain for future use.

**Rationale**: Minimal additive change; no existing field semantics change.

---

### Gap 3 — `GamePage` depends on in-memory store state, not URL/sessionStorage

**Location**: `frontend/src/pages/GamePage.tsx:12`

Current: `const { room, participantId } = useRoomState()` — if the user refreshes `/game`, the store is empty and the user is immediately redirected to `/`.

The spec clarification (Q4, answer B) requires `roomCode` to be passed as a URL query parameter (`/game?room=ABC123`) and `participantId` to be readable from `sessionStorage`.

**Decision**:
- `GamePage` reads `roomCode` from `useSearchParams()`.
- `GamePage` reads `participantId` from `sessionStorage` (key: `participantId`).
- If either is missing → redirect to `/`.
- If in-memory store already has the room (normal lobby→game flow), use it directly.
- If store has no room (page refresh), call a new `RoomStore.restoreSession(roomCode, participantId)` method that fetches the room and re-seeds the store.

**Rationale**: Preserves the existing in-memory store for the common path while making the game page resilient to refresh.

---

### Gap 4 — `participantId` not persisted to `sessionStorage`

**Location**: `frontend/src/state/roomStore.ts:65`

`setRoomSession` sets `participantId` in the in-memory store only. After a navigation or page refresh, `participantId` is lost.

**Decision**: Write `participantId` to `sessionStorage` (key: `participantId`) inside `setRoomSession`. `GamePage` reads it back via `sessionStorage.getItem("participantId")`.

**Rationale**: `sessionStorage` survives tab navigation but not cross-tab or cross-session — correct scope for a single-player game session.

---

### Gap 5 — `LobbyPage` navigates to `/game` without query param

**Location**: `frontend/src/pages/LobbyPage.tsx:37`

```ts
if (room?.status === "active") {
  navigate("/game");
}
```

After the change in Gap 3, `GamePage` requires `?room=CODE`. This navigate call must be updated.

**Decision**: Change to `navigate(\`/game?room=${room.code}\`)`.

**Rationale**: Trivial one-line change; consistent with clarification Q4.

---

## Word Selection Decision

**Decision**: `STARTER_WORDS[0]` = `"rocket"` is the deterministic secret word for round 1. No counter or random selection needed.

**Rationale**: Spec Assumption: "index 0: 'rocket' as the deterministic choice."

**Confirmed by**: Constitution Principle III (deterministic game rules) and spec FR-004.

---

## Role Derivation Decision

**Decision**: For round 1, the drawer is always the `room.hostId` (first participant / room creator). All other `participantId`s are guessers. No separate `Round` entity is stored — role is derived on-the-fly inside `toRoomSnapshot`.

**Rationale**: Only round 1 is in scope. Persisting a separate Round record would be premature complexity.

**Tradeoff**: If drawer rotation is added in a future scenario, a persistent Round model will be needed. Acceptable for current scope.
