# API Contracts: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-19
**Base URL**: `http://localhost:3001` (dev)

All requests and responses use `Content-Type: application/json`.
Error responses always include `{ "message": "<human-readable string>" }`.

---

## Endpoints

### POST /rooms

Create a new room. The requesting player becomes the host.

**Request body**:
```json
{
  "playerName": "Sketch captain"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `playerName` | string | Yes | 1–20 chars, whitespace-trimmed |

**Success response** — `201 Created`:
```json
{
  "participantId": "uuid-v4",
  "room": {
    "code": "A3FX9K",
    "status": "lobby",
    "hostId": "uuid-v4",
    "participants": [
      { "id": "uuid-v4", "name": "Sketch captain", "joinedAt": "2026-06-19T10:00:00.000Z" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

**Error responses**:

| Status | Condition | Message |
|--------|-----------|---------|
| 400 | Validation failure (missing/empty/too-long name) | `"Invalid request payload"` |

---

### POST /rooms/:code/join

Join an existing room as a non-host participant.

**Path parameter**: `code` — 6 uppercase alphanumeric chars (client normalizes to uppercase before sending)

**Request body**:
```json
{
  "playerName": "Second pencil"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `playerName` | string | Yes | 1–20 chars, whitespace-trimmed |

**Success response** — `200 OK`:
```json
{
  "participantId": "uuid-v4",
  "room": {
    "code": "A3FX9K",
    "status": "lobby",
    "hostId": "uuid-v4-of-host",
    "participants": [
      { "id": "uuid-v4-of-host", "name": "Sketch captain", "joinedAt": "..." },
      { "id": "uuid-v4", "name": "Second pencil", "joinedAt": "..." }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

**Error responses**:

| Status | Condition | Message |
|--------|-----------|---------|
| 400 | Validation failure (missing/empty/too-long name) | `"Invalid request payload"` |
| 404 | Room code not found | `"Unable to join room"` |

---

### GET /rooms/:code?participantId=:pid

Fetch the current room snapshot. Used by lobby polling.

**Path parameter**: `code` — 6 uppercase alphanumeric chars
**Query parameter**: `participantId` (optional) — stored participant ID

**Success response** — `200 OK`:
```json
{
  "room": {
    "code": "A3FX9K",
    "status": "lobby",
    "hostId": "uuid-v4-of-host",
    "participants": [...],
    "availableWords": [...],
    "roles": [...]
  }
}
```

**Error responses**:

| Status | Condition | Message |
|--------|-----------|---------|
| 404 | Room code not found | `"Unable to load room"` |

---

### POST /rooms/:code/start

Start the game. Host-only. Transitions room status from `"lobby"` to `"active"`.

**Path parameter**: `code` — 6 uppercase alphanumeric chars

**Request body**:
```json
{
  "participantId": "uuid-v4-of-caller"
}
```

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| `participantId` | string | Yes | Must match `room.hostId` |

**Success response** — `200 OK`:
```json
{
  "room": {
    "code": "A3FX9K",
    "status": "active",
    "hostId": "uuid-v4-of-host",
    "participants": [...],
    "availableWords": [...],
    "roles": [...]
  }
}
```

**Error responses**:

| Status | Condition | Message |
|--------|-----------|---------|
| 400 | Fewer than 2 participants | `"At least 2 players are required to start"` |
| 400 | Room already active | `"Room is already active"` |
| 400 | Missing participantId | `"Invalid request payload"` |
| 403 | Caller is not the host | `"Only the host can start the game"` |
| 404 | Room not found | `"Room not found"` |

---

## Client Behaviour Notes

- **Name validation**: The frontend MUST validate name (non-empty, ≤20 chars, non-whitespace-only) before submitting any request. A `form__error` message must be displayed inline; no request is sent.
- **Room code normalisation**: The JoinRoomPage already normalises input to uppercase (`toUpperCase()`) — the API also normalises via `.toUpperCase()` on the path param.
- **Lobby polling**: The `LobbyPage` sets up a `setInterval(2000)` to call `GET /rooms/:code`. On `status === "active"`, all clients navigate to `/game`. Poll failures are silently ignored.
- **Host detection**: Compare stored `participantId` with `room.hostId` from snapshot. If equal, show "Start Game" button (conditionally enabled when `participants.length >= 2`).
