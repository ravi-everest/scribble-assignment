import { randomUUID } from "node:crypto";
import type { Guess, Participant, Room, RoomSnapshot } from "../models/game.js";
import { HttpError } from "../api/schemas.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

const rooms = new Map<string, Room>();

function now() {
  return new Date().toISOString();
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  return code;
}

function createParticipant(name: string): Participant {
  return {
    id: randomUUID(),
    name,
    joinedAt: now()
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

export function createRoom(playerName: string) {
  const participant = createParticipant(playerName);
  const room: Room = {
    code: generateUniqueCode(),
    status: "lobby",
    hostId: participant.id,
    participants: [participant],
    guesses: [],
    scores: {},
    currentWord: "",
    createdAt: now(),
    updatedAt: now()
  };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function joinRoom(code: string, playerName: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  const participant = createParticipant(playerName);
  room.participants.push(participant);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function getRoom(code: string) {
  const room = rooms.get(code);
  return room ? cloneRoom(room) : null;
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

export function startRoom(code: string, participantId: string): RoomSnapshot {
  const room = rooms.get(code);

  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  if (room.hostId !== participantId) {
    throw new HttpError(403, "Only the host can start the game");
  }

  if (room.participants.length < 2) {
    throw new HttpError(400, "At least 2 players are required to start");
  }

  if (room.status !== "lobby") {
    throw new HttpError(400, "Room is already active");
  }

  room.status = "active";
  room.currentWord = STARTER_WORDS[0];
  room.updatedAt = now();
  for (const participant of room.participants) {
    room.scores[participant.id] = 0;
  }
  rooms.set(room.code, room);

  return toRoomSnapshot(cloneRoom(room), participantId);
}

const CORRECT_GUESS_POINTS = 100;

export function compareGuess(input: string, secretWord: string): boolean {
  const trimmed = input.trim();
  if (trimmed === "") return false;
  return trimmed.toLowerCase() === secretWord.toLowerCase();
}

export function submitGuess(code: string, participantId: string, rawGuess: string): RoomSnapshot {
  const room = rooms.get(code);

  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  if (room.status !== "active") {
    throw new HttpError(400, "Room is not active");
  }

  if (participantId === room.hostId) {
    throw new HttpError(403, "Drawer cannot submit a guess");
  }

  const participant = room.participants.find((p) => p.id === participantId);

  if (!participant) {
    throw new HttpError(404, "Participant not found");
  }

  const trimmed = rawGuess.trim();

  if (trimmed === "") {
    throw new HttpError(400, "Guess cannot be empty");
  }

  const correct = compareGuess(rawGuess, room.currentWord);
  const guess: Guess = {
    participantId,
    playerName: participant.name,
    text: trimmed.toLowerCase(),
    correct,
    submittedAt: now()
  };

  room.guesses.push(guess);

  if (correct) {
    room.scores[participantId] = (room.scores[participantId] ?? 0) + CORRECT_GUESS_POINTS;
  }

  const guessers = room.participants.filter((p) => p.id !== room.hostId);
  const correctIds = new Set(room.guesses.filter((g) => g.correct).map((g) => g.participantId));
  if (guessers.length > 0 && guessers.every((p) => correctIds.has(p.id))) {
    room.status = "result";
  }

  room.updatedAt = now();
  rooms.set(room.code, room);

  return toRoomSnapshot(cloneRoom(room), participantId);
}

export function restartRoom(code: string, participantId: string): RoomSnapshot {
  const room = rooms.get(code);

  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  if (room.hostId !== participantId) {
    throw new HttpError(403, "Only the host can restart the game");
  }

  if (room.status !== "result") {
    throw new HttpError(400, "Room is not in result state");
  }

  room.status = "lobby";
  room.currentWord = "";
  room.guesses = [];
  room.scores = {};
  room.updatedAt = now();
  rooms.set(room.code, room);

  return toRoomSnapshot(cloneRoom(room), participantId);
}

export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSnapshot {
  const secretWord =
    room.status === "active" && viewerParticipantId === room.hostId
      ? room.currentWord
      : undefined;

  const currentWord = room.status === "result" ? room.currentWord : undefined;

  return {
    code: room.code,
    status: room.status,
    hostId: room.hostId,
    participants: room.participants.map((participant) => ({ ...participant })),
    availableWords: listWords(),
    roles: [...STARTER_ROLES],
    guesses: room.guesses.map((g) => ({ ...g })),
    scores: { ...room.scores },
    ...(secretWord !== undefined ? { secretWord } : {}),
    ...(currentWord !== undefined ? { currentWord } : {})
  };
}
