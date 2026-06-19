import type { Participant } from "../services/api";
import { Card } from "./Card";

interface ScoreboardProps {
  participants: Participant[];
  scores: Record<string, number>;
}

export function Scoreboard({ participants, scores }: ScoreboardProps) {
  const ranked = [...participants].sort((a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0));

  return (
    <Card title="Scoreboard">
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {ranked.map((p) => (
          <li key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.25rem 0", borderBottom: "1px solid #e5e7eb" }}>
            <span>{p.name}</span>
            <strong>{scores[p.id] ?? 0}</strong>
          </li>
        ))}
      </ul>
    </Card>
  );
}
