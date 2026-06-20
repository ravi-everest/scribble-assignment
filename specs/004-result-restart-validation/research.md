# Research: Result, Restart & Final Validation

## Decision 1: Where the "result" state transition is triggered

**Decision**: The backend transitions `room.status` from `"active"` to `"result"` inside `submitGuess`, immediately after a correct guess causes all non-host participants to have at least one correct guess. No separate "end round" endpoint is needed.

**Rationale**: The trigger condition ("all guessers have guessed correctly") is already fully computable from data available at guess-submission time — the participant list, `room.hostId`, and the `guesses` array. Placing the transition here keeps the state mutation atomic (one write, one source of truth) and avoids a polling-driven end condition on the frontend.

**Alternatives considered**:
- A dedicated `POST /rooms/:code/end` endpoint: rejected — adds a round-trip and a race window; the backend already has all the information it needs.
- Timer-based automatic end: out of scope per constitution (no timers/countdowns).

---

## Decision 2: Where `currentWord` is stored

**Decision**: Add `currentWord: string` to the `Room` model (initialized to `""`, set to `STARTER_WORDS[0]` when `startRoom` is called). Reference `room.currentWord` inside `submitGuess` instead of the current hardcoded `STARTER_WORDS[0]`.

**Rationale**: The result screen must show the correct word to all players (FR-002). In "result" status the word can no longer be a secret, so it must be persisted on the room and returned in the snapshot. Storing it on `Room` also removes the brittle hardcoded reference inside `submitGuess`.

**Alternatives considered**:
- Deriving the word from `STARTER_WORDS[0]` at read-time in `toRoomSnapshot`: rejected — couples the snapshot serializer to word-selection logic; will break if word selection is ever parameterized.

---

## Decision 3: How `currentWord` is surfaced in `RoomSnapshot`

**Decision**: Add `currentWord?: string` to `RoomSnapshot`. It is populated only when `room.status === "result"` (visible to all players). During "active" status the drawer continues to receive `secretWord` as before; `currentWord` is absent.

**Rationale**: This preserves the existing `secretWord` contract for the active gameplay phase (spec 003) and clearly separates the "secret during play" vs "revealed at end" semantics. The frontend can branch simply on `room.status === "result"` to show `room.currentWord`.

**Alternatives considered**:
- Always including `currentWord` in the snapshot: rejected — reveals the word to guessers during active play, breaking the game.
- Repurposing `secretWord` for the result view: rejected — `secretWord` is role-gated (drawer-only during "active"), which would require complex conditional logic in `toRoomSnapshot`.

---

## Decision 4: `POST /rooms/:code/restart` endpoint design

**Decision**: New endpoint that validates the caller is the host and the room is in "result" status, then resets `status → "lobby"`, clears `guesses → []`, `scores → {}`, `currentWord → ""`. Returns the updated `RoomSnapshot`.

**Rationale**: Matches the pattern of all existing mutating endpoints (start, guess). Host-only enforcement is consistent with `startRoom`. Clearing `scores` completely (rather than retaining them) is per FR-008 and the spec assumption that scores are per-round only.

**Alternatives considered**:
- Reusing `POST /rooms/:code/start` with a "reset" flag: rejected — conflates two distinct state transitions and muddies the protocol.
- Client-side reset via direct `saveRoom`: rejected — no such endpoint exists and bypassing server validation is unsafe.

---

## Decision 5: Frontend `ResultPage` as a new route vs. inline branch in `GamePage`

**Decision**: Introduce a new `ResultPage` component rendered at `/result?room=XXXXXX`. `GamePage` polls during "active" status and navigates to `/result?room=...` when `room.status === "result"`. `ResultPage` polls during "result" status and navigates to `/lobby` when `room.status === "lobby"`.

**Rationale**: Keeps each page component responsible for exactly one room status — mirrors the existing `LobbyPage` → `GamePage` transition pattern. A separate route also makes the result state bookmarkable/restorable via session, consistent with `GamePage`'s existing `restoreSession` pattern.

**Alternatives considered**:
- Inline conditional render inside `GamePage`: rejected — makes `GamePage` responsible for two distinct statuses and grows the component beyond a single responsibility; the existing lobby→game navigation precedent strongly favors a separate route.

---

## Decision 6: Score display ordering (clarified in spec)

**Decision**: `Scoreboard` component already sorts `participants` by `scores[b.id] - scores[a.id]` (descending). No new logic needed for the result display — the same component works as-is.

**Rationale**: FR-003 (score descending) is already implemented by the existing `Scoreboard` component. The drawer will appear with score 0, which sorts to the bottom naturally unless all guessers also scored 0.

---

## Decision 7: Detecting "all guessers have guessed correctly"

**Decision**: In `submitGuess`, after pushing the new guess and awarding points, compute:
```
guessers = participants where id !== hostId
correctGuessers = Set of participantIds from guesses where correct === true
allGuessed = guessers.length > 0 && every guesser has an entry in correctGuessers
```
If `allGuessed`, set `room.status = "result"`.

**Rationale**: Deterministic, pure computation on existing room data. Handles the 1-guesser and N-guesser cases uniformly. The `guessers.length > 0` guard prevents a degenerate single-player "auto-end" edge case.

**Alternatives considered**:
- Counting only the most recent guess: rejected — a player who previously guessed correctly would be missed if they submitted a second (incorrect) guess.

---

## Gaps identified from existing code

1. `RoomStatus` in `game.ts` is `"lobby" | "active"` — needs `"result"` added.
2. `Room` has no `currentWord` field — must be added.
3. `submitGuess` uses `STARTER_WORDS[0]` directly — must be changed to `room.currentWord`.
4. `startRoom` does not set `currentWord` — must be added.
5. `RoomSnapshot` has no `currentWord` field — must be added.
6. Frontend `api.ts` `RoomSnapshot` interface only allows `"lobby" | "active"` — needs `"result"`.
7. Frontend `api.ts` has no `restartRoom` function — must be added.
8. Frontend `roomStore.ts` has no `restartRoom` method — must be added.
9. No `ResultPage` component or `/result` route exists — must be created.
10. `GamePage` has no transition to `/result` on status change — must be added.
11. No restart schema in `backend/src/api/schemas.ts` — must be added.
12. No restart route in `backend/src/api/rooms.ts` — must be added.
