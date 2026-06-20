# API Contracts: Result, Restart & Final Validation

All existing endpoints remain unchanged. This feature adds one new endpoint and modifies the response shape of existing room-state endpoints.

---

## Modified: Room Snapshot shape

Every endpoint that returns `{ room: RoomSnapshot }` now includes two new optional fields:

```typescript
interface RoomSnapshot {
  // ...all existing fields unchanged...
  status: "lobby" | "active" | "result";  // "result" is new
  currentWord?: string;   // present only when status === "result"
}
```

**Affected endpoints** (response shape change only, no request changes):
- `GET /rooms/:code`
- `POST /rooms/:code/join`
- `POST /rooms/:code/start`
- `POST /rooms/:code/guess`
- `POST /rooms/:code/restart` (new, see below)

---

## New: POST /rooms/:code/restart

Transitions a room from `"result"` back to `"lobby"`, preserving all participants and clearing all round state.

### Request

```
POST /rooms/:code/restart
Content-Type: application/json
```

| Parameter | Location | Type | Required | Notes |
|---|---|---|---|---|
| `code` | path | string | yes | Room code (case-insensitive, normalized to uppercase) |
| `participantId` | body | string (UUID) | yes | Must be the host's participant ID |

```json
{
  "participantId": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
}
```

### Response 200 OK

```json
{
  "room": {
    "code": "ABC123",
    "status": "lobby",
    "hostId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "participants": [
      { "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "name": "Alice", "joinedAt": "..." },
      { "id": "a1b2c3d4-...", "name": "Bob", "joinedAt": "..." }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"],
    "guesses": [],
    "scores": {}
  }
}
```

### Error responses

| Status | Condition |
|---|---|
| `400 Bad Request` | Room is not in "result" state |
| `403 Forbidden` | `participantId` is not the host |
| `404 Not Found` | Room code does not exist |

```json
{ "message": "Only the host can restart the game" }
```

### State changes on success

| Field | Before | After |
|---|---|---|
| `status` | `"result"` | `"lobby"` |
| `currentWord` | non-empty string | `""` (cleared) |
| `guesses` | full history | `[]` |
| `scores` | `{ id: number, ... }` | `{}` |
| `participants` | preserved | preserved (unchanged) |
| `hostId` | preserved | preserved (unchanged) |

---

## Modified: POST /rooms/:code/guess — round-end side effect

No request or response contract change. However, the response may now carry `status: "result"` and `currentWord` when the submitted guess causes all guessers to have guessed correctly:

```json
{
  "room": {
    "status": "result",
    "currentWord": "rocket",
    "guesses": [...],
    "scores": { "hostId": 0, "guesser1Id": 100 }
  }
}
```

Clients should treat `status === "result"` in any poll or mutation response as a signal to navigate to the result screen.

---

## Zod schema additions (backend: `backend/src/api/schemas.ts`)

```typescript
export const restartRoomSchema = z.object({
  participantId: z.string().min(1)
});
```
