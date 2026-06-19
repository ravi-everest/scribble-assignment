# Tasks: Room Setup & Lobby

**Input**: Design documents from `specs/001-room-setup-lobby/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api.md ✅ | quickstart.md ✅

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no blocking dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in all descriptions

---

## Phase 1: Setup (Baseline Verification)

**Purpose**: Confirm a clean build baseline exists before any changes begin

- [ ] T001 Run `npm run build` in both `backend/` and `frontend/` and confirm zero errors — establishes a clean baseline before any file is touched

**Checkpoint**: Both builds pass → safe to begin foundational changes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend model/type changes and validation infrastructure that ALL user stories depend on. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: T004 depends on T002 completing first (roomStore imports from game.ts). T003 and T005 are independent and can run in parallel with T002.

- [ ] T002 Add `hostId: string` field to `Room` interface and extend `RoomStatus` to `"lobby" | "active"` in `backend/src/models/game.ts`
- [ ] T003 [P] Update `createRoomSchema` and `joinRoomSchema` — replace `playerName: z.string().optional()` with `z.string().trim().min(1).max(20)` in `backend/src/api/schemas.ts`
- [ ] T004 Update `roomStore.ts` — extend `generateCode()` from 4 to 6 chars (keep existing 32-char alphabet), set `room.hostId = participant.id` in `createRoom()`, remove `displayName()` default-name fallback so empty names are no longer accepted silently, expose `hostId` in `toRoomSnapshot()` return value in `backend/src/services/roomStore.ts`
- [ ] T005 [P] Add `hostId: string` to the `RoomSnapshot` interface in `frontend/src/services/api.ts`

**Checkpoint**: Backend validates names (1–20 chars required), generates 6-char codes, sets hostId on creation; frontend type reflects hostId → user story work can begin

---

## Phase 3: User Story 1 — Create a Room as Host (Priority: P1) 🎯 MVP

**Goal**: A player enters a name, creates a room, and lands in a lobby where they are visually marked as the host.

**Independent Test**: Open the app in one browser tab, enter a name, click "Create Room" — a 6-char room code appears, the player's name is shown in the participant list with a "(Host)" label.

- [ ] T006 [US1] Add client-side name validation to `CreateRoomPage.tsx` — trim the value, reject empty/whitespace-only with inline error message "Please enter a player name", reject names over 20 chars with "Name must be 20 characters or fewer"; validation fires on submit before any API call in `frontend/src/pages/CreateRoomPage.tsx`
- [ ] T007 [US1] Add host indicator to the participant list in `LobbyPage.tsx` — for each participant, render a "(Host)" badge/label when `participant.id === room.hostId`; `room.hostId` is now available on `RoomSnapshot` (added in T005) in `frontend/src/pages/LobbyPage.tsx`

**Checkpoint**: User Story 1 fully functional — create room, see lobby with host marker, 6-char code displayed ✅

---

## Phase 4: User Story 2 — Join an Existing Room (Priority: P2)

**Goal**: A player enters a name and a valid room code and joins the lobby as a non-host participant.

**Independent Test**: Open two browser tabs. Tab A creates a room. Tab B enters the room code and a different player name, clicks "Join Lobby" — both players appear in each other's lobby participant list.

- [ ] T008 [US2] Add client-side validation to `JoinRoomPage.tsx` — (1) reject empty/whitespace-only room code field with "Please enter a room code" before submitting; (2) apply the same name validation as T006 (trim, non-empty, ≤20 chars) before submitting in `frontend/src/pages/JoinRoomPage.tsx`

**Checkpoint**: User Story 2 fully functional — valid join succeeds, invalid/empty codes rejected with visible error, name validation enforced ✅

---

## Phase 5: User Story 3 — Lobby Polling & Live Player List (Priority: P3)

**Goal**: The lobby player list refreshes automatically every ~2 seconds without any user action.

**Independent Test**: Tab A is in the lobby. Tab B joins the same room. Within ~2 seconds, Tab A's player list updates to show Tab B's player — no manual refresh by Tab A's user.

- [ ] T009 [US3] Replace the manual "Refresh Room" button in `LobbyPage.tsx` with a `useEffect` that calls `roomStore.fetchRoom()` via `setInterval` every 2000ms; clear the interval on component unmount; poll failures are silently ignored (per clarification Q3 — no error shown) in `frontend/src/pages/LobbyPage.tsx`. Concretely: the interval callback must NOT call `setRefreshError` or any error-display path on fetch failure — swallow the rejection and let the next tick retry.

**Checkpoint**: User Story 3 fully functional — lobby auto-refreshes every ~2s; manual button gone; new joiners appear within one polling cycle ✅

---

## Phase 6: User Story 4 — Host Starts the Game (Priority: P4)

**Goal**: The host can start the game once ≥2 players are present; all clients detect the status change via polling and navigate to the game view.

**Independent Test**: Tab A (host) and Tab B (non-host) both in the lobby. Tab A's "Start Game" button is active; Tab B has no active button. Host clicks "Start Game" — both tabs navigate to `/game` within ~2s.

- [ ] T010 [P] [US4] Add `startRoomSchema` — `z.object({ participantId: z.string().min(1) })` — to `backend/src/api/schemas.ts` (appended after existing schemas; T003 must be complete)
- [ ] T011 [US4] Add `startRoom(code: string, participantId: string)` function to `backend/src/services/roomStore.ts` — look up room (return null if not found), check caller is host (throw 403 HttpError if `room.hostId !== participantId`), check ≥2 participants (throw 400 HttpError "At least 2 players are required to start"), check room is not already active (throw 400 "Room is already active"), set `room.status = "active"`, save and return updated snapshot
- [ ] T012 [US4] Add `POST /rooms/:code/start` route to `backend/src/api/rooms.ts` — parse params with `roomCodeParamsSchema`, parse body with `startRoomSchema`, call `startRoom()`; return 404 if room not found, propagate 400/403 HttpErrors from service, return 200 with `{ room: RoomSnapshot }` on success
- [ ] T013 [P] [US4] Add `api.startRoom(code: string, participantId: string)` function to `frontend/src/services/api.ts` — `POST /rooms/:code/start` with body `{ participantId }`; returns `{ room: RoomSnapshot }` (T005 must be complete for correct RoomSnapshot type)
- [ ] T014 [P] [US4] Add `startRoom(code: string, participantId: string)` action to `frontend/src/state/roomStore.ts` — call `api.startRoom()` inside `withLoading()`, call `setRoomSnapshot()` on success; follows the same pattern as the existing `joinRoom` action
- [ ] T015 [US4] Update `LobbyPage.tsx` — (1) show "Start Game" button only when `state.participantId === room.hostId`; (2) enable the button only when `room.participants.length >= 2`; (3) on click, call `roomStore.startRoom(room.code, state.participantId)`; (4) in the polling `useEffect` (T009), add a check: if `room.status === "active"` after a poll, call `navigate("/game")` automatically for all clients including non-hosts in `frontend/src/pages/LobbyPage.tsx`

**Checkpoint**: User Story 4 fully functional — host-only gated button, minimum-player enforcement, cross-client navigation via polling ✅

---

## Phase 7: Polish & Validation

**Purpose**: TypeScript build verification and end-to-end manual validation against acceptance criteria

- [ ] T016 [P] Run `npm run build` in `backend/` — resolve any TypeScript errors introduced by model changes (T002–T004, T010–T012); zero errors required before PR
- [ ] T017 [P] Run `npm run build` in `frontend/` — resolve any TypeScript errors introduced by type changes (T005–T009, T013–T015); zero errors required before PR
- [ ] T018 Run all 8 validation scenarios in `specs/001-room-setup-lobby/quickstart.md` (S1–S8) with two browser tabs — confirm all acceptance criteria (FR-001 through FR-011, SC-001 through SC-006) pass before submitting PR

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) → no dependencies, start immediately
Phase 2 (Foundational) → depends on Phase 1
  T002 first; T003 and T005 [P] with T002; T004 after T002
Phase 3 (US1) → depends on Phase 2 complete
Phase 4 (US2) → depends on Phase 2 complete (can start in parallel with Phase 3)
Phase 5 (US3) → depends on Phase 2 complete (can start after Phase 3 checkpoint)
Phase 6 (US4) → depends on Phase 5 (LobbyPage polling must exist before T015 adds auto-navigate)
  T010 after T003; T011 after T004; T012 after T010+T011; T013 after T005; T014 after T013; T015 after T009+T014
Phase 7 (Polish) → depends on all implementation phases complete
```

