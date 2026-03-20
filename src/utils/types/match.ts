/**
 * Prologue comment
 * Name of code artifact: match.ts
 * Brief description: Declares TypeScript types for matchmaking players, match status, and timed multiplayer match metadata.
 * Programmer's name: Jonathan Johnston
 * Date the code was created: 2026-03-19
 * Dates the code was revised:
 *   - 2026-03-19: Added multiplayer timing/winner metadata fields to Match type (Jonathan Johnston)
 * Brief description of each revision & author: See revision list above.
 * Preconditions:
 *   - Consumed by TypeScript codepaths in matchmaking and match APIs.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: Type-safe objects matching declared MatchPlayer/Match/MatchStatus contracts.
 *   - Unacceptable: runtime payloads that violate declared shapes when bypassing TS checks.
 * Postconditions:
 *   - Provides shared compile-time contracts for match documents.
 * Return values or types, and their meanings:
 *   - Exports MatchPlayer, MatchStatus, and Match type aliases.
 * Error and exception condition values or types that can occur, and their meanings:
 *   - Compile-time type errors occur when assignments violate definitions.
 * Side effects:
 *   - None at runtime.
 * Invariants:
 *   - Match status values remain restricted to the MatchStatus union.
 * Any known faults:
 *   - Type declarations cannot prevent malformed external data at runtime.
 */
export type MatchPlayer = {
  userId: string;
  displayName?: string;
  joinedAt?: any;
};

export type MatchStatus = "waiting" | "starting" | "active" | "finished" | "cancelled";

export type Match = {
  id?: string;
  players: MatchPlayer[];
  problemId?: string;
  status: MatchStatus;
  winner?: string | null;
  winnerReason?: "first_correct_and_faster" | "both_correct_lower_time" | "opponent_clock_exceeded";
  startedAtMs?: number;
  createdAtMs?: number;
  penaltiesMs?: Record<string, number>;
  solvedElapsedMs?: Record<string, number>;
  winnerDecidedAtMs?: number;
  createdAt?: any;
  updatedAt?: any;
};

