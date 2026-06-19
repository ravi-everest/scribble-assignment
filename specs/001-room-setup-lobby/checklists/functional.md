# Functional Completeness Checklist: Room Setup & Lobby

**Purpose**: Validate that functional requirements are complete, clear, and ready for planning — not to verify implementation behavior
**Created**: 2026-06-19
**Feature**: [spec.md](../spec.md)
**Audience**: Author (self-review before `/speckit-plan`)
**Focus**: Functional completeness — gaps, ambiguities, and missing scenario coverage

---

## Requirement Completeness

- [ ] CHK001 — Are acceptance scenarios for US1 (Create Room) and US2 (Join Room) updated to include the display name entry step as an explicit prerequisite? [Completeness, Spec §US1/US2]
- [ ] CHK002 — Is an error message specified for display names that exceed 20 characters (content, phrasing, or minimum criteria)? [Completeness, Spec §FR-011]
- [ ] CHK003 — Are requirements defined for the maximum number of players allowed per room? [Gap]
- [ ] CHK004 — Is room code case-sensitivity handling explicitly required — e.g., is lowercase input normalized to uppercase before lookup? [Completeness, Spec §Edge Cases]
- [ ] CHK005 — Is a requirement defined for what non-host players see while waiting for the host to start (e.g., greyed-out indicator, instructional message)? [Gap]
- [ ] CHK006 — Is the lobby polling behavior during and after the Start Game transition (FR-009) specified — does polling stop, continue, or redirect? [Completeness, Gap]
- [ ] CHK007 — Are requirements defined for how room code uniqueness is guaranteed when multiple rooms are created concurrently? [Completeness, Spec §FR-001]
- [ ] CHK008 — Is a requirement defined for what remaining players see if the host disconnects before starting — is the room still joinable or effectively dead? [Completeness, Spec §Edge Cases]

---

## Requirement Clarity

- [ ] CHK009 — Is "approximately 2 seconds" in FR-007 and SC-003 defined with an explicit acceptable tolerance (e.g., ±500ms)? [Clarity, Spec §FR-007/SC-003]
- [ ] CHK010 — Is "visually distinguished as host" in US1 acceptance scenario 2 defined with specific, testable visual criteria (e.g., label text, badge, icon)? [Clarity, Spec §US1]
- [ ] CHK011 — Is "clear, visible error message" in FR-003 and FR-004 specified with minimum content requirements or example message text? [Clarity, Spec §FR-003/FR-004]
- [ ] CHK012 — Is "disabled or absent" in FR-008 resolved to a single consistent behavior — should the Start Game control be hidden entirely or rendered but non-interactive when fewer than 2 players are present? [Ambiguity, Spec §FR-008]
- [ ] CHK013 — Does FR-009 specify what game state or view all players transition to when Start Game is activated, or is the destination left undefined? [Clarity, Spec §FR-009]

---

## Scenario Coverage

- [ ] CHK014 — Are acceptance scenarios defined for all display name validation failure cases (empty, whitespace-only, >20 characters) in both create and join flows? [Coverage, Gap]
- [ ] CHK015 — Is a scenario defined for the transition period between Start Game activation and the game view appearing — what do players see in the interim? [Coverage, Gap]
- [ ] CHK016 — Is the behavior defined for a player who attempts to join a second room while already connected to one? [Coverage, Edge Case, Gap]
- [ ] CHK017 — Are acceptance scenarios in US3 (Lobby Polling) explicitly covering the initial empty-list state before the first poll response? [Coverage, Spec §US3/Edge Cases]
- [ ] CHK018 — Are alternate-flow scenarios defined for create or join failures beyond invalid codes — e.g., what does the user see if the server is unreachable? [Coverage, Gap]

---

## Acceptance Criteria Quality

- [ ] CHK019 — Is the start point for SC-001 ("under 5 seconds") unambiguously defined — does the clock start at name entry or at "Create Room" click? [Measurability, Spec §SC-001]
- [ ] CHK020 — Does SC-005 define a testable procedure for verifying "exclusively for the host" across two simultaneous browser sessions — what specific observations confirm exclusivity? [Measurability, Spec §SC-005]
- [ ] CHK021 — Is SC-004 ("100% of invalid or empty codes rejected") measurable with a defined input set — are representative test cases (e.g., empty string, unknown code, expired room) enumerated? [Measurability, Spec §SC-004]
- [ ] CHK022 — Are all six success criteria (SC-001 through SC-006) each traceable to at least one acceptance scenario in the User Stories section? [Traceability, Spec §Success Criteria]

---

## Notes

- Items marked `[Gap]` indicate requirements absent from the spec — resolve before `/speckit-plan`
- Items marked `[Ambiguity]` indicate existing requirements with multiple valid interpretations — resolve to a single canonical statement
- Items marked `[Measurability]` indicate success criteria that may be difficult to verify objectively without further specification
- CHK003 (max players) is likely "no hard cap" for this scenario given in-memory storage — if so, document that explicitly as an assumption
