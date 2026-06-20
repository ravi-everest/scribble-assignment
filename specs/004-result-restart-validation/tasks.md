# Tasks: Result, Restart & Final Validation

**Input**: Design documents from `specs/004-result-restart-validation/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on each other)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Each task includes the exact file path to modify or create

---

## Phase 1: Setup (Brownfield Discovery)

**Purpose**: Confirm alignment between research.md gaps and live code before writing a single line.

- [ ] T001 Re-read `backend/src/models/game.ts`, `backend/src/services/roomStore.ts`, `frontend/src/services/api.ts`, and `frontend/src/pages/GamePage.tsx` — confirm all 12 gaps from `specs/004-result-restart-validation/research.md` are present in the current codebase (no gap was already fixed upstream)

**Checkpoint**: All 12 gaps confirmed. Safe to proceed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend the shared type contracts. All backend service changes and frontend API changes in Phases 3–4 depend on these types compiling correctly first.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T002 Extend `RoomStatus`, `Room`, and `RoomSnapshot` in `backend/src/models/game.ts`: add `"result"` to `RoomStatus` union; add `currentWord: string` field to `Room`; add `currentWord?: string` field to `RoomSnapshot`
- [ ] T003 [P] Extend `RoomSnapshot` in `frontend/src/services/api.ts`: add `"result"` to the `status` union type; add `currentWord?: string` field

T002 and T003 touch different codebases and can be done in parallel.

**Checkpoint**: `npm run build` passes in both `backend/` and `frontend/` before proceeding to any user story phase.

---

## Phase 3: User Story 1 — View Round Results (Priority: P1) 🎯 MVP

**Goal**: Every connected player automatically sees a results screen after a round ends, showing the correct word, all player scores (descending, drawer at 0), and the full chronological guess history.

**Independent Test**: Open two browser tabs (host + one guesser), start a game, have the guesser submit "rocket", and confirm both tabs navigate to `/result?room=...` showing the word "rocket", Bob 100 pts (first), Alice 0 pts (second), and one guess entry.

### Implementation for User Story 1

- [ ] T004 [US1] Update `startRoom` in `backend/src/services/roomStore.ts`: set `room.currentWord = STARTER_WORDS[0]` and initialize `room.scores[hostId] = 0` at game start
- [ ] T005 [US1] Update `submitGuess` in `backend/src/services/roomStore.ts`: replace the hardcoded `STARTER_WORDS[0]` reference with `room.currentWord`; add round-end detection (all non-host participants have a correct guess → set `room.status = "result"`)
- [ ] T006 [US1] Update `toRoomSnapshot` in `backend/src/services/roomStore.ts`: include `currentWord: room.currentWord` in the returned snapshot when `room.status === "result"`
- [ ] T007 [P] [US1] Update `GamePage.tsx` in `frontend/src/pages/GamePage.tsx`: add a `useEffect` that watches `room?.status` and navigates to `/result?room=${room.code}` when `room.status === "result"`
- [ ] T008 [US1] Create `ResultPage.tsx` at `frontend/src/pages/ResultPage.tsx`: poll at 2-second interval; restore session on mount (same pattern as `GamePage`); display the correct word (`room.currentWord`), the score list (use existing `Scoreboard` component — already sorts descending; drawer appears with score 0), and the full guess history (use existing `ResultPanel` component); show no canvas or guess form
- [ ] T009 [US1] Register the `/result` route in `frontend/src/routes/index.tsx`: add `<Route path="/result" element={<ResultPage />} />`
- [ ] T010 [P] [US1] Add unit tests for round-end detection in `backend/src/services/roomStore.test.ts`: test that `submitGuess` transitions `room.status` to `"result"` when the last guesser guesses correctly; test that status stays `"active"` when only some guessers have guessed correctly; test that `toRoomSnapshot` includes `currentWord` in "result" state and omits it in "active" state

T007 and T010 touch different files and can be done in parallel with each other after T004–T006 are complete.

**Checkpoint**: Both tabs show the result screen with correct data. `npm run build` passes in both directories.

---

## Phase 4: User Story 2 — Host Restarts the Game (Priority: P1)

**Goal**: The host sees a "Restart" button on the result screen. Clicking it returns all players to the lobby with the same player list and all round state cleared. Non-host players do not see the button.

**Independent Test**: After reaching the result screen (US1 checkpoint), Tab A (host) clicks "Restart" — both tabs navigate to `/lobby` within 2 seconds; lobby shows both players; no scores or guesses visible; host can start a new round.

### Implementation for User Story 2

- [ ] T011 [US2] Add `restartRoom(code, participantId)` to `backend/src/services/roomStore.ts`: validate room exists (404), caller is host (403), status is `"result"` (400); reset `room.status = "lobby"`, `room.currentWord = ""`, `room.guesses = []`, `room.scores = {}`; return updated snapshot
- [ ] T012 [P] [US2] Add `restartRoomSchema` to `backend/src/api/schemas.ts`: `z.object({ participantId: z.string().min(1) })`
- [ ] T013 [US2] Add `POST /:code/restart` route handler to `backend/src/api/rooms.ts`: parse `restartRoomSchema`, call `restartRoom`, return `{ room: snapshot }`
- [ ] T014 [P] [US2] Add `restartRoom(code, participantId)` to `frontend/src/services/api.ts`: `POST /rooms/:code/restart` with `{ participantId }` body, returns `{ room: RoomSnapshot }`
- [ ] T015 [US2] Add `restartRoom(code, participantId)` method to `frontend/src/state/roomStore.ts`: calls `api.restartRoom`, calls `setRoomSnapshot` with the returned room
- [ ] T016 [US2] Update `frontend/src/pages/ResultPage.tsx`: add polling navigation to `/lobby` when `room.status === "lobby"`; add "Restart" button visible only to the host (`participantId === room.hostId`) that calls `roomStore.restartRoom`; non-host players see no restart control
- [ ] T017 [P] [US2] Add unit tests for `restartRoom` in `backend/src/services/roomStore.test.ts`: test happy-path reset (status, word, guesses, scores cleared; participants preserved); test 403 when called by non-host; test 400 when room is not in "result" status

T012 and T014 touch different files and can be done in parallel after T011. T017 can be done in parallel with T012/T014.

**Checkpoint**: Two-browser test: host restarts, both tabs reach lobby with players intact and no residual round data. `npm run build` passes in both directories.

---

## Phase 5: User Story 3 — Consistent State Across Clients (Priority: P2)

**Goal**: All polling clients see the same state transitions within 2 seconds. No new code is required — this phase is purely validation confirming that US1 and US2 together satisfy the cross-client consistency requirement.

**Independent Test**: Three-tab test (host + two guessers) — all three see result screen simultaneously after round end; all three see lobby after restart.

### Validation for User Story 3

- [ ] T018 [US3] Run `quickstart.md` Scenario 3 (three-tab validation): open three browser tabs, complete a round, confirm all three show the result screen with identical data within 2 seconds; host restarts, confirm all three reach the lobby within 2 seconds — document pass/fail against SC-001 and SC-002
- [ ] T019 [US3] Run `quickstart.md` Scenario 5 (rejoin after tab close): close and reopen a browser tab mid-result, confirm the player sees the current result state on reconnect — validates US3 AC3

**Checkpoint**: All three tabs behave consistently. No code changes needed if US1 and US2 are correct.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final build verification, edge case validation, and spec traceability review.

- [ ] T020 [P] Run `npm run build` in `backend/` — confirm zero TypeScript errors and zero lint warnings before PR submission
- [ ] T021 [P] Run `npm run build` in `frontend/` — confirm zero TypeScript errors and zero lint warnings before PR submission
- [ ] T022 Run all existing Vitest suites: `npm test` in `backend/` and `npm test` in `frontend/` — confirm no regressions in `roomStore.test.ts` or `api.test.ts` baselines
- [ ] T023 Verify edge cases from `spec.md`: (1) empty guess history renders gracefully on result screen; (2) player with score 0 (drawer) appears in score list; (3) non-host player sees no Restart button; (4) room in "result" state correctly shown to a late joiner — all per `quickstart.md` Scenario 4
- [ ] T024 Review each commit against spec task IDs (S1-AC1 through S2-AC5 as applicable) — ensure every committed change is traceable to a functional requirement per constitution Principle VI

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user story phases**
- **US1 (Phase 3)**: Depends on Phase 2 — no dependency on US2 or US3
- **US2 (Phase 4)**: Depends on Phase 3 (Restart button lives in `ResultPage.tsx` created in US1)
- **US3 (Phase 5)**: Depends on Phase 3 + Phase 4 completion (validation only)
- **Polish (Phase 6)**: Depends on Phase 5 completion

### User Story Dependencies

- **User Story 1 (P1)**: Unblocked after Phase 2 — independent
- **User Story 2 (P1)**: Requires US1 complete (shares `ResultPage.tsx`)
- **User Story 3 (P2)**: Requires US1 + US2 complete (cross-client validation)

### Within Each User Story

- Models/type changes before service changes (T002 → T004, T005, T006)
- Service changes before API route changes (T011 → T013)
- Backend changes before frontend integration (T011–T013 → T014–T016)
- Core implementation before tests; tests can be written in parallel with implementation of the *next* task in the sequence

### Parallel Opportunities

- T002 and T003 (Phase 2): different codebases — run in parallel
- T007 and T010 (Phase 3): different files — run in parallel after T004–T006
- T012, T014, T017 (Phase 4): different files — run in parallel after T011
- T020 and T021 (Phase 6): different directories — run in parallel

---

## Parallel Example: User Story 1

```
After T004–T006 complete:
  [P] T007: Update GamePage.tsx (frontend navigation)
  [P] T010: Write round-end detection unit tests (backend test file)
  T008: Create ResultPage.tsx (depends on GamePage navigation pattern for reference)
  T009: Register /result route (depends on ResultPage existing)
