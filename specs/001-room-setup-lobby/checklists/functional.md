# Functional Completeness Checklist: Room Setup & Lobby

**Purpose**: Validate that functional requirements are complete, clear, and ready for planning — not to verify implementation behavior
**Created**: 2026-06-19
**Reviewed**: 2026-06-19 (pre-implement review — all items evaluated against spec, clarifications, contracts, tasks, and quickstart)
**Feature**: [spec.md](../spec.md)
**Audience**: Author (self-review before `/speckit-plan`)
**Focus**: Functional completeness — gaps, ambiguities, and missing scenario coverage

---

## Requirement Completeness

- [x] CHK001 — Are acceptance scenarios for US1 (Create Room) and US2 (Join Room) updated to include the display name entry step as an explicit prerequisite? [Completeness, Spec §US1/US2]
  > Addressed via FR-011 and T006/T008. Clarification Q1 locked the requirement. Acceptance scenario precondition is implicit in FR-011.
- [x] CHK002 — Is an error message specified for display names that exceed 20 characters (content, phrasing, or minimum criteria)? [Completeness, Spec §FR-011]
  > T006 specifies "Name must be 20 characters or fewer" as the canonical message text.
- [x] CHK003 — Are requirements defined for the maximum number of players allowed per room? [Gap]
  > No cap by design — in-memory store, lab scope. Acceptable as implicit unbounded. No blocking impact.
- [x] CHK004 — Is room code case-sensitivity handling explicitly required — e.g., is lowercase input normalized to uppercase before lookup? [Completeness, Spec §Edge Cases]
  > JoinRoomPage normalises input via `.toUpperCase()`; backend `rooms.ts` normalises path param. Documented in contracts/api.md.
- [x] CHK005 — Is a requirement defined for what non-host players see while waiting for the host to start (e.g., greyed-out indicator, instructional message)? [Gap]
  > US4 AC3 specifies no active Start Game button for non-hosts. Existing LobbyPage renders "Waiting for the host to start the game."
- [x] CHK006 — Is the lobby polling behavior during and after the Start Game transition (FR-009) specified — does polling stop, continue, or redirect? [Completeness, Gap]
  > T015 wires the poll loop to detect `status === "active"` and navigate all clients to `/game`. Polling drives the transition.
- [x] CHK007 — Are requirements defined for how room code uniqueness is guaranteed when multiple rooms are created concurrently? [Completeness, Spec §FR-001]
  > Node.js is single-threaded; `generateUniqueCode()` while-loop is race-condition-free within process.
- [x] CHK008 — Is a requirement defined for what remaining players see if the host disconnects before starting — is the room still joinable or effectively dead? [Completeness, Spec §Edge Cases]
  > Documented in spec Edge Cases: "room becomes inaccessible; host migration is out of scope."

---

## Requirement Clarity

- [x] CHK009 — Is "approximately 2 seconds" in FR-007 and SC-003 defined with an explicit acceptable tolerance (e.g., ±500ms)? [Clarity, Spec §FR-007/SC-003]
  > Acceptable for lab scope. `setInterval(2000)` is the implementation. Manual two-browser validation does not require sub-ms precision.
- [x] CHK010 — Is "visually distinguished as host" in US1 acceptance scenario 2 defined with specific, testable visual criteria (e.g., label text, badge, icon)? [Clarity, Spec §US1]
  > T007 specifies rendering a "(Host)" label when `participant.id === room.hostId`.
- [x] CHK011 — Is "clear, visible error message" in FR-003 and FR-004 specified with minimum content requirements or example message text? [Clarity, Spec §FR-003/FR-004]
  > US2 AC3 example: "Room not found". US2 AC4 example: "Please enter a room code".
- [x] CHK012 — Is "disabled or absent" in FR-008 resolved to a single consistent behavior — should the Start Game control be hidden entirely or rendered but non-interactive when fewer than 2 players are present? [Ambiguity, Spec §FR-008]
  > Resolved 2026-06-19: FR-008 and US4 AC1 both updated to "rendered but disabled".
- [x] CHK013 — Does FR-009 specify what game state or view all players transition to when Start Game is activated, or is the destination left undefined? [Clarity, Spec §FR-009]
  > FR-009 says "game view"; `/game` route is the established destination in the router.

---

## Scenario Coverage

- [x] CHK014 — Are acceptance scenarios defined for all display name validation failure cases (empty, whitespace-only, >20 characters) in both create and join flows? [Coverage, Gap]
  > T006 and T008 enumerate all three cases. Quickstart S4 covers manual validation of all three.
- [x] CHK015 — Is a scenario defined for the transition period between Start Game activation and the game view appearing — what do players see in the interim? [Coverage, Gap]
  > No special interim state required. Polling architecture: host navigates immediately on API success; non-hosts navigate on next poll cycle (~2s). Acceptable.
- [x] CHK016 — Is the behavior defined for a player who attempts to join a second room while already connected to one? [Coverage, Edge Case, Gap]
  > Out of scope. Same-tab create/join overwrites RoomStore state silently. No cross-room session management in scope.
- [x] CHK017 — Are acceptance scenarios in US3 (Lobby Polling) explicitly covering the initial empty-list state before the first poll response? [Coverage, Spec §US3/Edge Cases]
  > Covered in spec Edge Cases: "player list renders immediately as empty and updates in place when the first poll response is received."
- [x] CHK018 — Are alternate-flow scenarios defined for create or join failures beyond invalid codes — e.g., what does the user see if the server is unreachable? [Coverage, Gap]
  > Generic network errors caught by try/catch in both pages and displayed via `setError`. Constitution mandates visible error for all failure states.

---

## Acceptance Criteria Quality

- [x] CHK019 — Is the start point for SC-001 ("under 5 seconds") unambiguously defined — does the clock start at name entry or at "Create Room" click? [Measurability, Spec §SC-001]
  > SC-001 explicitly states "from clicking 'Create Room'" — start point is unambiguous.
- [x] CHK020 — Does SC-005 define a testable procedure for verifying "exclusively for the host" across two simultaneous browser sessions — what specific observations confirm exclusivity? [Measurability, Spec §SC-005]
  > SC-005 specifies "verified across two simultaneous browser sessions". Quickstart S6/S7 provide the step-by-step procedure.
- [x] CHK021 — Is SC-004 ("100% of invalid or empty codes rejected") measurable with a defined input set — are representative test cases (e.g., empty string, unknown code, expired room) enumerated? [Measurability, Spec §SC-004]
  > Quickstart S3 enumerates: empty code, unknown code (e.g., `ZZZZZZ`). Representative set for manual validation.
- [x] CHK022 — Are all six success criteria (SC-001 through SC-006) each traceable to at least one acceptance scenario in the User Stories section? [Traceability, Spec §Success Criteria]
  > SC-001→US1, SC-002→US2 AC1/AC2, SC-003→US3 AC1/AC2, SC-004→US2 AC3/AC4 + FR-011, SC-005→US4 AC1/AC2/AC3, SC-006→US1 AC3. All six covered.

---

## Notes

- All 22 items reviewed 2026-06-19 against spec + clarifications + contracts/api.md + tasks.md + quickstart.md
- CHK003: No player cap is by design for this lab scenario (in-memory, no game mechanics requiring a cap)
- CHK009: "approximately 2 seconds" tolerance is acceptable without a hard ±ms bound given manual two-browser validation
- CHK015/CHK016/CHK018: Gaps acknowledged as acceptable for scenario scope; no blocking issues
