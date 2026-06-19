import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

const POLL_INTERVAL_MS = 2000;

export function LobbyPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId, isLoading } = useRoomState();
  const roomRef = useRef(room);
  roomRef.current = room;

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    if (!room) return;

    const intervalId = setInterval(() => {
      roomStore.fetchRoom().catch(() => {
        // poll failures are silently ignored — next tick will retry
      });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomStore, room?.code]);

  useEffect(() => {
    if (room?.status === "active") {
      navigate("/game");
    }
  }, [navigate, room?.status]);

  if (!room) {
    return null;
  }

  const isHost = participantId === room.hostId;
  const canStart = isHost && room.participants.length >= 2;

  async function handleStartGame() {
    if (!room || !participantId) return;
    try {
      await roomStore.startRoom(room.code, participantId);
    } catch {
      // error surfaced via store state
    }
  }

  return (
    <section className="panel placeholder-page">
      <div className="lobby-header">
        <PageHeader
          kicker="Waiting for players"
          title="Lobby"
          description="Share the room code with friends so they can join your game."
        />
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="summary-grid">
        <Card title="Participants">
          {room.participants.length === 0 ? (
            <p>No participants are connected to this room yet.</p>
          ) : (
            <ul className="player-list">
              {room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>
                    {participant.name}
                    {participant.id === room.hostId ? " (Host)" : ""}
                  </span>
                  <span className="player-list__meta">joined</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status">
          <p className="status-line" style={{ backgroundColor: isLoading ? "#fef3c7" : "#e0e7ff", color: isLoading ? "#b45309" : "#3730a3" }}>
            {isLoading ? "Refreshing players..." : "Ready to play"}
          </p>
          <p style={{ marginTop: "8px" }}>
            {isHost
              ? room.participants.length < 2
                ? "Waiting for at least one more player to join."
                : "You can start the game."
              : "Waiting for the host to start the game."}
          </p>
        </Card>
      </div>

      {isHost && (
        <div className="button-row button-row--spread">
          <button
            className="button button--primary"
            disabled={!canStart}
            onClick={handleStartGame}
          >
            Start Game
          </button>
        </div>
      )}
    </section>
  );
}
