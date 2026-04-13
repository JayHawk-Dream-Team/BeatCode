// Written by Carlos with help from Claude
/**
 * Artifact:             tournament.ts
 * Description:          TypeScript type definitions for the bracket-based elimination
 *                       tournament system: tournament metadata, participants, rounds,
 *                       matchups, and status tracking.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        N/A — file contains only type definitions; no runtime behavior.
 * Acceptable Input:     N/A — compile-time types only.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       N/A — no runtime state is modified.
 * Return Values:        Exports types: TournamentDifficulty, TournamentStatus,
 *                       TournamentParticipant, MatchupStatus, TournamentMatchup,
 *                       TournamentRound, Tournament.
 *
 * Error/Exception Conditions:
 *                       N/A — type mismatches are caught at compile time by TypeScript.
 * Side Effects:         None.
 * Invariants:           Tournament playerCount is restricted to 4, 8, or 16.
 *                       Tournament status follows the lifecycle: lobby → active → finished.
 * Known Faults:         None.
 */

export type TournamentDifficulty = "easy" | "medium" | "hard" | "escalating";

export type TournamentStatus = "lobby" | "active" | "finished" | "cancelled";

export type TournamentParticipant = {
	userId: string;
	displayName: string;
	joinedAt: any;
	joinOrder: number;
	seed: number | null;
};

export type MatchupStatus = "pending" | "active" | "finished" | "bye";

export type TournamentMatchup = {
	slotIndex: number;
	matchId: string | null;
	player1Id: string | null;
	player2Id: string | null;
	winnerId: string | null;
	status: MatchupStatus;
};

export type TournamentRound = {
	roundIndex: number;
	difficulty: string;
	problemId: string;
	matchups: TournamentMatchup[];
};

export type Tournament = {
	id?: string;
	creatorId: string;
	creatorDisplayName: string;
	name: string;
	playerCount: 4 | 8 | 16;
	difficulty: TournamentDifficulty;
	timeLimitMs: number | null;
	status: TournamentStatus;
	currentRound: number;
	participants: TournamentParticipant[];
	rounds: TournamentRound[];
	championId: string | null;
	startedAtMs: number | null;
	finishedAtMs: number | null;
	createdAt?: any;
	updatedAt?: any;
};
