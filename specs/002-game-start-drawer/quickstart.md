# Quickstart Validation Guide: Game Start & Drawer Flow

**Feature**: `002-game-start-drawer`
**Date**: 2026-06-19

## Prerequisites

- Node.js 20 installed (`node --version`)
- Dependencies installed in both directories:
  ```
  cd backend && npm install
  cd frontend && npm install
  ```
- Both builds pass before testing:
  ```
  cd backend && npm run build
  cd frontend && npm run build
  ```

## Starting the app

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Frontend: `http://localhost:5173` | Backend: `http://localhost:3001`

---

## Scenario 1 — Lobby-to-Game transition (FR-001, SC-001)

**Setup**: Open two browser tabs (Tab A = host, Tab B = joiner).

1. Tab A → Create Room → enter name "Alice" → submit.
2. Copy the 6-char room code.
3. Tab B → Join Room → enter code + name "Bob" → submit.
4. Both tabs should be on `/lobby`.

**Trigger**: Tab A (host) clicks **Start Game**.

**Expected within ~2 seconds**:
- Tab A URL changes to `/game?room=<CODE>`.
- Tab B URL changes to `/game?room=<CODE>`.
- Both tabs show the game screen (no redirect to `/`).

**Validates**: SC-001, FR-001.

---

## Scenario 2 — Drawer sees the secret word (FR-004, FR-005, SC-003)

Continuing from Scenario 1.

1. Tab A (Alice = host = drawer): confirm a secret word is displayed prominently.
   - Expected word: **"rocket"**.
   - Expected label: role indicator showing drawer status (e.g. "You are the drawer").
2. Tab B (Bob = guesser): confirm the secret word is **not** visible anywhere.
   - The word "rocket" must not appear in the DOM.

**Validates**: FR-004, FR-005, FR-006, SC-003, SC-004.

---

## Scenario 3 — Role labels (FR-007, SC-005)

Continuing from Scenario 1.

1. Tab A: locate the role indicator — must say something equivalent to "You are the drawer" or "Drawer".
2. Tab B: locate the role indicator — must say something equivalent to "You are guessing" or "Guesser".
3. No tab shows the other player's role indicator.

**Validates**: FR-007, SC-005.

---

## Scenario 4 — Host-only Start Game (FR-001a)

1. Open two tabs, create room + join as above.
2. Tab B (Bob, non-host): verify no "Start Game" button is visible.
3. Tab A: verify "Start Game" button is present but disabled when only 1 player is present (before Bob joins).

**Validates**: FR-001a, FR-001b.

---

## Scenario 5 — Minimum player enforcement (FR-001b)

1. Tab A → Create Room → enter name "Alice".
2. Do **not** open a second tab.
3. Tab A (lobby with 1 player): "Start Game" button must be disabled or absent.

**Validates**: FR-001b.

---

## Scenario 6 — Direct navigation guard (FR-008)

1. Open a fresh browser tab (no prior session).
2. Navigate directly to `http://localhost:5173/game?room=ABC123`.
3. Expected: immediate redirect to `/` (home screen).

Also test with a valid room code but no `participantId` in `sessionStorage` — same redirect expected.

**Validates**: FR-008.

---

## Scenario 7 — Page refresh on game screen (research Gap 3)

1. Complete Scenario 1 (both tabs on `/game`).
2. Refresh Tab A.
3. Expected: Tab A reloads the game screen with the same role (drawer) and secret word visible — no redirect to `/`.

**Validates**: `sessionStorage` persistence + restore flow.

---

## API smoke tests (optional curl)

```bash
# Create room
curl -s -X POST http://localhost:3001/rooms \
  -H 'Content-Type: application/json' \
  -d '{"playerName":"Alice"}' | jq .

# Join (replace CODE and PARTICIPANT_ID from above)
curl -s -X POST http://localhost:3001/rooms/CODE/join \
  -H 'Content-Type: application/json' \
  -d '{"playerName":"Bob"}' | jq .

# Start game (replace CODE and HOST_PARTICIPANT_ID)
curl -s -X POST http://localhost:3001/rooms/CODE/start \
  -H 'Content-Type: application/json' \
  -d '{"participantId":"HOST_PARTICIPANT_ID"}' | jq .

# Poll as drawer — secretWord should be "rocket"
curl -s "http://localhost:3001/rooms/CODE?participantId=HOST_PARTICIPANT_ID" | jq .room.secretWord

# Poll as guesser — secretWord should be absent (null/undefined)
curl -s "http://localhost:3001/rooms/CODE?participantId=BOB_PARTICIPANT_ID" | jq .room.secretWord
```
