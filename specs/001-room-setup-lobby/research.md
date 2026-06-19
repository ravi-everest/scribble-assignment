# Research: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-19

---

## Discovery Notes

### Behavioral Gaps Found in Starter (≥3 required per constitution)

1. **No host identity in data model**: `Participant` has `id`, `name`, `joinedAt` — no `isHost` flag. `Room` has no `hostId`. The spec requires the creator to be the host with visual distinction in the lobby player list.

2. **`playerName` is optional, defaults to "Player"**: Both `createRoomSchema` and `joinRoomSchema` use `z.string().optional()`. `displayName()` returns `"Player"` for empty/undefined. Spec FR-011 requires 1–20 chars, required, whitespace-only rejected.

3. **Room code is 4 characters, spec requires 6**: `generateCode()` produces 4 chars. The JoinRoomPage placeholder "ABCD" confirms 4 is the starter's intent. Clarification session locked the spec to 6 uppercase alphanumeric chars.

4. **Lobby polling is manual**: `LobbyPage` only has a manual "Refresh Room" button. No `setInterval` or `useEffect`-based automatic polling. Spec FR-007 requires ~2s automatic polling.

5. **"Start Game" is visible to all players, always enabled**: The `LobbyPage` renders a "Start Game" button for every user with no host check and no minimum player count check. It navigates directly to `/game` without any server call. Spec FR-008/FR-010 require host-only, 2-player minimum, and a server-mediated transition.

6. **No room start endpoint**: No `POST /rooms/:code/start` route exists. With polling-only architecture (per constitution), the game start must change server-side room status so all polling clients detect the transition and navigate autonomously.

### Explicit Assumptions from Discovery

1. The starter's custom 32-char alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, excluding ambiguous 0/O/1/I/L) is intentional and should be preserved — just extend from 4 to 6 chars.
2. `RoomStatus` currently only has `"lobby"`. Adding `"active"` is the minimal extension needed for the start-game transition.
3. The frontend `RoomSnapshot` type in `api.ts` mirrors the backend shape exactly — both must be updated together when `hostId` is added.
4. `RoomStore.fetchRoom()` already handles the GET endpoint correctly; only the polling interval wiring and auto-navigation logic need to be added in `LobbyPage`.

---

## Decisions

### D-001: Room code length → 6 characters

- **Decision**: Change `generateCode()` to produce 6 characters (not 4).
- **Rationale**: Locked by clarification session (Q2: "6 uppercase alphanumeric, server-generated"). The 32-char unambiguous alphabet is kept as-is.
- **Alternatives considered**: Keep 4 chars (rejected — conflicts with spec), use UUID fragment (rejected — too long to type).

### D-002: Host tracking → `hostId` on Room + `RoomSnapshot`

- **Decision**: Add `hostId: string` to the `Room` model, set to the first participant's `id` at room creation. Expose `hostId` in `RoomSnapshot` so the frontend can compare with the stored `participantId`.
- **Rationale**: Minimal change — no new entities, just an additional field on the existing `Room`. Exposes enough for the frontend to gate "Start Game" visibility and host label without adding a separate endpoint.
- **Alternatives considered**: `isHost` boolean on `Participant` (rejected — requires scanning the list; `hostId` on Room is O(1) lookup). Separate `/host` endpoint (rejected — over-engineering for in-memory scope).

### D-003: Display name validation → required, 1–20 chars, whitespace-only rejected

- **Decision**: Update `createRoomSchema` and `joinRoomSchema` to use `z.string().min(1).max(20)` with a `.trim()` + `.min(1)` chain to reject whitespace-only inputs. Remove the `displayName()` fallback in `createParticipant`.
- **Rationale**: Locked by clarification session (Q1: "required, 1–20 chars, whitespace-only treated as empty and rejected"). Both frontend forms already display the `error` state; client-side validation message surfaces immediately before any server call (FR-011).
- **Alternatives considered**: Server-only validation (rejected — FR-011 requires rejection before the request reaches the server for the empty-name case).

### D-004: Lobby polling → `setInterval` in `LobbyPage`, 2000ms, silent retry

- **Decision**: Add a `useEffect` in `LobbyPage` that sets up a 2000ms `setInterval` calling `roomStore.fetchRoom()`. No error is surfaced to the user on poll failure (locked by clarification session Q3). The interval is cleared on component unmount. The manual "Refresh Room" button can be removed since auto-polling supersedes it.
- **Rationale**: `fetchRoom()` is already implemented in `RoomStore` and handles state updates. Only the scheduling wiring is missing.
- **Alternatives considered**: Polling in `RoomStore` (rejected — polling lifecycle is view-concern; store should remain side-effect-free). Keep manual button (rejected — spec requires automatic, not manual).

### D-005: Game start → `POST /rooms/:code/start` + status-based auto-navigation

- **Decision**: Add a `POST /rooms/:code/start` endpoint. Request body: `{ participantId: string }`. Validates: caller is host (403 if not), ≥2 participants (400 if not), room exists (404 if not). On success: sets `room.status` to `"active"`, returns updated `RoomSnapshot`.
  Frontend: "Start Game" button visible only when `participantId === room.hostId` AND `participants.length >= 2`. On click, calls the start endpoint. All players (including non-hosts) detect `status === "active"` on next poll and navigate to `/game` automatically.
- **Rationale**: Polling-only architecture (constitution IV) means cross-client navigation must flow through server state. The host triggers the transition; all others detect it via polling.
- **Alternatives considered**: Frontend-only navigation (rejected — other clients would never transition). WebSocket push (rejected — out of scope per constitution). Client-side shared state (rejected — no shared state mechanism in scope).

### D-006: `RoomStatus` extension → add `"active"`

- **Decision**: Extend `RoomStatus` from `"lobby"` to `"lobby" | "active"`.
- **Rationale**: Minimal addition; `"active"` clearly signals the game has started. The frontend polls for status and auto-navigates when status changes from `"lobby"`.
- **Alternatives considered**: `"in-progress"` (rejected — longer; `"active"` is consistent with common game state conventions). Boolean `started` flag (rejected — less extensible, inconsistent with existing `status` field pattern).
