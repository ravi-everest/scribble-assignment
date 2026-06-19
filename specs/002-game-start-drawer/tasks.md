# Tasks: Game Start & Drawer Flow

**Input**: Design documents from `specs/002-game-start-drawer/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/ ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in every description

---

## Phase 1: Setup

**Purpose**: Confirm the baseline before making changes.

- [ ] T001 Verify `npm run build` passes in both `backend/` and `frontend/` before any edits (gate check)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type definitions that ALL user stories depend on. Must be complete before Phase 3+.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T002 [P] Add `secretWord?: string` to `RoomSnapshot` interface in `backend/src/models/game.ts`
- [ ] T003 [P] Add `secretWord?: string` to `RoomSnapshot` interface in `frontend/src/services/api.ts`

**Checkpoint**: Both `RoomSnapshot` types extended — user story implementation can begin.

---

## Phase 3: User Story 1 — Transition from Lobby to Game View (Priority: P1) 🎯 MVP

**Goal**: All players navigate from `/lobby` to `/game?room=CODE` when the host starts the game. The game screen survives a page refresh using `sessionStorage` + URL query param.

**Independent Test**: With two browser tabs in the lobby, host clicks Start Game — both tabs transition to `/game?room=<CODE>`. Refreshing either tab keeps the player on the game screen (no redirect to `/`).

- [ ] T004 [US1] Write `participantId` to `sessionStorage` (key: `participantId`) inside `setRoomSession` in `frontend/src/state/roomStore.ts`
- [ ] T005 [US1] Add `restoreSession(roomCode: string, participantId: string)` method to `RoomStore` in `frontend/src/state/roomStore.ts` — fetch room via `api.fetchRoom(roomCode, participantId)`, seed the store with both the room snapshot AND the `participantId` (so `useRoomState().participantId` is non-null after refresh — required by T010's role check) (depends on T004)
- [ ] T006 [P] [US1] Update `LobbyPage` navigate call from `navigate("/game")` to `navigate(\`/game?room=${room.code}\`)` in `frontend/src/pages/LobbyPage.tsx`
- [ ] T007 [US1] Rewrite `GamePage` session bootstrap in `frontend/src/pages/GamePage.tsx`: read `roomCode` from `useSearchParams()`, read `participantId` from `sessionStorage.getItem("participantId")`, redirect to `/` if either is absent, call `store.restoreSession(roomCode, participantId)` in a `useEffect` when the store has no room (depends on T005, T006)

**Checkpoint**: US1 fully functional — two tabs transition to game screen; refresh does not redirect to `/`.

---

## Phase 4: User Story 2 — Drawer Sees the Secret Word (Priority: P2)

**Goal**: The drawer's game screen shows `"rocket"` as the secret word. The guesser's screen shows nothing. Server enforces the rule — `secretWord` is absent from guesser API responses.

**Independent Test**: Two browser tabs on game screen. Tab A (drawer) shows "rocket". Tab B (guesser) has no text "rocket" anywhere in the DOM. Confirmed via network inspect: guesser poll response has no `secretWord` field.

- [ ] T008 [US2] Update `toRoomSnapshot` in `backend/src/services/roomStore.ts`: when `status === "active"` and `viewerParticipantId === room.hostId`, set `secretWord: STARTER_WORDS[0]`; in all other cases omit `secretWord` (leave `undefined`). Also fix the `startRoom` call-site at line 120: change `toRoomSnapshot(cloneRoom(room))` to `toRoomSnapshot(cloneRoom(room), participantId)` so the POST `/start` response includes `secretWord` for the drawer immediately (not only on the next poll). (depends on T002)
- [ ] T009 [US2] Add secret word display to `GamePage` in `frontend/src/pages/GamePage.tsx`: when `room.secretWord` is defined, render it prominently with a label (e.g. "Secret word:"); when absent, render nothing in that position (depends on T003, T007, T008)

**Checkpoint**: US2 fully functional — drawer sees "rocket", guesser sees nothing; server response confirms enforcement.

---

## Phase 5: User Story 3 — Player Role Identification (Priority: P3)

**Goal**: Every player on the game screen sees an unambiguous label for their role — "You are the drawer" or "You are guessing".

**Independent Test**: Two browser tabs on game screen. Tab A shows a role indicator with "drawer" meaning. Tab B shows a role indicator with "guesser" meaning. Neither tab shows the other's indicator.

- [ ] T010 [US3] Add role label to `GamePage` in `frontend/src/pages/GamePage.tsx`: when `participantId === room.hostId` render "You are the drawer"; otherwise render "You are guessing". Label must be visible and not hidden behind other UI elements (depends on T007)

**Checkpoint**: US3 fully functional — role labels present and unambiguous for both players.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Build verification and manual validation.

- [ ] T011 [P] Verify `npm run build` passes in `backend/` after all backend changes
- [ ] T012 [P] Verify `npm run build` passes in `frontend/` after all frontend changes
- [ ] T013 Run all 7 validation scenarios from `specs/002-game-start-drawer/quickstart.md` across two browser tabs (depends on T011, T012)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — run immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2 — T004 → T005 → T007 (sequential); T006 parallel to T004/T005
- **US2 (Phase 4)**: Depends on Phase 3 (T007 must be complete) — T008 → T009
- **US3 (Phase 5)**: Depends on Phase 3 (T007 must be complete) — T010 (single task)
- **Polish (Phase 6)**: Depends on Phase 4 and Phase 5

### User Story Dependencies

- **US1 (P1)**: Foundational complete → can start immediately
- **US2 (P2)**: US1 complete (needs game screen working and `GamePage` session bootstrap)
- **US3 (P3)**: US1 complete (needs game screen working and `participantId` resolution)
- US2 and US3 can proceed in parallel after US1

### Within Each User Story

- US1: T004 → T005 → T007; T006 is parallel to T004/T005
- US2: T008 → T009 (T008 is backend, T009 is frontend — can overlap in execution)
- US3: T010 (single task, depends on T007)

### Parallel Opportunities

- T002 and T003 (both type additions, different files)
- T006 and T004/T005 (different files)
- T008 and T007 (different layers — backend vs frontend, once T007 spec is clear)
- T011 and T012 (independent build checks)
- US2 and US3 can start in parallel after US1

---

## Parallel Example: User Story 1

```
# These two can run simultaneously (different files):
T002  Add secretWord to backend/src/models/game.ts
T003  Add secretWord to frontend/src/services/api.ts

# After T002 + T003 complete, these can run simultaneously:
T004  Write participantId to sessionStorage in frontend/src/state/roomStore.ts
T006  Update LobbyPage navigate in frontend/src/pages/LobbyPage.tsx

# After T004 only:
T005  Add restoreSession method to frontend/src/state/roomStore.ts

# After T005 + T006:
T007  Rewrite GamePage session bootstrap in frontend/src/pages/GamePage.tsx
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Verify builds pass
2. Complete Phase 2: Add `secretWord?` type to both `RoomSnapshot` interfaces
3. Complete Phase 3: US1 — lobby→game navigation + sessionStorage + restoreSession
4. **STOP and VALIDATE**: Two-tab test — both tabs reach `/game?room=CODE`; refresh works
5. Proceed to US2 only after US1 is confirmed

### Incremental Delivery

1. Phase 1 + 2 → types ready
2. Phase 3 (US1) → game transition works → validate two-browser scenario 1
3. Phase 4 (US2) → secret word visible to drawer, hidden from guesser → validate scenarios 2 & 6
4. Phase 5 (US3) → role labels → validate scenario 3
5. Phase 6 → builds green, all 7 quickstart scenarios pass

---

## Notes

- [P] tasks = different files, no intra-phase dependencies — safe to work in parallel
- [Story] labels map each task to its acceptance criteria in `spec.md`
- `STARTER_WORDS[0]` = `"rocket"` — hardcoded constant; do not compute dynamically
- `participantId` sessionStorage key must be exactly `"participantId"` (matched in `GamePage` read)
- `toRoomSnapshot` in `startRoom()` (roomStore.ts:120) currently passes **no** `viewerParticipantId` — T008 must fix this call-site to pass `participantId` so the drawer receives `secretWord` immediately in the POST `/start` response
- Commit after each task; message must reference the task ID (e.g. `T007`) per Constitution Principle VI
