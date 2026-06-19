# Feature Specification: Game Start & Drawer Flow

**Feature Branch**: `002-game-start-drawer`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Scenario 2 — Game Start & Drawer Flow
Given a game is starting and player names are trimmed (empty/whitespace-only rejected with a message), When the first round begins, Then the host (or first player) becomes the clearly-identified drawer, and the secret word (deterministically selected from the starter list) is visible only to the drawer."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Transition from Lobby to Game View (Priority: P1)

When the host starts the game from the lobby, all players — both the host and non-host participants — are moved from the lobby screen to the game screen. Each player's game view reflects their assigned role for the round: the first player (room creator) is the drawer and everyone else is a guesser.

**Why this priority**: The game cannot begin without a successful lobby-to-game transition. This is the entry point for the entire game experience and a prerequisite for all other game-play scenarios.

**Independent Test**: With two players in a lobby, the host clicks "Start Game." Both browser tabs transition to the game screen. Tab A (host/drawer) sees a different view from Tab B (guesser), confirming roles are assigned on transition.

**Acceptance Scenarios**:

1. **Given** a room is in lobby status with at least 2 players, **When** the host starts the game, **Then** all players are transitioned to the game view and the room status changes to active.
2. **Given** the game view loads for a player, **When** that player is the first participant (room creator), **Then** they are identified as the drawer for this round.
3. **Given** the game view loads for a player, **When** that player joined after the room was created, **Then** they are identified as a guesser for this round.

---

### User Story 2 - Drawer Sees the Secret Word (Priority: P2)

The drawer is shown the secret word for the round. The word is drawn deterministically from the starter seed list. No other player can see the secret word.

**Why this priority**: The secret word is the central mechanic of the drawing round. Without it, the drawer cannot perform their role. The word must be visible to the drawer and hidden from all guessers.

**Independent Test**: Start a game with two browser tabs. The drawer's tab shows a clearly labeled secret word. The guesser's tab shows no secret word — the word area is absent or replaced with a neutral message.

**Acceptance Scenarios**:

1. **Given** the game has started and a player is the drawer, **When** they view the game screen, **Then** the secret word for this round is displayed clearly and prominently to them.
2. **Given** the game has started and a player is a guesser, **When** they view the game screen, **Then** the secret word is not visible anywhere on their screen.
3. **Given** the secret word is selected, **When** examining which word was chosen, **Then** the word is one of the five words from the starter seed list: rocket, pizza, castle, guitar, sunflower.
4. **Given** the same game is started repeatedly under identical conditions, **When** comparing the selected word each time, **Then** the word selection is deterministic — the same word is always chosen for the first round.

---

### User Story 3 - Player Role Identification (Priority: P3)

Every player on the game screen can clearly see their own assigned role for the round. The drawer knows they are drawing; guessers know they are guessing. This prevents confusion about who should be doing what.

**Why this priority**: Role clarity is a UX requirement that makes the other game mechanics usable. Without clear role indication, players cannot understand what action they are expected to take.

**Independent Test**: Open two browser tabs. After game start, Tab A shows a clear "You are drawing" indicator. Tab B shows a clear "You are guessing" indicator. Neither tab shows the other player's role indicator.

**Acceptance Scenarios**:

1. **Given** a player is the drawer, **When** they view the game screen, **Then** their role is clearly labeled (e.g., "You are the drawer" or equivalent).
2. **Given** a player is a guesser, **When** they view the game screen, **Then** their role is clearly labeled (e.g., "You are guessing" or equivalent).
3. **Given** any player views the game screen, **When** they look for role information, **Then** the role label is unambiguous and not hidden behind other UI elements.

---

### Edge Cases

- What happens if the game screen loads but the room data is unavailable or the session is lost? The player is redirected to the home screen with a neutral message.
- While waiting for the first poll response on the game screen, the UI renders a blank/empty state. No loading indicator is shown.
- What happens if a player navigates directly to the game URL without going through the lobby? They are redirected to the home screen (no valid room session).
- What if the starter seed list is empty or unavailable? This is a backend configuration error; the game should not start if no words are available. (Out of scope for this scenario — the seed list is static and always present.)
- What if two words have equal selection priority under the deterministic algorithm? The algorithm must define a fixed tie-breaking rule so the outcome is always the same.

