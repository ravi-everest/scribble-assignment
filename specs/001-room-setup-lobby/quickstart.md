# Quickstart Validation Guide: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-19

This guide describes how to validate the Room Setup & Lobby feature end-to-end once implementation is complete. It covers prerequisites, startup, and the manual two-browser validation scenarios mapped to acceptance criteria.

---

## Prerequisites

- Node.js installed (see `.nvmrc` for version)
- Both `backend/` and `frontend/` dependencies installed (`npm install` in each)
- Both `npm run build` commands pass with no errors before starting validation

---

## Start the Services

In two separate terminals:

```bash
# Terminal 1 — backend
cd backend && npm run dev
# Starts on http://localhost:3001

# Terminal 2 — frontend
cd frontend && npm run dev
# Starts on http://localhost:5173 (or as reported by Vite)
```

Open two browser tabs (Tab A and Tab B) pointing to `http://localhost:5173`.

---

## Validation Scenarios

### S1 — Create a room (US1, FR-001, FR-006, SC-001)

**In Tab A:**
1. On the home screen, click "Create Room"
2. Enter a player name (e.g., "Sketch captain") and submit

**Expected**:
- A 6-character uppercase room code appears in the lobby (e.g., `A3FX9K`)
- "Sketch captain" is listed as a participant and visually marked as host
- No other participants are listed
- The whole flow completes in under 5 seconds

---

### S2 — Join a room (US2, FR-002, SC-002)

**In Tab B (after S1):**
1. On the home screen, click "Join Room"
2. Enter a different player name (e.g., "Second pencil") and the room code from Tab A
3. Submit

**Expected**:
- Both players now appear in the Tab B lobby player list
- Within ~2 seconds, Tab A's lobby player list also shows "Second pencil" (auto-polling)
- "Second pencil" is not marked as host in either tab

---

### S3 — Invalid and empty code rejections (FR-003, FR-004, SC-004)

**In Tab B (fresh join form):**
1. Submit the join form with an empty room code
   - Expected: inline validation error; no network request sent
2. Submit the join form with a made-up code (e.g., `ZZZZZZ`)
   - Expected: visible "Room not found" (or equivalent) error message; player stays on join screen

---

### S4 — Name validation (FR-011)

**In either tab:**
1. Attempt to create or join a room with an empty name field
   - Expected: inline validation error; no request sent
2. Attempt with a whitespace-only name (e.g., `   `)
   - Expected: same inline validation error
3. Attempt with a name exceeding 20 characters
   - Expected: inline validation error

---

### S5 — Auto-polling updates player list (US3, FR-007, SC-003)

**With Tab A in the lobby:**
1. Open Tab B and join the same room
2. Watch Tab A without touching it

**Expected**:
- Tab A's participant list updates to include the new joiner within approximately 2 seconds, with no manual refresh action

---

### S6 — Host-only Start Game, minimum player gate (US4, FR-008, FR-010, SC-005)

**With one player in the lobby (only Tab A):**
1. Observe Tab A's lobby

**Expected**: "Start Game" button is disabled or absent

**Add a second player (Tab B joins):**
2. Observe Tab A after polling updates

**Expected**: "Start Game" button is now active in Tab A

**Observe Tab B:**
3. Check for "Start Game" button in Tab B (the non-host)

**Expected**: No active "Start Game" button visible to Tab B

---

### S7 — Start the game and all clients transition (US4, FR-009)

**With ≥2 players in the lobby:**
1. In Tab A (host), click "Start Game"

**Expected**:
- Tab A navigates to the game view immediately
- Within ~2 seconds, Tab B's lobby polling detects `status === "active"` and Tab B also navigates to the game view — without any action by the Tab B user

---

### S8 — Room isolation (FR-005, SC-006)

1. In Tab A, create Room 1
2. In Tab B, create Room 2 (different player name)
3. In a third tab, join Room 1

**Expected**:
- Room 1's player list contains only Room 1 participants
- Room 2's player list contains only Room 2 participants
- No cross-contamination between lobbies

---

## Build Verification

After all manual scenarios pass, run:

```bash
cd backend && npm run build
cd frontend && npm run build
```

Both must complete with zero errors before the PR is submitted.

---

## References

- [API Contracts](./contracts/api.md) — endpoint request/response shapes
- [Data Model](./data-model.md) — entity definitions and validation rules
- [Spec](./spec.md) — acceptance criteria (FR-001–FR-011, SC-001–SC-006)
