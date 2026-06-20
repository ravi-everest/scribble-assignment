# Project Reflection: Scribble Assignment

## Overview

Built a multiplayer drawing-and-guessing game across four scenarios over the course of the project. The work started from a provided starter app and ended with a fully playable game loop: create/join a room, start a round, draw and guess, see results, and restart. The full implementation spans ~1,875 lines of TypeScript across 31 source files, 4 spec directories, and 68 commits.

---

## What the Starter App Already Had

The starter was not blank. It encoded real architectural decisions that had to be understood before touching anything:

- **Project structure**: `backend/` (Express + TypeScript) and `frontend/` (Vite + React + TypeScript) with separate builds, Vitest in both, Zod for request validation
- **Room model**: `Room` with `code`, `status` (`"lobby"` | `"active"`), `hostId`, `participants`, `guesses`, `scores`, `createdAt`, `updatedAt`
- **REST endpoints**: create room, join room, get room, start room, submit guess — all wired up with Zod schemas and an in-memory `Map<string, Room>`
- **Frontend pages**: `StartPage`, `CreateRoomPage`, `JoinRoomPage`, `LobbyPage`, `GamePage` — all already routing via React Router
- **Polling infrastructure**: both `LobbyPage` and `GamePage` had `setInterval` at 2000ms and self-navigated on status changes
- **UI components**: `Scoreboard` (sorted descending by score), `ResultPanel` (guess history with ✓/✗), `DrawingCanvas`, `GuessForm`, `Card`, `PageHeader`, `RoomCodeBadge`
- **Working tests**: `compareGuess` unit tests, `submitGuess` integration tests, api client tests
- **Deterministic word list**: five words in `starterData.ts` (`rocket`, `pizza`, `castle`, `guitar`, `sunflower`)
- **A constitution**: `.specify/memory/constitution.md` that governed every decision — no WebSockets, no databases, polling-only sync, deterministic rules, spec-first development

What was absent: any concept of a round ending, a result screen, a restart flow, or the word being revealed at the end.

---

## What Was Built Across Each Scenario

### Scenario 1 — Room Setup & Lobby

The starter had a broken `createRoom` handler (a bug fix was the first commit). Beyond that, this scenario formalized what was already mostly present: host designation, room code generation, join flow with error handling for invalid codes, and the polling lobby. The primary additions were explicit error messages for edge cases (empty/whitespace names, invalid codes, room-not-found) and the host "Start Game" guard (minimum 2 players).

**Key thing learned**: Reading the starter thoroughly before writing anything. The starter had scores initialized inside `startRoom` — not `createRoom` — which meant scores were absent in the lobby phase. Understanding that boundary early prevented a class of bugs later.

---

### Scenario 2 — Game Start & Drawer Flow

The starter already had `startRoom` transitioning status to `"active"` and `LobbyPage` navigating to `/game` on that status change. What this scenario added was the role distinction: the host is the drawer, everyone else is a guesser. The `secretWord` was made visible only to the drawer via `toRoomSnapshot`'s viewer-gated logic. Player name validation (trimming, rejecting whitespace-only) was enforced at the API boundary with Zod.

**Key decision**: `secretWord` is computed at snapshot time based on `viewerParticipantId === room.hostId`, not stored as a separate field. This keeps the secret out of the serialized room object and means the secret is never accidentally leaked to guessers through a polling response.

---

### Scenario 3 — Gameplay Interaction

The core guess loop. `submitGuess` already existed in the starter but used a hardcoded word reference. This scenario wired it properly: case-insensitive trimmed comparison, 100-point scoring for correct, 0 for incorrect, empty-string rejection. The drawing canvas was already present in the starter — client-side only, no stroke sync to the server (per constitution: polling-only, no real-time push).

**Key tradeoff**: Canvas strokes are not synced across clients. Only the drawer sees their drawing; guessers see a blank canvas. This is by design — syncing canvas state over polling would require delta compression or full-canvas serialization, both out of scope. The game works because guessers rely on the word list being short and familiar, not on seeing the drawing in real time.

---

### Scenario 4 — Result, Restart & Final Validation

The most structurally significant scenario. Required extending the state machine with a third status (`"result"`), adding `currentWord` to the room model, detecting round end in `submitGuess`, creating a new `ResultPage`, and implementing the `POST /rooms/:code/restart` endpoint.

**Key additions**:
- `RoomStatus` extended to `"lobby" | "active" | "result"`
- `currentWord: string` on `Room` — set at `startRoom`, cleared at `restartRoom`, exposed in snapshot only during `"result"`
- Round-end detection: Set-based (correct `participantId`s), checked after every `submitGuess`
- `restartRoom`: host-only, validates `"result"` status, clears word/guesses/scores, returns to lobby
- `ResultPage`: mirrors `GamePage` session-restore pattern; polls, shows word/scores/history, host-only Restart button

---

## Workflow: How This Was Built

Every scenario followed the same Spec Kit sequence:

```
/speckit-specify → /speckit-clarify → /speckit-plan → /speckit-tasks → /speckit-analyze → /speckit-implement
```

This was not just process overhead — it materially improved the output:

- **Clarification caught real ambiguities**: score display ordering (descending vs. join order), whether the drawer appears in the score list, button label ("Restart" vs. "Play Again") — all resolved before a line of code was written
- **Analysis caught real bugs before they were committed**: the `startRoom` status guard (`=== "active"` instead of `!== "lobby"`) would have allowed restarting a "result"-state room back to "active" without clearing data; caught by `/speckit-analyze`, fixed in the implementation
- **Research.md documented 12 concrete gaps** between the spec and the live code before implementation of Scenario 4 — turned what could have been a discovery process during coding into a verified checklist

---

## AI Usage

AI assistance was used throughout via Claude Code. The constitution required spec-first prompting, build verification before every commit, and line-by-line explainability.

**Where AI was most useful**:
- Generating boilerplate that follows established patterns (e.g., `restartRoom` following the exact structure of `startRoom` and `submitGuess`)
- Producing comprehensive test cases, especially error paths (403, 400, 404) that are easy to forget
- Cross-artifact analysis — `/speckit-analyze` consistently found inconsistencies between spec wording and implementation intent that a human reading a single file would miss

**Where AI required correction**:
- In Scenario 4, the AI wrote a `toRoomSnapshot` unit test that called `submitGuess` twice on the same room. After the first correct guess the room transitioned to "result" status, so the second call threw a 400. The AI had just written the round-end detection that made this happen but didn't track the interaction when writing the test two steps later. Caught immediately by running the test suite — fixed by rewriting the test with a fresh room.
- The "accumulates score across multiple correct guesses" test from the original suite became invalid once round-end detection was added (a correct guess now ends the round). Updated to "throws 400 on a second guess after round ends" — the new correct behavior.
- Task descriptions occasionally overstated the work required (e.g., T004 said "initialize scores for host" when the existing `startRoom` loop already initialized all participants). These were low-stakes — the implementation was correct, the description was just stale.

**What was never accepted blindly**:
- Any suggestion involving WebSockets, databases, or additional libraries — the constitution prohibited these and the AI occasionally floated them as "improvements"
- Generated commit messages — all written manually to reference the task ID and reflect actual understanding of the change

---

## Architecture Decisions and Tradeoffs

**Polling over WebSockets.**
The constitution mandated this. The real tradeoff: up to 2 seconds of lag between server state change and client visibility. Acceptable for a learning exercise; would be unacceptable in a production game.

**In-memory state only.**
Every room lives in a `Map` on the Node.js process. Restarting the backend clears everything. No persistence, no sessions, no auth. This kept the scope focused on game logic. The downside is that there is no recovery path if the server crashes mid-game.

**One drawer for the full session, always the host.**
Drawer rotation, timers, and multiple rounds are all explicitly out of scope per the constitution. The game is exactly one round per session. This is a teaching constraint, not a product constraint.

**`currentWord` on `Room`, not derived at snapshot time.**
Deriving the word from `STARTER_WORDS[0]` at read time (as the original code did) couples the snapshot to word-selection logic. Once the word needed to be stored for the result reveal, moving it to `Room` was the right call. It also removed the last hardcoded `STARTER_WORDS[0]` reference from inside business logic.

**`ResultPage` as a separate route, not an inline branch in `GamePage`.**
Each page owns exactly one room status. `LobbyPage` owns `"lobby"`, `GamePage` owns `"active"`, `ResultPage` owns `"result"`. The pattern was already established by the starter — following it kept each component at a single responsibility and made session-restore at `/result?room=...` work for free.

---

## What I Would Do Differently

**Catch spec/implementation terminology mismatches earlier.** The spec said scores are "reset to zero" in four places; the actual implementation clears to `{}`. Both are functionally equivalent given how `startRoom` re-initializes on the next round — but a reviewer reading only the spec would expect `{ id: 0, ... }` in lobby state. `/speckit-analyze` found this after implementation. It should have been caught in the clarification pass.

**Write task descriptions that reflect what is actually new, not the full desired state.** T004 described initializing host scores at game start, but that loop already existed. The task should have said only "add `room.currentWord = STARTER_WORDS[0]`". Stale descriptions don't break anything, but they create noise during review.

**Add a restart→lobby→start cycle unit test.** The most important integration — that a restarted room can successfully start a new round — was validated manually via the browser but not covered by an automated test. A single `restartRoom(code, hostId)` followed by `startRoom(code, hostId)` assertion would have closed that gap.

---

## Final State

| Metric | Value |
|---|---|
| Scenarios implemented | 4 / 4 |
| Commits | 68 |
| Source files | 31 TypeScript files |
| Lines of TypeScript | ~1,875 |
| Backend tests | 24 passing |
| Frontend tests | 3 passing |
| Build errors | 0 |
| Constitution violations | 0 |
| Manual validation tasks pending | T018, T019, T023, T024 (two/three-browser scenarios) |