```

## Parallel Example: User Story 2

```
After T011 (restartRoom service) is complete:
  [P] T012: Add restartRoomSchema to schemas.ts
  [P] T014: Add restartRoom to api.ts
  [P] T017: Write restartRoom unit tests
  T013: Add /restart route (depends on T012)
  T015: Add store method (depends on T014)
  T016: Update ResultPage (depends on T015)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Discovery (T001)
2. Complete Phase 2: Foundational (T002, T003)
3. Complete Phase 3: User Story 1 (T004–T010)
4. **STOP and VALIDATE**: Two-browser test — result screen shows correct data
5. Build passes → ready to add restart flow

### Incremental Delivery

1. Phase 1 + Phase 2 → types compile cleanly
2. Phase 3 (US1) → Result screen working end-to-end
3. Phase 4 (US2) → Full game loop: play → results → restart → play again
4. Phase 5 (US3) → Three-client consistency confirmed
5. Phase 6 → Clean PR ready for review

---

## Notes

- `[P]` tasks operate on different files and have no dependency on each other within the same phase
- `[Story]` label traces each task to its user story acceptance criteria in `spec.md`
- Each user story phase ends with a build-verified, two-browser-tested checkpoint
- Commit after each task or logical group; commit message MUST reference the task ID (e.g., `T005`, `S1-AC1`)
- Existing components (`Scoreboard`, `ResultPanel`) are reused as-is per constitution Principle I — do not rewrite them
- `STARTER_WORDS[0]` ("rocket") remains the only word source per constitution Principle III
