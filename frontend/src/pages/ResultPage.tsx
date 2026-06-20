import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useRoomState, useRoomStore } from "../state/roomStore";

const POLL_INTERVAL_MS = 2000;

export function ResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomStore = useRoomStore();
  const { room, participantId, error } = useRoomState();

  const roomCode = searchParams.get("room");
  const storedParticipantId = sessionStorage.getItem("participantId");
  const [loadError, setLoadError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!roomCode || !storedParticipantId) {
      navigate("/", { replace: true });
      return;
    }

    if (!room) {
      roomStore.restoreSession(roomCode, storedParticipantId).catch(() => {
        setLoadError("Room not found or session expired. Redirecting…");
      });
    }
  }, [navigate, room, roomCode, roomStore, storedParticipantId]);

  useEffect(() => {
    if (!loadError) return;
    const id = setTimeout(() => navigate("/", { replace: true }), 2000);
    return () => clearTimeout(id);
  }, [loadError, navigate]);

  useEffect(() => {
    if (!room) return;

    pollRef.current = setInterval(() => {
      roomStore.fetchRoom().catch(() => {});
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current !== null) {
        clearInterval(pollRef.current);
      }
    };
  }, [room?.code, roomStore]);

  useEffect(() => {
    if (room?.status === "lobby") {
      navigate("/lobby", { replace: true });
    }
  }, [navigate, room?.status]);

  if (loadError) {
    return (
      <section className="panel placeholder-page">
        <p className="form__error">{loadError}</p>
      </section>
    );
  }

  if (!room || !participantId) {
    return null;
  }

  const isHost = participantId === room.hostId;

  async function handleRestart() {
    if (!room || !participantId) return;
    try {
      await roomStore.restartRoom(room.code, participantId);
    } catch {
      // error surfaced via store state
    }
  }

  return (
    <section className="panel placeholder-page">
      <div className="lobby-header">
        <PageHeader
          kicker="Round over"
          title="Results"
          description={room.currentWord ? `The word was: ${room.currentWord}` : ""}
        />
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="summary-grid">
        <Scoreboard participants={room.participants} scores={room.scores} />
        <ResultPanel guesses={room.guesses} />
      </div>

      {isHost && (
        <div className="button-row button-row--spread">
          {error ? <p className="form__error">{error}</p> : null}
          <button className="button button--primary" onClick={handleRestart}>
            Restart
          </button>
        </div>
      )}
    </section>
  );
}
