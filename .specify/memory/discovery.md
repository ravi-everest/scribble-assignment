# Discovery Notes

**Date**: 2026-06-18
**Branch**: ravi/assignment

---

## Relevant Files Inspected

| File | Purpose |
|---|---|
| `backend/src/models/game.ts` | Core type definitions: `Room`, `Participant`, `RoomSnapshot`, `RoomStatus` |
| `backend/src/services/roomStore.ts` | In-memory room CRUD, code generation, `toRoomSnapshot` |
| `backend/src/api/rooms.ts` | REST handlers: POST `/rooms`, POST `/rooms/:code/join`, GET `/rooms/:code` |
| `backend/src/api/schemas.ts` | Zod validation schemas + `HttpError` |
| `backend/src/seed/starterData.ts` | Seed words and roles |
| `backend/src/app.ts` | Express app setup, CORS, error handler |
| `frontend/src/services/api.ts` | Typed fetch client wrapping all three backend endpoints |
| `frontend/src/state/roomStore.ts` | `RoomStore` class (external store pattern) + React context/hooks |
| `frontend/src/pages/LobbyPage.tsx` | Lobby UI — manual refresh button, participant list |
| `frontend/src/pages/GamePage.tsx` | Game layout shell — canvas placeholder, GuessForm, Scoreboard, ResultPanel |
| `frontend/src/pages/CreateRoomPage.tsx` | Player name input + create room form |
| `frontend/src/pages/JoinRoomPage.tsx` | Player name + room code form |
| `frontend/src/components/GuessForm.tsx` | Form with input and submit — submit handler is a no-op |
| `frontend/src/components/Scoreboard.tsx` | Static placeholder: "Waiting for players... 0" |
| `frontend/src/components/ResultPanel.tsx` | Static placeholder: "Game activity and guesses will appear here" |
| `frontend/src/routes/index.tsx` | React Router routes: `/`, `/create-room`, `/join-room`, `/lobby`, `/game` |

---

## Behavioral Gaps

### Gap 1 — No host concept on the backend
`Room` has no `hostId` field. The backend has no way to identify who the host is.
The first participant (index 0 in `room.participants`) is implicitly the creator, but
there is no field that records this, and `toRoomSnapshot` does not expose it.
Nothing prevents a non-host from starting the game.

**Affected files**: `backend/src/models/game.ts`, `backend/src/services/roomStore.ts`,
`backend/src/api/rooms.ts`

### Gap 2 — Lobby polling is not implemented
`LobbyPage` has a manual "Refresh Room" button but no `setInterval` / `useInterval`
polling. `roomStore.fetchRoom()` exists and works, but is never called automatically.
The ~2s polling required by the spec is entirely absent.

**Affected files**: `frontend/src/pages/LobbyPage.tsx`

### Gap 3 — Game state does not exist
`RoomStatus` is typed as the literal `"lobby"` only — there is no `"playing"` or
`"finished"` status. The backend has no start-game endpoint, no drawer assignment,
no secret word selection, no guess storage, no scoring, and no result state.
`GuessForm.handleSubmit` is a no-op. `Scoreboard` and `ResultPanel` are static
placeholder JSX.

**Affected files**: `backend/src/models/game.ts`, `backend/src/services/roomStore.ts`,
`backend/src/api/rooms.ts`, `frontend/src/components/GuessForm.tsx`,
`frontend/src/components/Scoreboard.tsx`, `frontend/src/components/ResultPanel.tsx`

### Gap 4 — No drawing canvas
`GamePage` renders a `<div>` with "Waiting for drawer..." where the canvas should be.
There is no `<canvas>` element, no drawing event handlers, no clear-canvas action,
and no mechanism to broadcast strokes to other players (even via polling).

**Affected files**: `frontend/src/pages/GamePage.tsx`

### Gap 5 — Player name is not validated
`createRoomSchema` and `joinRoomSchema` mark `playerName` as `optional()`. The
`displayName` helper falls back to `"Player"` when the name is absent or empty.
The spec requires rejecting empty/whitespace-only names with a clear error message;
that check does not exist on either the backend or frontend.

**Affected files**: `backend/src/api/schemas.ts`, `backend/src/services/roomStore.ts`,
`frontend/src/pages/CreateRoomPage.tsx`, `frontend/src/pages/JoinRoomPage.tsx`

### Gap 6 — Start Game button is unrestricted
`LobbyPage` shows a "Start Game" button that navigates directly to `/game` for
every participant. There is no host-only check, no minimum-player check (≥2), and
no backend start-game trigger — it is purely a client-side navigate call.

**Affected files**: `frontend/src/pages/LobbyPage.tsx`

### Gap 7 — `toRoomSnapshot` ignores `viewerParticipantId`
The function signature accepts `viewerParticipantId` but immediately voids it
(`void viewerParticipantId`). This means the API cannot currently return
viewer-specific data (e.g., the secret word for the drawer only).

**Affected files**: `backend/src/services/roomStore.ts`

### Gap 8 — No restart flow
There is no endpoint or frontend flow to return all players to the lobby after a
round ends, preserving the participant list while clearing round state.

**Affected files**: backend and frontend (nothing exists yet)

---

## Assumptions

### Assumption 1 — First participant is the host for the entire session
The spec says "the creator is automatically the host." Since there is no `hostId`
field, I assume host identity is defined as `participants[0].id` at room-creation
time and must be stored explicitly on `Room` so the backend can enforce host-only
actions (start game, restart) and the frontend can show/hide the Start Game button.

### Assumption 2 — Word selection is index-based, not random
The spec says "deterministically selected from the starter list." I assume this
means `STARTER_WORDS[round % STARTER_WORDS.length]`, using the round number as the
deterministic selector so the same word is always chosen for the same round across
all clients polling the same room snapshot.

### Assumption 3 — Canvas strokes are synced via polling, not push
Since WebSockets are out of scope, drawing data must be stored on the backend per
room and returned in the room snapshot. I assume stroke data is an append-only array
of drawing commands (e.g., `{ x, y, type: 'move' | 'line' | 'clear' }`) stored on
the `Room` and included in `RoomSnapshot` for all players to re-render on each poll.

### Assumption 4 — Guess history is stored on the backend per room
The spec requires "synced guess history via polling." I assume guesses are stored
as an array on the `Room` (e.g., `guesses: Guess[]`) and returned in `RoomSnapshot`
so all pollers receive the same list. The frontend re-renders the full list on each
poll tick rather than appending incrementally.

### Assumption 5 — A single round per game session
The spec is scoped to one round. "Restart" means clearing all round state (drawer,
word, guesses, scores, strokes, result) and returning `status` to `"lobby"` while
preserving `participants`. No multi-round rotation or timer is required.

---

## Key Observations (Non-Gaps)

- The `RoomStore` class on the frontend uses `useSyncExternalStore` — the pattern is
  correct and well-suited to adding polling via a `startPolling/stopPolling` method.
- The `saveRoom` utility in `roomStore.ts` is already wired up and can be used for
  all mutation endpoints (start game, submit guess, restart) without redesign.
- The backend error handler and `HttpError` class are already in place — new
  endpoints only need to `throw new HttpError(status, message)`.
- `toRoomSnapshot` is the right chokepoint to implement viewer-specific data (secret
  word for drawer). Only that function needs changing, not the route handlers.
- The Zod schemas are clean and easy to extend for new request bodies.
