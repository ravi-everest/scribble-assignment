import { z } from "zod";

export const createRoomSchema = z.object({
  playerName: z.string().trim().min(1, "Player name is required").max(20, "Name must be 20 characters or fewer")
});

export const joinRoomSchema = z.object({
  playerName: z.string().trim().min(1, "Player name is required").max(20, "Name must be 20 characters or fewer")
});

export const roomCodeParamsSchema = z.object({
  code: z.string()
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().optional()
});

export const startRoomSchema = z.object({
  participantId: z.string().min(1)
});

export const submitGuessSchema = z.object({
  participantId: z.string().min(1),
  guess: z.string().trim().min(1, "Guess cannot be empty").max(50)
});

export const restartRoomSchema = z.object({
  participantId: z.string().min(1)
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
