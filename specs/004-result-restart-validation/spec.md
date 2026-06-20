# Feature Specification: Result, Restart & Final Validation

**Feature Branch**: `004-result-restart-validation`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "Scenario 4 - Result, Restart & Final Validation: Given a round has ended, When the result state is displayed and the host restarts, Then all players see the correct word, final scores, and full guess history; on restart, everyone returns to the lobby with players preserved and all round state cleared."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Round Results (Priority: P1)

After a round ends, every player (both the drawer and guessers) sees a results screen displaying the correct word, the final scores of all players, and the full guess history from that round. This gives all participants a clear summary of what happened before deciding to play again.

**Why this priority**: This is the core deliverable of the feature — players need to see what the word was and how everyone scored before any other action makes sense.

**Independent Test**: Open two browser tabs (host + one guesser), play a round through to end, and confirm both tabs independently show the same results screen with the correct word, scores, and guess history.

**Acceptance Scenarios**:

1. **Given** a round has ended (time expired or all players guessed correctly), **When** the result screen is displayed, **Then** every connected player sees the correct word that was being drawn.
2. **Given** a round has ended, **When** the result screen is displayed, **Then** every connected player sees the final score for each player in the room.
3. **Given** a round has ended, **When** the result screen is displayed, **Then** every connected player sees the full chronological guess history (all guesses submitted during the round, including incorrect ones).
4. **Given** a round has ended, **When** a new player joins before the host restarts, **Then** the results screen is still shown to that player (room is in "result" state, not accepting new guesses).

---

### User Story 2 - Host Restarts the Game (Priority: P1)

After reviewing the results, the host clicks a "Restart" or "Play Again" button. All players are returned to the lobby screen. Players previously in the room remain in the room — no one is dropped. All round-specific state (the word, guesses, scores from the last round) is cleared so the next round starts fresh.

**Why this priority**: Restart is the primary exit from the result state and must work correctly for the game loop to function.

**Independent Test**: After a round ends, the host clicks restart; verify in two browser tabs that both players transition to the lobby view with their names intact and no round data visible.

**Acceptance Scenarios**:

1. **Given** the result screen is displayed, **When** the host clicks "Restart", **Then** all connected players' screens transition to the lobby view.
2. **Given** the result screen is displayed, **When** the host clicks "Restart", **Then** the player list in the lobby shows exactly the same players who were in the room at the end of the round (no players lost or added).
3. **Given** the result screen is displayed, **When** the host clicks "Restart", **Then** all round state is cleared: the word is unset, the guess history is empty, and scores are reset to zero.
4. **Given** the result screen is displayed, **When** a non-host player views the screen, **Then** the "Restart" button is either not visible or disabled — only the host can initiate a restart.
5. **Given** the result screen is displayed, **When** the host clicks "Restart", **Then** the room transitions to the lobby state and the host can start a new round.

---

### User Story 3 - Consistent State Across Clients (Priority: P2)

All clients polling the server during and after the result phase see the same consistent state. There are no race conditions where one client shows stale data while another has already transitioned.

**Why this priority**: State consistency is foundational but secondary to the visible user-facing behaviors in P1; it validates that the polling mechanism delivers the same truth to every client.

**Independent Test**: Open three browser tabs simultaneously (host + two guessers), end a round, and confirm all three tabs show identical results data and transition together on restart.

**Acceptance Scenarios**:

1. **Given** a round has ended, **When** the server transitions to "result" state, **Then** all clients polling within one polling interval see the result state (within approximately 2 seconds).
2. **Given** the host has clicked "Restart", **When** the server transitions to "lobby" state, **Then** all clients polling within one polling interval see the lobby state (within approximately 2 seconds).
3. **Given** a player closes and reopens their browser tab while the result screen is active, **When** they rejoin the same room, **Then** they see the current result state with the same word, scores, and guess history.

---

### Edge Cases

- What happens when the host disconnects (stops polling) on the result screen? The room remains in result state; other players continue to see results; a non-host player cannot restart.
- What happens if a player joins a room that is currently in "result" state? They see the result screen (room is not in a state that accepts new actions from late joiners).
- What happens when the host restarts but a client is mid-poll? The client will receive the updated lobby state on its next poll and transition accordingly.
- What happens if a player's score is 0 at the end of the round? They still appear in the results with a score of 0.
- What happens if no guesses were made during the round? The guess history is empty but still displayed (or shows an appropriate empty state message).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST transition all connected players to a "result" view when the round ends.
- **FR-002**: The result view MUST display the correct word (the word that was being drawn).
- **FR-003**: The result view MUST display the final score for every player currently in the room.
- **FR-004**: The result view MUST display the full chronological guess history from the round (player name, guess text, and whether it was correct).
- **FR-005**: Only the host MUST be able to initiate a restart; non-host players MUST NOT have access to the restart action.
- **FR-006**: When the host restarts, the system MUST transition all connected players to the lobby view.
- **FR-007**: After restart, the player list MUST contain exactly the same players as before the restart (no players dropped, no new players added by the restart action itself).
- **FR-008**: After restart, all round-specific state MUST be cleared: the current word is unset, the guess history is empty, and all player scores are reset to zero.
- **FR-009**: The room state MUST be exposed via polling so all clients see consistent state transitions within approximately 2 seconds.
- **FR-010**: The lobby shown after restart MUST allow the host to start a new round (same flow as the initial lobby).

### Key Entities

- **Room**: Represents the shared game session. Key attributes without implementation: room state (lobby / drawing / result), current word, player list, guess history.
- **Player**: A participant in the room. Key attributes: name, score, host flag.
- **Guess**: A single guess attempt. Key attributes: player name, guess text, correct/incorrect flag, timestamp or order.
- **Round Result**: A snapshot produced at round end. Key attributes: correct word, final scores per player, ordered guess history.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All players see the result screen (correct word, scores, guess history) within 2 seconds of the round ending.
- **SC-002**: After the host clicks "Restart", all players see the lobby screen within 2 seconds.
- **SC-003**: 100% of players present at round end appear in the post-restart lobby with their names intact.
- **SC-004**: Zero round-state data (word, guesses, scores) persists in the lobby after a restart — confirmed via a fresh round start.
- **SC-005**: Two-browser validation (host + guesser) passes for both the result display scenario and the restart scenario with no manual reconciliation required.

## Assumptions

- A round ends either when the timer expires or all guessers have correctly guessed the word (per the existing gameplay spec); this feature handles the state transition from that end-of-round moment onward.
- Scores are per-round only (not cumulative across rounds); restarting resets scores to zero, consistent with the single-round scope of the game.
- The "host" is determined by the room creator (established in the room-setup spec); this feature does not change host assignment.
- Backend room state is in-memory; restarting the backend server clears all rooms — this is expected and out of scope for this feature.
- The polling interval remains approximately 2 seconds (per the constitution), consistent with existing sync behavior.
- No authentication or session management is needed; players are identified by the name they entered when joining.
- The guess history preserves insertion order (chronological order of submission).
- The restart action resets scores to zero rather than retaining cumulative scores across rounds, as multi-round scoring is out of scope per the constitution.
