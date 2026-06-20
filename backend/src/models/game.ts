export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "active" | "result";

export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Guess {
  participantId: string;
  playerName: string;
  text: string;
  correct: boolean;
  submittedAt: string;
}

export interface Room {
  code: string;
  status: RoomStatus;
  hostId: string;
  participants: Participant[];
  guesses: Guess[];
  scores: Record<string, number>;
  currentWord: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  hostId: string;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
  secretWord?: string;
  currentWord?: string;
  guesses: Guess[];
  scores: Record<string, number>;
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
