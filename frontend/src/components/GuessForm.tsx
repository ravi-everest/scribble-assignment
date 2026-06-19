import { useState } from "react";
import { api } from "../services/api";
import { useRoomStore } from "../state/roomStore";

interface GuessFormProps {
  roomCode: string;
  participantId: string;
  disabled?: boolean;
}

export function GuessForm({ roomCode, participantId, disabled = false }: GuessFormProps) {
  const [guessText, setGuessText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomStore = useRoomStore();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (guessText.trim() === "") return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await api.submitGuess(roomCode, participantId, guessText);
      roomStore.setRoomSnapshot(result.room);
      setGuessText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit guess");
    } finally {
      setSubmitting(false);
    }
  }

  const isDisabled = disabled || submitting;

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__field">
        <input
          className="form__input"
          value={guessText}
          onChange={(event) => setGuessText(event.target.value)}
          placeholder="Type your guess here..."
          disabled={isDisabled}
        />
      </label>
      {error && <p className="form__error">{error}</p>}
      <div className="button-row button-row--compact">
        <button className="button button--primary" type="submit" disabled={isDisabled}>
          Submit Guess
        </button>
      </div>
    </form>
  );
}
