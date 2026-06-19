# API Contracts: Game Start & Drawer Flow

**Feature**: `002-game-start-drawer`
**Date**: 2026-06-19

All endpoints are prefixed with `/rooms`. Base URL: `http://localhost:3001` (dev).

---

## Existing endpoints (no contract change)

### POST /rooms
### POST /rooms/:code/join
### GET /rooms/:code

These three endpoints are unchanged from Scenario 1. Their contracts are in `specs/001-room-setup-lobby/contracts/api.md`.

**Note on GET /rooms/:code**: The response shape adds `secretWord` to `RoomSnapshot` (see below). The field is optional — existing consumers that do not inspect it are unaffected.

---

## Modified: RoomSnapshot shape

```typescript
interface RoomSnapshot {
  code: string;
  status: "lobby" | "active";
  hostId: string;
  participants: Array<{ id: string; name: string; joinedAt: string }>;
  availableWords: string[];        // unchanged — full seed list
  roles: ("drawer" | "guesser")[]; // unchanged
  secretWord?: string;             // NEW — see population rules below
}
```

**`secretWord` population rules (server-enforced)**:
- `undefined` when `status !== "active"`
- `undefined` when `participantId` query param is absent
- `undefined` when `participantId` does not match `room.hostId` (guesser)
- `"rocket"` (= `STARTER_WORDS[0]`) when `participantId === room.hostId` and `status === "active"`

---

## POST /rooms/:code/start (no change to signature)

**Already implemented in Scenario 1. Contract reproduced here for completeness.**

**Purpose**: Transition room from `"lobby"` to `"active"`.

**Request**

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `participantId` | `string` | Yes | Must be non-empty |

```json
POST /rooms/ABC123/start
Content-Type: application/json

{ "participantId": "uuid-of-host" }
```

**Success response** `200 OK`

```json
{
  "room": {
    "code": "ABC123",
    "status": "active",
    "hostId": "uuid-of-host",
    "participants": [
      { "id": "uuid-of-host", "name": "Alice", "joinedAt": "2026-06-19T..." },
      { "id": "uuid-of-p2",   "name": "Bob",   "joinedAt": "2026-06-19T..." }
    ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "secretWord": "rocket"
  }
}
```

Note: `secretWord` appears here because the host (who called `/start`) is the drawer.
A poll by the guesser immediately after would return the same room **without** `secretWord`.

**Error responses**

| Status | `message` | Condition |
|--------|-----------|-----------|
| `400` | `"At least 2 players are required to start"` | `participants.length < 2` |
| `400` | `"Room is already active"` | `status === "active"` |
| `403` | `"Only the host can start the game"` | `participantId !== hostId` |
| `404` | `"Room not found"` | Unknown `code` |
| `422` | Zod validation message | Missing/invalid `participantId` |

---

## GET /rooms/:code — updated polling behaviour

**Query parameters**

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `participantId` | `string` | No (but required for `secretWord`) | UUID of the requesting participant |

**Role-differentiated responses** (same endpoint, viewer-filtered output):

*Drawer poll* (Alice, `participantId === hostId`):
```json
{
  "room": { "status": "active", "secretWord": "rocket", ... }
}
```

*Guesser poll* (Bob, `participantId !== hostId`):
```json
{
  "room": { "status": "active", ... }
}
```
`secretWord` is absent from Bob's response.

*Lobby poll* (any participant, before game start):
```json
{
  "room": { "status": "lobby", ... }
}
```
`secretWord` is absent.
