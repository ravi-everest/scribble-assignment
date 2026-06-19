# Data Model: Game Start & Drawer Flow

**Feature**: `002-game-start-drawer`
**Date**: 2026-06-19

## Entity: Room (unchanged)

Defined in `backend/src/models/game.ts`. No structural changes for this scenario.

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | 6-char uppercase room code |
| `status` | `"lobby" \| "active"` | `"active"` set by `startRoom()` |
| `hostId` | `string` | UUID of the room creator; also drawer for round 1 |
| `participants` | `Participant[]` | Ordered by join time; index 0 is the host |
| `createdAt` | `string` | ISO timestamp |
| `updatedAt` | `string` | ISO timestamp; updated on every mutation |

## Entity: Participant (unchanged)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID |
| `name` | `string` | 1–20 chars, trimmed, non-empty |
| `joinedAt` | `string` | ISO timestamp |

## Entity: RoomSnapshot (extended)

`RoomSnapshot` is the read-only projection sent to clients. This scenario adds `secretWord`.

| Field | Type | Notes |
|-------|------|-------|
| `code` | `string` | Room code |
| `status` | `"lobby" \| "active"` | Current room status |
| `hostId` | `string` | Identifies the drawer for round 1 |
| `participants` | `Participant[]` | All participants (no filtering) |
| `availableWords` | `string[]` | Full seed list — always present |
| `roles` | `ParticipantRole[]` | `["drawer", "guesser"]` — always present |
| `secretWord` | `string \| undefined` | **New.** Present only when `status === "active"` and the requesting `participantId` is the drawer. Absent for guessers and during lobby. |

### secretWord population rules

```
if status !== "active"         → secretWord = undefined
if viewerParticipantId is absent → secretWord = undefined  (e.g. unauthenticated poll)
if viewerParticipantId === room.hostId → secretWord = STARTER_WORDS[0]  ("rocket")
otherwise                      → secretWord = undefined  (guesser)
```

## Conceptual: Round (not persisted)

Round state is derived from `Room` on every snapshot request. No separate entity is stored.

| Derived field | Derivation |
|--------------|-----------|
| `drawerParticipantId` | `room.hostId` (round 1 only) |
| `secretWord` | `STARTER_WORDS[0]` = `"rocket"` (round 1 only) |
| `roundNumber` | Always `1` (only one round in scope) |

## SessionStorage (frontend only)

| Key | Value | Written by | Read by |
|-----|-------|-----------|--------|
| `participantId` | UUID string | `RoomStore.setRoomSession()` | `GamePage` on mount |

## State Transitions

```
Room.status:
  "lobby"  ──[POST /rooms/:code/start by host with ≥2 players]──▶  "active"
```

No further transitions in scope (no "finished" or "cancelled" state for this scenario).
