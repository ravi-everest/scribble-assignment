# API Contracts: Gameplay Interaction

**Feature**: `003-gameplay-interaction`
**Date**: 2026-06-19

All endpoints are prefixed with `/rooms`. Base URL: `http://localhost:3001` (dev).

---

## Existing endpoints (no contract change)

### POST /rooms
### POST /rooms/:code/join
### POST /rooms/:code/start
### GET /rooms/:code (shape extended — see below)

These four endpoints are implemented in earlier scenarios. Only `GET /rooms/:code` response shape changes (additive fields).

---

## Extended: RoomSnapshot shape

```typescript
interface Guess {
  participantId: string;
  playerName: string;
  text: string;         // post-trim, lowercased
  correct: boolean;
  submittedAt: string;  // ISO 8601
}

interface RoomSnapshot {
  code: string;
  status: "lobby" | "active";
  hostId: string;
  participants: Array<{ id: string; name: string; joinedAt: string }>;
  availableWords: string[];
  roles: ("drawer" | "guesser")[];
  secretWord?: string;             // unchanged from Scenario 2
  guesses: Guess[];                // NEW — full accumulated list, same for all viewers
  scores: Record<string, number>;  // NEW — participantId → cumulative score
}
```

`guesses` and `scores` are present on every poll response (empty array / empty object before any guesses are submitted). They are not filtered by viewer identity.

---

## NEW: POST /rooms/:code/guess

**Purpose**: Submit a word guess from a guesser. Evaluates correctness, persists the guess, and updates the submitter's score.

**Path parameter**

| Param | Type | Notes |
|-------|------|-------|
| `code` | `string` | Room code (case-insensitive; server uppercases) |

**Request body**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `participantId` | `string` | Yes | Non-empty; must be an existing participant in the room |
| `guess` | `string` | Yes | Non-empty after trim; max 50 chars |

```json
POST /rooms/ABC123/guess
Content-Type: application/json

{ "participantId": "uuid-of-guesser", "guess": "  Pizza  " }
```

**Server processing**:
1. Trim the `guess` value: `"  Pizza  "` → `"pizza"` (trim + lowercase).
2. Reject if trimmed value is empty → `400`.
3. Reject if `participantId === room.hostId` (drawer cannot guess) → `403`.
4. Compare `trimmedGuess === secretWord.toLowerCase()` (both already lowercased after step 1).
5. Append `Guess` record to `room.guesses`.
6. If correct: increment `room.scores[participantId]` by `100`.
7. Update `room.updatedAt`.
8. Return updated `RoomSnapshot` for the submitting participant.

**Success response** `200 OK`

```json
{
  "room": {
    "code": "ABC123",
    "status": "active",
    "hostId": "uuid-of-drawer",
    "participants": [...],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "guesses": [
      {
        "participantId": "uuid-of-guesser",
        "playerName": "Bob",
        "text": "pizza",
        "correct": true,
        "submittedAt": "2026-06-19T12:00:00.000Z"
      }
    ],
    "scores": {
      "uuid-of-drawer": 0,
      "uuid-of-guesser": 100
    }
  }
}
```

**Error responses**

| Status | `message` | Condition |
|--------|-----------|-----------|
| `400` | `"Guess cannot be empty"` | `guess.trim() === ""` |
| `400` | `"Room is not active"` | `room.status !== "active"` |
| `403` | `"Drawer cannot submit a guess"` | `participantId === room.hostId` |
| `404` | `"Participant not found"` | `participantId` not in `room.participants` |
| `404` | `"Room not found"` | Unknown `code` |
| `422` | Zod validation message | Missing/invalid fields |

---

## GET /rooms/:code — updated polling response

The response now includes `guesses` and `scores` on every poll. No change to request shape.

**Drawer poll** (Alice, `participantId === hostId`):
```json
{
  "room": {
    "status": "active",
    "secretWord": "rocket",
    "guesses": [
      { "participantId": "uuid-of-bob", "playerName": "Bob", "text": "pizza", "correct": false, "submittedAt": "..." }
    ],
    "scores": { "uuid-of-alice": 0, "uuid-of-bob": 0 }
  }
}
```

**Guesser poll** (Bob, `participantId !== hostId`):
```json
{
  "room": {
    "status": "active",
    "guesses": [
      { "participantId": "uuid-of-bob", "playerName": "Bob", "text": "pizza", "correct": false, "submittedAt": "..." }
    ],
    "scores": { "uuid-of-alice": 0, "uuid-of-bob": 0 }
  }
}
```

Both viewers receive the **same** `guesses` and `scores` — no filtering.
