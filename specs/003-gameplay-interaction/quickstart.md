# Quickstart Validation Guide: Gameplay Interaction

**Feature**: `003-gameplay-interaction`
**Date**: 2026-06-19

This guide describes how to manually validate the gameplay interaction feature end-to-end. It covers prerequisites, how to start the system, and the exact scenarios to exercise.

## Prerequisites

- Node.js 20+ installed
- Two browser tabs (or two windows) available
- Backend and frontend both running (see Setup below)

## Setup

From the repo root, start both servers:

```bash
# Terminal 1 — backend
cd backend && npm install && npm run dev

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
```

Frontend: `http://localhost:5173`  
Backend: `http://localhost:3001`

Confirm the backend is up: `curl http://localhost:3001/rooms` should return a 404 or empty body (not a connection error).

## Roles

Throughout these scenarios:
- **Tab A** = host (Alice) — this tab becomes the **drawer**
- **Tab B** = guesser (Bob)

The secret word is always `"rocket"` (= `STARTER_WORDS[0]`).

---

## Scenario V1 — Drawer sees own canvas

**Tab A** (Alice, host):
1. Create a room → Start the game (at least 2 players needed — do Tab B join first).
2. Confirm `"You are the drawer"` and `"Secret word: rocket"` are shown.
3. Draw strokes on the canvas.

**Expected**: Strokes appear on the canvas in real time in Tab A. No page refresh required.

4. Click "Clear".

**Expected**: Canvas resets to blank immediately.

---

## Scenario V2 — Guesser submits an empty guess (rejected)

**Tab B** (Bob, guesser):
1. Leave the guess input blank.
2. Click "Submit Guess".

**Expected**: No submission occurs. The guess input remains empty. No entry appears in the guess history.

Repeat with whitespace-only input (`"   "`):

**Expected**: Same — submission is blocked before it reaches the server.

---

## Scenario V3 — Guesser submits an incorrect guess

**Tab B** (Bob):
1. Type `"pizza"` in the guess input.
2. Click "Submit Guess".

**Expected**:
- Guess input clears after submission.
- The guess history (Activity panel) shows: `Bob: pizza ✗` (or equivalent incorrect indicator).
- Bob's score in the Scoreboard shows `0`.

---

## Scenario V4 — Guesser submits a correct guess (case-insensitive)

**Tab B** (Bob):
1. Type `"  ROCKET  "` (padded, uppercase).
2. Click "Submit Guess".

**Expected**:
- Guess input clears after submission.
- The guess history shows: `Bob: rocket ✓` (stored as post-trim lowercase).
- Bob's score in the Scoreboard shows `100`.
- **Tab A** (drawer) sees the same guess history and scoreboard within the next poll cycle (~2 seconds).

---

## Scenario V5 — Guess history synced to all players

After Scenario V4:

**Tab A** (Alice, drawer — poll within 2 seconds):

**Expected**:
- Activity panel shows Bob's correct guess entry.
- Scoreboard shows `Alice: 0`, `Bob: 100`.

**Tab B** (Bob, guesser):

**Expected**: Same scoreboard and activity panel as Tab A.

---

## Scenario V6 — Drawer cannot submit a guess

**Tab A** (Alice, drawer):
1. Attempt to access the guess form.

**Expected**: The guess input and submit button are disabled (or absent) for the drawer. No guess endpoint call is made.

---

## Scenario V7 — Multiple correct guesses accumulate score

**Tab B** (Bob):
1. Submit `"rocket"` (correct) → score becomes `100`.
2. Submit `"rocket"` again (correct) → score becomes `200`.

**Expected**: Each correct submission adds exactly `100` points. No deduplication.

---

## Automated test coverage

Run unit tests for the pure game-logic functions:

```bash
cd backend && npm test
cd frontend && npm test
```

Key functions to verify:
- `compareGuess(input, secretWord)` — returns `true` for case-insensitive trimmed match, `false` otherwise, throws or returns `false` for empty input.
- `submitGuess` route handler — verify score increment, empty-guess rejection, drawer-block in integration tests.

See `data-model.md` for entity shapes and `contracts/api.md` for exact request/response formats.
