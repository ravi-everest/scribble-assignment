import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "../components/Card";
import { GuessForm } from "../components/GuessForm";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();

  const roomCode = searchParams.get("room");
  const storedParticipantId = sessionStorage.getItem("participantId");
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const viewer = room.participants.find((p) => p.id === participantId) ?? null;
  const isDrawer = participantId === room.hostId;

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">Guess the Word!</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Scoreboard />
          <ResultPanel />
        </aside>

        <div className="game-page__main">
          <Card title="Canvas">
            <div className="canvas-placeholder" style={{ minHeight: '500px', backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}>
              Waiting for drawer...
            </div>
          </Card>
        </div>

        <aside className="game-page__sidebar game-page__sidebar--right">
          <Card title="Player Info">
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{viewer?.name ?? "Unknown player"}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{isDrawer ? "You are the drawer" : "You are guessing"}</dd>
              </div>
              {isDrawer && room.secretWord && (
                <div>
                  <dt>Secret word</dt>
                  <dd>{room.secretWord}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card title="Your Guess">
            <GuessForm />
          </Card>
        </aside>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
