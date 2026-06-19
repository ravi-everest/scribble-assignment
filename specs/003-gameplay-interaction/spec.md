# Feature Specification: Gameplay Interaction

**Feature Branch**: `003-gameplay-interaction`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Scenario 3 — Gameplay Interaction
Given a round is active with a drawer and guessers (all scores start at 0), When the drawer draws/clears the canvas and guessers submit their guesses, Then the drawing is visible on the drawer's screen; guesses are trimmed, case-insensitively compared, and empty ones rejected; the guess history is synced to all players via polling; correct guesses score 100 (incorrect add 0)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drawer Sees Own Drawing (Priority: P1)

The drawer is active in the game round and sees their own canvas as they draw. When they draw strokes or clear the canvas, those changes are immediately visible on their own screen.

**Why this priority**: This is the foundational drawing mechanic — without the drawer seeing their own canvas, no gameplay is possible. All other interactions depend on this working first.

**Independent Test**: Can be tested with a single browser tab as the host/drawer — join a room, start a game, draw on the canvas and confirm strokes appear and the clear button removes them.

**Acceptance Scenarios**:

1. **Given** a round is active and the current user is the drawer, **When** the drawer makes strokes on the canvas, **Then** the drawing is visible in real time on the drawer's own screen.
2. **Given** the drawer has strokes on the canvas, **When** the drawer clicks the clear button, **Then** the canvas is fully reset to blank.

---

### User Story 2 - Guesser Submits a Guess (Priority: P1)

A guesser types a word into the guess input and submits it. The system trims whitespace, compares the guess case-insensitively to the secret word, and either awards 100 points for a correct guess or 0 for an incorrect one. Empty guesses (blank or whitespace-only) are rejected without submission.

**Why this priority**: Guess evaluation is the core win condition. A guesser must be able to participate meaningfully and receive accurate feedback within the same round.

**Independent Test**: Can be tested by opening a second browser tab as a guesser, submitting "  Pizza  " (padded/mixed case) for the word "pizza" and confirming 100 points are awarded; submitting "castle" for "pizza" and confirming 0 points; submitting "   " (whitespace only) and confirming no submission occurs.

**Acceptance Scenarios**:

1. **Given** a round is active and the user is a guesser, **When** the guesser submits a guess that matches the secret word after trimming and case-folding, **Then** the guesser's score increases by 100 points.
2. **Given** a round is active and the user is a guesser, **When** the guesser submits a guess that does not match the secret word after trimming and case-folding, **Then** the guesser's score remains unchanged (0 added).
3. **Given** a round is active and the user is a guesser, **When** the guesser submits an empty or whitespace-only guess, **Then** the system rejects the submission and no guess is recorded.

---

### User Story 3 - Guess History Synced to All Players (Priority: P2)

After any player submits a guess, the guess history (list of who guessed what, and whether it was correct) becomes visible to all players in the room — drawer and guessers alike — via periodic polling.

**Why this priority**: Without shared guess history, players cannot track round progress. This is secondary to core guess submission but needed for a complete round experience.

**Independent Test**: Can be tested with two browser tabs — one as drawer and one as guesser. Submit a guess in the guesser tab and confirm it appears in both tabs' guess history within the polling interval.

**Acceptance Scenarios**:

1. **Given** a round is active, **When** a guesser submits a guess (correct or incorrect), **Then** the guess (guesser name + guess text + correct/incorrect status) appears in the guess history visible to all players in the room.
2. **Given** a round is active with multiple players, **When** the drawer's browser polls for state, **Then** the drawer's view shows the same guess history as the guessers' views.
3. **Given** the guess history has entries, **When** a new player polls for room state, **Then** they receive the full accumulated guess history, not just recent entries.

---

### Edge Cases

- What happens when a guesser submits the same correct word twice? (Assume the second submission is still evaluated — score keeps accumulating; no deduplication required.)
- What happens when two guessers submit the correct answer simultaneously? (Each receives their own 100-point award independently.)
- What happens when the guess input contains only whitespace (e.g., tabs, multiple spaces)? (Must be rejected as empty — not submitted.)
- What happens when the polling request fails transiently? (Guess history may be stale for one interval; the UI does not crash; the next poll resumes normally.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The drawer's canvas MUST display strokes in real time as the drawer draws, without requiring a page refresh.
- **FR-002**: The drawer MUST be able to clear the entire canvas with a single action, resetting it to blank.
- **FR-003**: Guessers MUST be able to submit a word guess via a text input and submit action (button or keyboard shortcut).
- **FR-004**: The system MUST trim leading and trailing whitespace from all submitted guesses before comparison.
- **FR-005**: The system MUST compare submitted guesses to the secret word case-insensitively.
- **FR-006**: The system MUST reject empty or whitespace-only guesses without recording them or updating any score.
- **FR-007**: A correct guess MUST award exactly 100 points to the guesser's score.
- **FR-008**: An incorrect guess MUST award exactly 0 points (score unchanged).
- **FR-009**: All players (drawer and guessers) MUST receive updated guess history via periodic HTTP polling, with an interval of approximately 2 seconds (consistent with the project's lobby polling standard).
- **FR-010**: The guess history MUST record each guess's submitter name, the guessed text, and whether the guess was correct or incorrect.
- **FR-011**: All players' scores start at 0 at the beginning of the round.
- **FR-012**: The drawer MUST NOT be able to submit guesses during the round in which they are the drawer.

### Key Entities

- **Round**: The active game state containing the secret word, the designated drawer, all participants, and the accumulated guess history.
- **Guess**: A single guess submission containing the guesser's name, the submitted (pre-trim) or stored (post-trim) text, and a correct/incorrect flag.
- **Player Score**: A per-player integer score accumulating correct-guess awards (100 points each) within the round.
- **Canvas State**: The current set of strokes on the shared drawing surface, owned by the drawer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The drawer sees their own strokes appear on the canvas within one animation frame (imperceptibly fast under normal conditions) — no perceptible lag between drawing and seeing the stroke.
- **SC-002**: A correctly spelled guess (with any mix of case or surrounding spaces) is evaluated correctly and scores 100 points 100% of the time.
- **SC-003**: An empty or whitespace-only submission never reaches the server — it is blocked at submission time, 0% of such entries are recorded.
- **SC-004**: All players in the room see the same guess history within two polling cycles (approximately 4 seconds in the worst case, 2 seconds on average).
- **SC-005**: Scores for all players accurately reflect accumulated correct guesses at the time of any poll response — no score drift or miscalculation.

## Assumptions

- All players (drawer and guessers) are connected to the same in-memory room on the server; there is no cross-server or distributed state.
- The secret word for the round is already determined before gameplay interaction begins (word selection is out of scope for this scenario).
- Drawer assignment (host = drawer for first round) is already resolved before this scenario's behavior begins.
- The canvas is local to the drawer's browser; guessers do not need to see the drawing in this scenario — canvas sync to guessers is out of scope unless explicitly specified in a future scenario.
- Polling uses the existing REST endpoints already established by the starter; no new transport mechanism is introduced.
- Round end conditions (all guessed, time limit, etc.) are out of scope — this scenario covers in-round interaction only.
- The word list is fixed (`rocket`, `pizza`, `castle`, `guitar`, `sunflower`) as specified in the constitution; no custom words.
- Mobile or touch input for drawing is not required; mouse-based drawing on desktop is the target.
