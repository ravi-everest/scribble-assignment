# Data Model: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-19

---

## Entities

### Room

Represents an active game session container held in server memory.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `code` | `string` | 6 uppercase alphanumeric chars, unique among active rooms | e.g., `"A3FX9K"`. Generated from 32-char unambiguous alphabet (no 0/O/1/I/L). |
| `status` | `"lobby" \| "active"` | Required | `"lobby"` on creation; transitions to `"active"` when host starts the game. |
| `hostId` | `string` | UUID, references first participant's `id` | Set at room creation, immutable. |
| `participants` | `Participant[]` | Ordered by join time (index 0 = host) | At least 1 on creation. |
| `createdAt` | `string` | ISO 8601 timestamp | Set at creation. |
| `updatedAt` | `string` | ISO 8601 timestamp | Updated on any mutation. |

**State transitions**:
```
lobby → active   (triggered by POST /rooms/:code/start, host only, ≥2 participants)
```
No transition back — a room stays `"active"` once started. Restart requires a new room.

---

### Participant

A player connected to a room.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| `id` | `string` | UUID, unique within a room | Generated server-side at join/create time. |
| `name` | `string` | 1–20 chars, whitespace-trimmed, required | Whitespace-only rejected as empty. Duplicate names allowed across participants. |
| `joinedAt` | `string` | ISO 8601 timestamp | Set at join time. |

**Identity rules**:
- `id` is the authoritative player identity; names are display-only.
- Names are not unique-enforced; two participants may share a name.
- The first participant in `room.participants` is always the host (their `id` matches `room.hostId`).

---

### RoomSnapshot (API response shape)

Read-only projection returned by all room endpoints. Adds `hostId` to the existing shape.

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | Room code |
| `status` | `"lobby" \| "active"` | Current room phase |
| `hostId` | `string` | Participant ID of the host |
| `participants` | `Participant[]` | All connected participants |
| `availableWords` | `string[]` | Seeded word list (passthrough from starter) |
| `roles` | `ParticipantRole[]` | Role list (passthrough from starter) |

---

## Validation Rules

| Rule | Applies to | Detail |
|------|------------|--------|
| Name required | Create & Join | `playerName` must be present and non-empty after trimming |
| Name length | Create & Join | 1–20 characters after trimming |
| Whitespace-only name | Create & Join | Treated as empty; rejected with validation error |
| Code format | Join | Must match 6 uppercase alphanumeric chars pattern |
| Room exists | Join, GET, Start | 404 if no room with that code |
| Host-only start | Start | `participantId` in request body must equal `room.hostId`; 403 otherwise |
| Minimum players | Start | `room.participants.length >= 2`; 400 otherwise |
| Room status | Start | Only `"lobby"` rooms can be started; 400 if already `"active"` |

---

## Relationships

```
Room 1 ──── N Participant
Room.hostId ──── Participant.id  (first participant)
```

No foreign keys or persistent storage — all state is in-memory in the `Map<string, Room>` store.
