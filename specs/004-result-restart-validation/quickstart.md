# Quickstart Validation Guide: Result, Restart & Final Validation

## Prerequisites

- Node.js installed
- Backend running: `cd backend && npm run dev` (default port 3001)
- Frontend running: `cd frontend && npm run dev` (default port 5173)
- Two browser tabs open (Tab A = host, Tab B = guesser)

---

## Scenario 1 — View Round Results (FR-001 through FR-004, SC-001, SC-005)

### Setup

1. **Tab A**: Create a room with player name "Alice".
2. **Tab B**: Join the same room with player name "Bob".
3. **Tab A**: Click "Start Game". Both tabs navigate to `/game?room=XXXXXX`.

### Trigger round end

4. **Tab B**: Submit the correct guess "rocket" in the Guess form.

### Expected outcome (within 2 seconds of guess submission)

- Both Tab A and Tab B automatically navigate to `/result?room=XXXXXX`.
- Both tabs display:
  - **Correct word**: "rocket"
  - **Scores**: Alice 0 pts (drawer), Bob 100 pts — Bob listed first (highest score)
  - **Guess history**: one entry — Bob: "rocket" ✓
- Neither tab shows the drawing canvas or guess form.

### Verify empty-guess edge case

Repeat the above but do **not** submit any guesses before ending the round (if a timer-free end is available, or submit a correct guess immediately). If no guesses were submitted before the winning guess, the history shows only the correct guess entry.

---

## Scenario 2 — Host Restarts (FR-005 through FR-010, SC-002 through SC-004)

Continuing from Scenario 1 (both tabs on result screen):

### Host control

5. **Tab B**: Confirm no "Restart" button is visible or it is disabled for non-host players.

### Restart

6. **Tab A** (host): Click "Restart".

### Expected outcome (within 2 seconds)

- Both Tab A and Tab B navigate to `/lobby`.
- Lobby shows Alice (Host) and Bob in the participant list — both players preserved.
- No scores, no guess history, no word visible anywhere on the lobby screen.
- **Tab A** sees "Start Game" button (enabled once 2+ players present).
- **Tab B** sees "Waiting for the host to start the game."

### Verify fresh-round readiness

7. **Tab A**: Click "Start Game" again. Both tabs navigate to `/game?room=XXXXXX`.
8. Confirm scores are `0` for both players — no residual score from the previous round.
9. Confirm guess history is empty.

---

## Scenario 3 — Consistent State Across Clients (SC-001, SC-002, US3)

1. Open a **third tab** (Tab C) and join the room as "Carol" before starting the game.
2. Complete a round (Bob guesses correctly).
3. Verify all three tabs (A, B, C) show the result screen with the same word, scores, and guess history within approximately 2 seconds.
4. Host restarts — verify all three tabs transition to lobby within approximately 2 seconds.

---

## Scenario 4 — Late Joiner During Result State (Edge Case, FR edge)

1. End a round (reach "result" state) with two players.
2. Open a **new tab** and navigate directly to `/game?room=XXXXXX` (or attempt to join via `/join-room` with the room code).
3. The player should see the result screen (room is in "result" state, not the game canvas).

---

## Scenario 5 — Rejoin After Tab Close (US3 AC3)

1. End a round (result state active).
2. **Tab B**: Close the tab.
3. **Re-open Tab B**: Navigate to `http://localhost:5173/result?room=XXXXXX` (or the app restores session automatically).
4. Tab B should show the same result screen — correct word, scores, full guess history.

---

## API spot-check (optional, curl)

```bash
# After a round ends — verify status is "result" and currentWord is populated
curl "http://localhost:3001/rooms/XXXXXX?participantId=<hostId>"
# Expect: { "room": { "status": "result", "currentWord": "rocket", ... } }

# Restart
curl -X POST http://localhost:3001/rooms/XXXXXX/restart \
  -H "Content-Type: application/json" \
  -d '{"participantId": "<hostId>"}'
# Expect: { "room": { "status": "lobby", "guesses": [], "scores": {}, ... } }

# Non-host restart attempt
curl -X POST http://localhost:3001/rooms/XXXXXX/restart \
  -H "Content-Type: application/json" \
  -d '{"participantId": "<guesserParticipantId>"}'
# Expect: 403 { "message": "Only the host can restart the game" }
```

---

## Build verification

```bash
cd backend && npm run build   # must pass with 0 errors
cd frontend && npm run build  # must pass with 0 errors
```

Both builds must be clean before any commit.