### Critical Path

`T001 → T002 → T004 → T011 → T012 → T015 → T016/T017 → T018`

### Parallel Opportunities Within Phases

**Phase 2** (once T002 is done):
```
T003 [P]  backend/src/api/schemas.ts
T005 [P]  frontend/src/services/api.ts
          ↓
T004      backend/src/services/roomStore.ts  (needs T002 types)
```

**Phase 3 + Phase 4** (can proceed concurrently after Phase 2):
```
T006 [US1]  frontend/src/pages/CreateRoomPage.tsx
T007 [US1]  frontend/src/pages/LobbyPage.tsx
T008 [US2]  frontend/src/pages/JoinRoomPage.tsx
```

**Phase 6** (start endpoint — parallel within):
```
T010 [P]  backend/src/api/schemas.ts
T013 [P]  frontend/src/services/api.ts
T014 [P]  frontend/src/state/roomStore.ts
          ↓
T011      backend/src/services/roomStore.ts  (needs T004 base)
T012      backend/src/api/rooms.ts           (needs T010 + T011)
T015      frontend/src/pages/LobbyPage.tsx   (needs T009 + T014)
```

**Phase 7**:
```
T016 [P]  npm run build — backend/
T017 [P]  npm run build — frontend/
          ↓
T018      quickstart.md validation (needs both builds green)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Baseline verification
2. Complete Phase 2: Foundational changes (CRITICAL — blocks all stories)
3. Complete Phase 3: US1 (Create Room + host indicator)
4. **STOP and VALIDATE**: `npm run build` both dirs; open app, create room, verify 6-char code + "(Host)" label
5. MVP is demonstrable at this point

### Incremental Delivery

1. Setup + Foundational → clean baseline with model changes
2. + US1 → create room works end-to-end *(MVP)*
3. + US2 → join room with validation works
4. + US3 → auto-polling replaces manual refresh
5. + US4 → host can start game; all clients auto-navigate
6. Polish → builds pass, S1–S8 validated

---

## Notes

- `[P]` = different files, no blocking dependencies on in-progress tasks
- `[USn]` label maps each task to its user story for commit traceability (e.g., commit message: `T006 S1-AC1`)
- LobbyPage.tsx is touched by T007 (US1), T009 (US3), and T015 (US4) — must be done sequentially in that order
- `api.ts` (frontend) is touched by T005 (foundational) and T013 (US4) — T013 must be after T005
- `schemas.ts` (backend) is touched by T003 (foundational) and T010 (US4) — T010 must be after T003
- `roomStore.ts` (backend) is touched by T004 (foundational) and T011 (US4) — T011 must be after T004
- The constitution requires `npm run build` to pass before any commit — use T016/T017 as your commit gate
