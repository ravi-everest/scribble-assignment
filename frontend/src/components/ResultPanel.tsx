import type { Guess } from "../services/api";
import { Card } from "./Card";

interface ResultPanelProps {
  guesses: Guess[];
}

export function ResultPanel({ guesses }: ResultPanelProps) {
  return (
    <Card title="Activity">
      {guesses.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>No guesses yet.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {guesses.map((g, i) => (
            <li key={i} style={{ display: "flex", gap: "0.5rem", padding: "0.2rem 0", fontSize: "0.875rem", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ color: g.correct ? "#16a34a" : "#dc2626" }}>{g.correct ? "✓" : "✗"}</span>
              <span><strong>{g.playerName}</strong>: {g.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
