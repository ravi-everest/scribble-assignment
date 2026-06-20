import { describe, expect, it } from "vitest";
import { compareGuess, createRoom, joinRoom, restartRoom, startRoom, submitGuess } from "./roomStore.js";

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

  it("throws 400 on a second guess after the round has ended", () => {
    const { code, guesserId } = setupActiveRoom();
    submitGuess(code, guesserId, "rocket");
    expect(() => submitGuess(code, guesserId, "rocket")).toThrow();
  });

  it("transitions status to 'result' when the only guesser guesses correctly", () => {
    const { code, guesserId } = setupActiveRoom();
    const snapshot = submitGuess(code, guesserId, "rocket");
    expect(snapshot.status).toBe("result");
  });

  it("keeps status 'active' when an incorrect guess is submitted", () => {
    const { code, guesserId } = setupActiveRoom();
    const snapshot = submitGuess(code, guesserId, "pizza");
    expect(snapshot.status).toBe("active");
  });

  it("keeps status 'active' while only some guessers have guessed correctly", () => {
    const host = createRoom("Alice");
    const guesser1 = joinRoom(host.room.code, "Bob");
    const guesser2 = joinRoom(host.room.code, "Carol");
    startRoom(host.room.code, host.participantId);
    const snapshot = submitGuess(host.room.code, guesser1!.participantId, "rocket");
    expect(snapshot.status).toBe("active");
    expect(guesser2!.participantId).toBeDefined();
  });
});

describe("toRoomSnapshot", () => {
  function setupResultRoom() {
    const host = createRoom("Alice");
    const guesser = joinRoom(host.room.code, "Bob");
    startRoom(host.room.code, host.participantId);
    submitGuess(host.room.code, guesser!.participantId, "rocket");
    return { code: host.room.code, hostId: host.participantId, guesserId: guesser!.participantId };
  }

  it("includes currentWord in snapshot when status is 'result'", () => {
    const host = createRoom("Alice");
    const guesser = joinRoom(host.room.code, "Bob");
    startRoom(host.room.code, host.participantId);
    const snapshot = submitGuess(host.room.code, guesser!.participantId, "rocket");
    expect(snapshot.status).toBe("result");
    expect(snapshot.currentWord).toBe("rocket");
  });

  it("omits currentWord in snapshot when status is 'active'", () => {
    const host = createRoom("Alice");
    const guesser = joinRoom(host.room.code, "Bob");
    startRoom(host.room.code, host.participantId);
    const snapshot = submitGuess(host.room.code, guesser!.participantId, "pizza");
    expect(snapshot.status).toBe("active");
    expect(snapshot.currentWord).toBeUndefined();
  });
});

describe("restartRoom", () => {
  function setupResultRoom() {
    const host = createRoom("Alice");
    const guesser = joinRoom(host.room.code, "Bob");
    startRoom(host.room.code, host.participantId);
    submitGuess(host.room.code, guesser!.participantId, "rocket");
    return { code: host.room.code, hostId: host.participantId, guesserId: guesser!.participantId };
  }

  it("resets status to lobby and clears round state on host restart", () => {
    const { code, hostId } = setupResultRoom();
    const snapshot = restartRoom(code, hostId);
    expect(snapshot.status).toBe("lobby");
    expect(snapshot.guesses).toHaveLength(0);
    expect(snapshot.scores).toEqual({});
    expect(snapshot.currentWord).toBeUndefined();
  });

  it("preserves participants after restart", () => {
    const { code, hostId } = setupResultRoom();
    const snapshot = restartRoom(code, hostId);
    expect(snapshot.participants).toHaveLength(2);
    expect(snapshot.participants.map((p) => p.name)).toContain("Alice");
    expect(snapshot.participants.map((p) => p.name)).toContain("Bob");
  });

  it("throws 403 when a non-host tries to restart", () => {
    const { code, guesserId } = setupResultRoom();
    expect(() => restartRoom(code, guesserId)).toThrow();
  });

  it("throws 400 when room is not in result state", () => {
    const host = createRoom("Alice");
    joinRoom(host.room.code, "Bob");
    startRoom(host.room.code, host.participantId);
    expect(() => restartRoom(host.room.code, host.participantId)).toThrow();
  });
});
