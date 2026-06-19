# Feature Specification: Room Setup & Lobby

**Feature Branch**: `001-room-setup-lobby`

**Created**: 2026-06-19

**Status**: Draft

**Input**: User description: "Scenario 1 — Room Setup & Lobby
Given a player wants to host or join a drawing game, When they create or join a room via a unique code, Then the creator is automatically the host; invalid/empty codes are rejected with clear feedback; rooms are fully isolated; the lobby refreshes via polling (~2s); and only the host can start the game once at least 2 players are present."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create a Room as Host (Priority: P1)

A player opens the app and creates a new room. The system generates a unique room code and immediately designates that player as the host. The host is taken to a lobby screen where they can see connected players and wait for others to join.

**Why this priority**: Room creation is the entry point for any game session. Without it, no other lobby or game functionality is reachable. It is the foundation all other stories build on.

**Independent Test**: Can be fully tested by opening the app, clicking "Create Room", and verifying a room code appears and the player is listed as host in the lobby.

**Acceptance Scenarios**:

1. **Given** a player is on the home screen, **When** they click "Create Room", **Then** a unique room code is generated, the player is added to the room as host, and the lobby screen is displayed showing the code and the host's name.
2. **Given** a host is in the lobby, **When** they view the player list, **Then** their name is visually distinguished as host (e.g., labelled or marked).
3. **Given** two separate players each create a room, **When** both lobbies are active simultaneously, **Then** each room's player list and state are independent and do not bleed into each other.

---

### User Story 2 - Join an Existing Room (Priority: P2)

A player enters a room code shared by the host and joins the existing room. They are added to the lobby as a non-host participant and can see all currently connected players.

**Why this priority**: Without a join flow the host has no one to play with. This is the second core interaction required for any game to begin.

**Independent Test**: Can be fully tested by creating a room in one browser tab, then opening a second tab, entering the room code, and verifying both players appear in each other's lobby.

**Acceptance Scenarios**:

1. **Given** a valid room code exists, **When** a player enters the code and clicks "Join Room", **Then** they are added to the room as a non-host participant and the lobby screen is displayed showing all current players.
2. **Given** a player is in the lobby they just joined, **When** the host is also in the lobby, **Then** the new player can see the host and the host's lobby view updates to show the new player within approximately 2 seconds.
3. **Given** a player enters a code for a room that does not exist, **When** they submit the join form, **Then** a clear, visible error message is shown (e.g., "Room not found") and the player remains on the join screen.
4. **Given** a player submits an empty room code field, **When** they click "Join Room", **Then** a clear validation message is shown (e.g., "Please enter a room code") and no join attempt is made.

---

### User Story 3 - Lobby Polling & Live Player List (Priority: P3)

While waiting in the lobby, all players see the current player list refresh automatically at approximately 2-second intervals without requiring a manual page reload. The lobby reflects players joining in near-real time.

**Why this priority**: Without auto-refresh, the host cannot see when enough players have joined, making the "Start Game" control unusable. This is required before the host can act.

**Independent Test**: Can be fully tested by having two browser tabs open to the same lobby and joining from the second tab; within ~2 seconds the first tab's player list should show the new joiner without any manual action.

**Acceptance Scenarios**:

1. **Given** a host is in the lobby with one player, **When** a second player joins, **Then** the host's lobby view reflects the new player within approximately 2 seconds without a manual refresh.
2. **Given** a player is in the lobby, **When** polling is active, **Then** the player list updates continuously at approximately 2-second intervals.

---

### User Story 4 - Host Starts the Game (Priority: P4)

Once at least 2 players are present in the lobby, the host sees an enabled "Start Game" button. When the host clicks it, the game session begins. Non-host players cannot start the game.

**Why this priority**: Game start is the terminal action of the lobby phase. It depends on all prior stories being in place and caps the scope of this scenario.

**Independent Test**: Can be fully tested by having at least 2 players in a lobby and verifying only the host's UI shows an active "Start Game" button that transitions all players to the game screen.

**Acceptance Scenarios**:

1. **Given** fewer than 2 players are in the lobby, **When** the host views the lobby, **Then** the "Start Game" button is disabled or absent, preventing premature game start.
2. **Given** at least 2 players are in the lobby, **When** the host clicks "Start Game", **Then** the game begins and all players in the room are transitioned to the game view.
3. **Given** a non-host player is in the lobby with 2+ players present, **When** they view the lobby, **Then** no "Start Game" button is visible or interactive for them.

---

### Edge Cases

- What happens when a player enters a room code with mixed case or extra whitespace? The code should be normalized (trimmed, case-insensitive match) or a clear "Room not found" error is shown.
- What happens if the host closes their tab or disconnects before starting the game? The room becomes inaccessible; other players see no active host. (Host migration is out of scope.)
- What happens if two players try to join with the same display name? Names are not guaranteed unique; the system accepts both and distinguishes by position in list.
- What happens if a player joins a room that has already started? Mid-game join handling is out of scope for this scenario; behavior is undefined and will be addressed in a later scenario if needed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a player to create a new room, generating a unique room code and designating that player as the host.
- **FR-002**: System MUST allow a player to join an existing room by entering a valid room code.
- **FR-003**: System MUST reject join attempts with an invalid or non-existent room code and display a descriptive error message to the user.
- **FR-004**: System MUST reject join attempts with an empty room code and display a validation message without submitting the request.
- **FR-005**: System MUST ensure rooms are fully isolated: player lists, game state, and events in one room MUST NOT be visible to or affect players in another room.
- **FR-006**: System MUST designate the room creator as the host automatically; no manual host assignment is required.
- **FR-007**: The lobby MUST refresh the player list via polling at approximately 2-second intervals.
- **FR-008**: The "Start Game" control MUST be available only to the host and MUST be disabled (or absent) when fewer than 2 players are in the room.
- **FR-009**: When the host activates "Start Game" with at least 2 players present, all players in the room MUST be transitioned to the game view.
- **FR-010**: Non-host players MUST NOT have access to the "Start Game" control.

### Key Entities

- **Room**: Represents an active game session container. Attributes: unique room code, host player reference, ordered list of connected players, current game phase (lobby / in-progress).
- **Player**: A participant connected to a room. Attributes: display name, host flag (boolean), room association.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can create a room and reach the lobby screen in under 5 seconds from clicking "Create Room."
- **SC-002**: A player with a valid room code can join an existing room and appear on all connected players' lobby screens within 4 seconds of submitting the code.
- **SC-003**: The lobby player list reflects any new joiner within approximately 2 seconds for all players currently in the room.
- **SC-004**: 100% of invalid or empty room code submissions are rejected with a visible, descriptive error message before any join attempt reaches the server.
- **SC-005**: The "Start Game" button becomes active exclusively when 2 or more players are present and exclusively for the host — verified across two simultaneous browser sessions.
- **SC-006**: Two rooms created concurrently show no cross-contamination of player lists or game state.

## Assumptions

- Each player provides only a display name to enter the game; no account creation, authentication, or persistent identity is required.
- Room codes are alphanumeric strings generated server-side; length and character set are left to the implementation plan.
- All room state is held in server memory only; restarting the backend clears all rooms, and this is expected behavior.
- Mobile support is out of scope for this scenario; the target environment is a desktop browser.
- The backend REST API already accepts room-creation and room-join requests per the starter structure; this feature wires up the frontend and completes any missing backend logic.
- Display names are not unique-enforced; two players may share a name without system error.
- Host migration (transferring host role if the host disconnects) is explicitly out of scope.
