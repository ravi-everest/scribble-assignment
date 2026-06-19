import { describe, expect, it } from "vitest";
import { compareGuess, createRoom, joinRoom, startRoom, submitGuess } from "./roomStore.js";

describe("roomStore", () => {
  it("createRoom returns a room with a 6-character uppercase code", () => {
    const result = createRoom("Alice");

    expect(result.room.code).toMatch(/^[A-Z0-9]{6}$/);
    expect(result.room.participants).toHaveLength(1);
    expect(result.room.participants[0].name).toBe("Alice");
    expect(result.participantId).toBeDefined();
  });

  it("joinRoom returns null for an unknown room code", () => {
    const result = joinRoom("ZZZZ", "Bob");

    expect(result).toBeNull();
  });
});

describe("compareGuess", () => {
  it("returns true for an exact match", () => {
    expect(compareGuess("rocket", "rocket")).toBe(true);
  });

  it("returns true for a case-insensitive match", () => {
    expect(compareGuess("ROCKET", "rocket")).toBe(true);
    expect(compareGuess("Rocket", "rocket")).toBe(true);
  });

  it("returns true for a trimmed match", () => {
    expect(compareGuess("  rocket  ", "rocket")).toBe(true);
    expect(compareGuess("  ROCKET  ", "rocket")).toBe(true);
  });

  it("returns false for a wrong word", () => {
    expect(compareGuess("pizza", "rocket")).toBe(false);
  });

  it("returns false for an empty string after trim", () => {
    expect(compareGuess("", "rocket")).toBe(false);
    expect(compareGuess("   ", "rocket")).toBe(false);
  });
});

describe("submitGuess", () => {
  function setupActiveRoom() {
    const host = createRoom("Alice");
    const guesser = joinRoom(host.room.code, "Bob");
    startRoom(host.room.code, host.participantId);
    return { code: host.room.code, hostId: host.participantId, guesserId: guesser!.participantId };
  }

  it("awards 100 points for a correct guess", () => {
    const { code, guesserId } = setupActiveRoom();
    const snapshot = submitGuess(code, guesserId, "rocket");
    expect(snapshot.scores[guesserId]).toBe(100);
  });

  it("leaves score unchanged for an incorrect guess", () => {
    const { code, guesserId } = setupActiveRoom();
    const snapshot = submitGuess(code, guesserId, "pizza");
    expect(snapshot.scores[guesserId]).toBe(0);
  });

  it("stores the guess as post-trim lowercased text", () => {
    const { code, guesserId } = setupActiveRoom();
    const snapshot = submitGuess(code, guesserId, "  ROCKET  ");
    expect(snapshot.guesses[0].text).toBe("rocket");
    expect(snapshot.guesses[0].correct).toBe(true);
  });

  it("throws 400 for an empty guess", () => {
    const { code, guesserId } = setupActiveRoom();
    expect(() => submitGuess(code, guesserId, "   ")).toThrow();
  });

  it("throws 403 when the drawer tries to guess", () => {
    const { code, hostId } = setupActiveRoom();
    expect(() => submitGuess(code, hostId, "rocket")).toThrow();
  });

  it("accumulates score across multiple correct guesses", () => {
    const { code, guesserId } = setupActiveRoom();
    submitGuess(code, guesserId, "rocket");
    const snapshot = submitGuess(code, guesserId, "rocket");
    expect(snapshot.scores[guesserId]).toBe(200);
  });
});
