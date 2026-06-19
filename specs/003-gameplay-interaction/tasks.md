# Tasks: Gameplay Interaction

**Input**: Design documents from `specs/003-gameplay-interaction/`

**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/api.md ✓, quickstart.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story. No new project structure needed — all changes extend existing files.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Extend the data model and type layer. Every user story depends on these types being defined first. Complete this phase before starting any user story.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T001 Add `Guess` interface; extend `Room` with `guesses: Guess[]` and `scores: Record<string, number>`; extend `RoomSnapshot` with `guesses: Guess[]` and `scores: Record<string, number>` in `backend/src/models/game.ts`
- [ ] T002 [P] Add `Guess` interface; extend `RoomSnapshot` with `guesses: Guess[]` and `scores: Record<string, number>` in `frontend/src/services/api.ts`
- [ ] T003 [P] Add `submitGuessSchema` (fields: `participantId: string`, `guess: string`) to `backend/src/api/schemas.ts`
- [ ] T004 Update `createRoom()` to initialize `guesses: []` and `scores: {}`; update `startRoom()` to seed `scores` with `0` for every participant; update `toRoomSnapshot()` to copy `guesses` and `scores` from `Room` into every `RoomSnapshot` response in `backend/src/services/roomStore.ts`

**Checkpoint**: Both `npm run build` invocations pass. Type errors will surface here if field shapes mismatch between backend and frontend.

---

## Phase 2: User Story 1 — Drawer Sees Own Drawing (Priority: P1) 🎯 MVP start

**Goal**: The drawer can draw strokes on a canvas and clear it — changes visible instantly on their own screen.

**Independent Test**: Single browser tab as host/drawer. Create room, start game, draw strokes — confirm they appear. Click Clear — confirm canvas resets to blank. No second tab needed for this story.

### Implementation for User Story 1

- [ ] T005 [US1] Create `frontend/src/components/DrawingCanvas.tsx` — `<canvas>` element with `mousedown`/`mousemove`/`mouseup` handlers that draw strokes using `CanvasRenderingContext2D`; a "Clear" button that calls `context.clearRect(0, 0, canvas.width, canvas.height)`; canvas only active while `isDrawer` (accept no-op or hide if not drawer)
- [ ] T006 [US1] Update `frontend/src/pages/GamePage.tsx` — replace the `canvas-placeholder` div with `<DrawingCanvas />` when `isDrawer === true`; render a static `"Waiting for drawing..."` placeholder when `isDrawer === false`

**Checkpoint**: Drawer sees strokes in real time (SC-001). Canvas Clear resets to blank. Build passes.

---

## Phase 3: User Story 2 — Guesser Submits a Guess (Priority: P1)

**Goal**: Guessers can submit a trimmed, case-insensitively compared guess. Correct guesses award 100 points; incorrect guesses award 0. Empty/whitespace guesses are rejected client-side before reaching the server. The drawer cannot submit guesses.

**Independent Test**: Two browser tabs — Tab A (drawer/host), Tab B (guesser). In Tab B: submit `"   "` → blocked. Submit `"castle"` for word `"rocket"` → 0 pts. Submit `"  ROCKET  "` → 100 pts. Tab A has no active guess form.

### Tests for User Story 2 (constitution-mandated for game-logic functions)

> **NOTE: Write this test FIRST; ensure it FAILS before implementing `compareGuess`**

- [ ] T007 [P] [US2] Add Vitest unit tests for `compareGuess` in `backend/src/services/roomStore.test.ts` — cover: exact match, case-insensitive match, trimmed match, wrong word (returns false), empty string after trim (returns false or throws)

### Implementation for User Story 2

- [ ] T008 [US2] Add `compareGuess(input: string, secretWord: string): boolean` pure function and `submitGuess(code: string, participantId: string, rawGuess: string): RoomSnapshot` service function in `backend/src/services/roomStore.ts` — `submitGuess` must: look up room, 404 if absent, 400 if not active, 403 if participantId === hostId, trim+lowercase input, 400 if empty after trim, append `Guess` to `room.guesses`, increment `room.scores[participantId]` by 100 if correct, call `toRoomSnapshot` and return
- [ ] T009 [US2] Add `POST /:code/guess` route handler in `backend/src/api/rooms.ts` — parse `submitGuessSchema`, call `submitGuess`, return `{ room: snapshot }`; propagate `HttpError` via `next(error)`
- [ ] T010 [P] [US2] Add `api.submitGuess(code: string, participantId: string, guess: string): Promise<{ room: RoomSnapshot }>` to `frontend/src/services/api.ts`
- [ ] T011 [US2] Update `frontend/src/components/GuessForm.tsx` — accept `roomCode: string`, `participantId: string`, `disabled?: boolean` props; in `handleSubmit`: reject if `guessText.trim() === ""` (no API call); call `api.submitGuess(roomCode, participantId, guessText)`; clear input on success; disable form while request is in-flight; render form disabled when `disabled` prop is true
- [ ] T012 [US2] Update `frontend/src/pages/GamePage.tsx` — pass `roomCode` (from `useSearchParams`), `participantId` (from state), and `disabled={isDrawer}` to `<GuessForm />`

**Checkpoint**: `npm test` in `backend/` passes including `compareGuess` unit tests. Guesser tab scores correctly (SC-002, SC-003). Drawer tab has no active form (FR-012).

---