## Clarifications

### Session 2026-06-19

- Q: How should FR-006 (secret word hidden from guessers) be enforced — backend API filtering or UI-only? → A: Backend API omits the word from responses for guesser-role clients (server-side enforcement).
- Q: Who can trigger the "Start Game" action — host only or any player? → A: Host only (room creator).
- Q: Minimum number of players required before the host can start the game? → A: 2 players minimum.
- Q: How does the frontend identify which room a player belongs to on the `/game` route? → A: `roomCode` passed as a URL query parameter (e.g., `/game?room=ABC123`).
- Q: What should players see on the game screen while waiting for room data to load? → A: Blank/empty game screen until the first poll response arrives (no loading indicator).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When the game starts, all players MUST be transitioned to the game view simultaneously (within the polling window).
- **FR-001a**: Only the host (room creator) MAY trigger the "Start Game" action. Non-host players MUST NOT see or be able to activate the Start Game control.
- **FR-001b**: The Start Game action MUST be disabled (or not rendered) when fewer than 2 players are present in the lobby. The game MUST NOT start with a single participant.
- **FR-002**: The first participant in the room (the room creator / host) MUST be assigned the drawer role for the first round.
- **FR-003**: All participants who are not the drawer MUST be assigned the guesser role for the first round.
- **FR-004**: The secret word MUST be selected deterministically from the starter seed list (rocket, pizza, castle, guitar, sunflower). The selection algorithm MUST produce the same word every time for the first round under identical conditions.
- **FR-005**: The secret word MUST be displayed to the drawer on the game screen.
- **FR-006**: The secret word MUST NOT be visible anywhere on the game screen for guesser-role players. The enforcement mechanism MUST be server-side — not UI-only.
- **FR-007**: Each player's role (drawer or guesser) MUST be clearly and unambiguously labeled on their game screen.
- **FR-008**: A player who navigates to the game screen without a resolvable active room session MUST be redirected to the home screen.

### Key Entities

- **Round**: Represents one drawing-and-guessing cycle within an active room. Attributes: assigned drawer (participant ID), secret word, round number (1 for first round).
- **Role**: A player's function within a round — either `drawer` or `guesser`. Derived from participant position: index 0 = drawer, all others = guesser.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All players transition from lobby to game screen within the polling window (~2 seconds) of the host starting the game — verified across two simultaneous browser sessions.
- **SC-002**: 100% of game sessions assign the drawer role to the room creator (first participant) and the guesser role to all other participants — verifiable by comparing participant order with displayed role labels.
- **SC-003**: The secret word displayed to the drawer is always one of the five starter seed words, verified across multiple game starts.
- **SC-004**: The secret word is never visible on any guesser's game screen — verified by inspecting the guesser's game view after game start.
- **SC-005**: Role labels are present and unambiguous for 100% of players on the game screen, verified across two simultaneous browser sessions.

## Assumptions

- Word selection for the first round uses the first word from the starter seed list (index 0: "rocket") as the deterministic choice. This guarantees identical behavior on every run without requiring a counter or persistent state.
- The transition from lobby to game is driven by the same polling mechanism established in Scenario 1 (status changes to "active" and clients navigate on the next poll).
- Player name validation (non-empty, 1–20 chars, whitespace-only rejected) is already enforced at the lobby entry point (Scenario 1). This scenario does not re-implement name validation — it inherits the constraint.
- The game screen is a single shared route (`/game`). Role-specific content (secret word visibility, role label) is rendered conditionally based on the player's identity matched against the room's drawer assignment.
- Implementation detail (FR-008): room identity is conveyed via a URL query parameter (`/game?room=CODE`); player identity is persisted in browser session storage. If either is absent on navigation, the player has no resolvable session and is redirected to the home screen.
- Implementation detail (FR-006): the server omits the secret word from API responses sent to any client whose identity does not match the drawer assignment. The client never receives the word and therefore cannot display it.
- Only the first round is in scope for this scenario. Drawer rotation, subsequent rounds, and timers are explicitly out of scope.
- The starter seed list is static and always present; no error handling for a missing or empty word list is required in this scenario.
