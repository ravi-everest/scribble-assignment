# Data Model: Result, Restart & Final Validation

## Changed Entities

### RoomStatus (backend: `backend/src/models/game.ts`)

```
RoomStatus = "lobby" | "active" | "result"
```

Added value: `"result"` — room has ended a round; word is revealed; awaiting host restart.

---

### Room (backend: `backend/src/models/game.ts`)

| Field | Type | Change | Notes |
|---|---|---|---|
| `code` | `string` | existing | Room identifier |
| `status` | `RoomStatus` | **extended** | Now includes `"result"` |
| `hostId` | `string` | existing | Participant ID of the host/drawer |
| `participants` | `Participant[]` | existing | All players including drawer |
| `guesses` | `Guess[]` | existing | Chronological guess history |
| `scores` | `Record<string, number>` | existing | Keyed by participantId |
| `currentWord` | `string` | **new** | Empty string in lobby; set to the selected word when `startRoom` is called; persists through "result"; cleared on restart |
| `createdAt` | `string` | existing | ISO timestamp |
| `updatedAt` | `string` | existing | ISO timestamp |

**State transitions**:
```
lobby ──[startRoom]──▶ active ──[all guessers correct]──▶ result ──[restartRoom]──▶ lobby
```

**Invariants**:
- `currentWord` is non-empty when `status === "active"` or `status === "result"`
- `currentWord` is `""` when `status === "lobby"`
- `scores` is cleared to `{}` on restart (not `{}` with zero-valued keys)

---

### RoomSnapshot (backend: `backend/src/models/game.ts`, frontend: `frontend/src/services/api.ts`)

| Field | Type | Change | Notes |
|---|---|---|---|
| `code` | `string` | existing | |
| `status` | `"lobby" \| "active" \| "result"` | **extended** | |
| `hostId` | `string` | existing | |
| `participants` | `Participant[]` | existing | All players; drawer included |
| `availableWords` | `string[]` | existing | Unchanged |
| `roles` | `ParticipantRole[]` | existing | Unchanged |
| `secretWord` | `string \| undefined` | existing | Populated only when `status === "active"` AND viewer is host |
| `currentWord` | `string \| undefined` | **new** | Populated only when `status === "result"`; visible to all players |
| `guesses` | `Guess[]` | existing | Full chronological history |
| `scores` | `Record<string, number>` | existing | All participants; drawer at 0 |

**Population rules for `currentWord`**:
- `status === "result"`: `currentWord = room.currentWord` (non-empty string)
- `status !== "result"`: field is absent (`undefined`)

---

### Guess (no changes)

| Field | Type | Notes |
|---|---|---|
| `participantId` | `string` | Submitter's ID |
| `playerName` | `string` | Submitter's display name |
| `text` | `string` | Lowercased, trimmed |
| `correct` | `boolean` | True if matched `currentWord` case-insensitively |
| `submittedAt` | `string` | ISO timestamp |

---

### Participant (no changes)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | UUID |
| `name` | `string` | Display name |
| `joinedAt` | `string` | ISO timestamp |

---

## Score model at result time

- Every `Participant` in the room appears in `scores`, including the drawer.
- The drawer's entry is `scores[hostId] = 0` (set at `startRoom` time, never incremented).
- Guessers who guessed correctly: `scores[participantId] = 100`.
- Guessers who never guessed correctly: `scores[participantId] = 0`.
- On restart: `scores` is reset to `{}` (cleared entirely, not zeroed).

---

## Round-end detection rule

Evaluated at the end of every `submitGuess` call (after guess is stored and score updated):

```
guessers = participants.filter(p => p.id !== hostId)
correctIds = new Set(guesses.filter(g => g.correct).map(g => g.participantId))
allGuessed = guessers.length > 0 && guessers.every(p => correctIds.has(p.id))

if (allGuessed) room.status = "result"
```

This is the only way `status` transitions to `"result"` in this feature.