## Phase 4: User Story 3 — Guess History Synced to All Players (Priority: P2)

**Goal**: All players (drawer and guessers) see the same shared scoreboard and guess history, updated each polling cycle (~2 seconds).

**Independent Test**: Two browser tabs — submit a guess in Tab B; within ~2 seconds, Tab A (drawer) shows the same guess in the activity feed and the same scores in the scoreboard.

### Implementation for User Story 3

- [ ] T013 [P] [US3] Replace the stub in `frontend/src/components/Scoreboard.tsx` — accept `participants: Participant[]` and `scores: Record<string, number>` props; render each player's name and score (sorted by score descending); remove all placeholder content
- [ ] T014 [P] [US3] Replace the stub in `frontend/src/components/ResultPanel.tsx` — accept `guesses: Guess[]` prop; render the accumulated guess list in submission order (guesser name, guess text, correct/incorrect indicator); remove all placeholder content
- [ ] T015 [US3] Update `frontend/src/pages/GamePage.tsx` — add a `useEffect` that calls `roomStore.fetchRoom()` on a `setInterval` of 2000ms (clear on unmount); pass `room.participants` and `room.scores` to `<Scoreboard />`; pass `room.guesses` to `<ResultPanel />`

**Checkpoint**: All three US3 acceptance scenarios pass (guess history appears in both tabs within 2 polls). Scoreboard reflects accurate cumulative scores (SC-004, SC-005, SC-006).

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T016 [P] Run `npm run build` in `backend/` — confirm TypeScript strict-mode build passes with zero errors
- [ ] T017 [P] Run `npm run build` in `frontend/` — confirm TypeScript strict-mode build passes with zero errors
- [ ] T018 Run `npm test` in `backend/` — confirm all Vitest tests pass including the `compareGuess` unit test added in T007
- [ ] T019 Execute the 7 manual validation scenarios in `quickstart.md` (V1–V7) using two browser tabs — check each expected outcome and confirm no regressions in room creation, lobby, or game-start flows

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Phase 1 completion (needs RoomSnapshot type from T002)
- **US2 (Phase 3)**: Depends on Phase 1 completion (needs T003 schema + T004 store functions)
- **US3 (Phase 4)**: Depends on Phase 1 + US2 (needs `guesses`/`scores` populated by guess submissions to validate)
- **Polish (Phase 5)**: Depends on all phases complete

### User Story Dependencies

- **US1**: Independent — DrawingCanvas is pure DOM, no guess logic needed
- **US2**: Independent — depends only on Foundational types and schemas
- **US3**: Soft dependency on US2 for meaningful test data, but Scoreboard/ResultPanel stubs can be replaced independently with empty-state handling

### Within Each User Story

- **US2**: T007 (test) written to fail → T008 (compareGuess impl) → T009 (route) → T010 (api client, parallel) → T011 (GuessForm) → T012 (GamePage wiring)
- **US3**: T013 + T014 (parallel, different files) → T015 (GamePage data props + polling)

### Parallel Opportunities

- T001, T002, T003 can all start together (different files)
- T007 and T010 can run in parallel (different files; T007 = backend test, T010 = frontend api)
- T013 and T014 can run in parallel (different component files)
- T016 and T017 (builds) can run in parallel

---

## Parallel Example: User Story 2

```text
# Start together after Phase 1 complete:
Task T007: Add compareGuess unit tests in backend/src/services/roomStore.test.ts
Task T010: Add api.submitGuess in frontend/src/services/api.ts

# After T007 + T008 done:
Task T009: Add POST /:code/guess route in backend/src/api/rooms.ts

# After T010 done:
Task T011: Wire GuessForm.tsx
```

## Parallel Example: User Story 3

```text
# Start together after Phase 1 complete:
Task T013: Replace Scoreboard.tsx stub
Task T014: Replace ResultPanel.tsx stub

# After both done:
Task T015: Update GamePage.tsx with polling + data props
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Foundational
2. Complete Phase 2: US1 (Drawer Canvas) — single-tab testable
3. Complete Phase 3: US2 (Guess Submission) — two-tab testable
4. **STOP and VALIDATE**: Run `npm run build` in both dirs, run `npm test` in backend, execute quickstart V1–V4
5. US3 adds the shared scoreboard/history display — adds value but US1+US2 are playable without it

### Incremental Delivery

1. Phase 1 → Foundation ready (types compile in both workspaces)
2. Phase 2 → Drawer canvas works ✓
3. Phase 3 → Guess submission + scoring works ✓
4. Phase 4 → Live scoreboard + activity feed visible to all ✓
5. Phase 5 → Builds verified, manual scenarios confirmed ✓

---

## Notes

- **`compareGuess` must be a pure exported function** — the constitution requires it to be independently testable with Vitest (Engineering Standards). Do not inline the comparison in the route handler.
- **Secret word is always `"rocket"`** (`STARTER_WORDS[0]`) — hardcoded by design (Spec Assumption + Constitution Principle III). No word-selection logic needed.
- **Canvas is drawer-local** — no server calls for drawing; guessers see a static placeholder.
- **No dedicated per-submission feedback** — correct/incorrect result is visible only in the shared guess history (FR-013).
- **Post-trim lowercase text stored** — `"  ROCKET  "` is stored as `"rocket"` in `Guess.text` (Clarification, Session 2026-06-19).
- Each commit must reference the task ID (e.g., `T008`) per Constitution Principle VI.
