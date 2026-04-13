// Written by Carlos with help from Claude
/**
 * Artifact:             tournamentHelpers.ts
 * Description:          Shared utility functions for the tournament system: display name
 *                       resolution, problem selection by difficulty, bracket generation,
 *                       difficulty escalation, seeded PRNG, and tournament match creation.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        Firebase/Firestore must be initialized before calling Firestore-
 *                       dependent functions.
 * Acceptable Input:     Valid user IDs, difficulty strings, participant arrays, and
 *                       Firestore Transaction objects.
 * Unacceptable Input:   Empty participant arrays for bracket generation; invalid
 *                       difficulty values.
 *
 * Postconditions:       Functions return computed values or write Match documents within
 *                       the provided transaction.
 * Return Values:        See individual function signatures.
 *
 * Error/Exception Conditions:
 *                       selectProblemForRound throws if no eligible problems exist.
 *                       resolveDisplayName returns fallback on Firestore errors.
 * Side Effects:         createTournamentMatch writes a Match document in the provided
 *                       transaction. selectProblemForRound reads from Firestore.
 * Invariants:           seededShuffle is deterministic for the same seed and array.
 *                       generateBracket always produces matchups with valid player pairings.
 * Known Faults:         None.
 */

import {
	collection,
	doc,
	getDoc,
	getDocs,
	query,
	where,
	serverTimestamp,
	Transaction,
} from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import type { TournamentDifficulty, TournamentMatchup, TournamentParticipant } from "./types/tournament";
import type { Match, MatchPlayer } from "./types/match";

/**
 * Resolves a user's display name from the users collection with fallback.
 * Extracted from matchmaking join.ts for shared use.
 */
export async function resolveDisplayName(userId: string, fallback?: string | null): Promise<string> {
	try {
		const userSnap = await getDoc(doc(firestore, "users", userId));
		if (userSnap.exists()) {
			const data = userSnap.data() as any;
			const dbName =
				(typeof data?.displayName === "string" && data.displayName.trim()) ||
				(typeof data?.username === "string" && data.username.trim()) ||
				null;
			if (dbName) return dbName;
		}
	} catch {
		// ignore and use fallback
	}

	if (typeof fallback === "string" && fallback.trim()) return fallback.trim();
	return "Player";
}

/**
 * Deterministic seeded PRNG using a simple hash.
 * Returns a shuffle function that produces the same result for the same seed.
 */
export function seededRandom(seed: string): () => number {
	let hash = 0;
	for (let i = 0; i < seed.length; i++) {
		const char = seed.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash |= 0;
	}
	return () => {
		hash = (hash * 1103515245 + 12345) & 0x7fffffff;
		return hash / 0x7fffffff;
	};
}

/**
 * Deterministic Fisher-Yates shuffle using a seeded PRNG.
 * Same seed + same array always produces the same result.
 */
export function seededShuffle<T>(array: T[], seed: string): T[] {
	const result = [...array];
	const rng = seededRandom(seed);
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

/**
 * Selects a random problem for a tournament round by querying Firestore.
 * Queries both "questions" and "problems" collections (dual-collection pattern).
 * Filters by difficulty and excludes already-used problem IDs.
 */
export async function selectProblemForRound(
	difficulty: string,
	excludeProblemIds: string[]
): Promise<string> {
	const normalizedDifficulty = difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
	const lowerDifficulty = difficulty.toLowerCase();
	const excludeSet = new Set(excludeProblemIds);

	const candidates: string[] = [];

	// Query "questions" collection (primary)
	try {
		const questionsSnap = await getDocs(collection(firestore, "questions"));
		for (const d of questionsSnap.docs) {
			if (excludeSet.has(d.id)) continue;
			const data = d.data() as any;
			const docDifficulty = String(data.difficulty || data.Difficulty || "").toLowerCase();
			if (docDifficulty === lowerDifficulty) {
				candidates.push(d.id);
			}
		}
	} catch {
		// fall through to problems collection
	}

	// If not enough candidates, also try "problems" collection (legacy)
	if (candidates.length === 0) {
		try {
			const problemsSnap = await getDocs(
				query(collection(firestore, "problems"), where("difficulty", "==", normalizedDifficulty))
			);
			for (const d of problemsSnap.docs) {
				if (excludeSet.has(d.id)) continue;
				candidates.push(d.id);
			}
		} catch {
			// ignore
		}
	}

	if (candidates.length === 0) {
		throw new Error(`No eligible problems found for difficulty: ${difficulty}`);
	}

	// Pick a random candidate
	const idx = Math.floor(Math.random() * candidates.length);
	return candidates[idx];
}

/**
 * Determines the difficulty for a given round based on the tournament's difficulty setting.
 * For "escalating" mode, difficulty increases with each round.
 */
export function getDifficultyForRound(
	tournamentDifficulty: TournamentDifficulty,
	roundIndex: number,
	totalRounds: number
): string {
	if (tournamentDifficulty !== "escalating") {
		return tournamentDifficulty;
	}

	// Escalation mapping based on total rounds
	if (totalRounds === 2) {
		// 4 players: Easy, Medium
		return roundIndex === 0 ? "easy" : "medium";
	}
	if (totalRounds === 3) {
		// 8 players: Easy, Medium, Hard
		if (roundIndex === 0) return "easy";
		if (roundIndex === 1) return "medium";
		return "hard";
	}
	// 16 players (4 rounds): Easy, Easy, Medium, Hard
	if (roundIndex <= 1) return "easy";
	if (roundIndex === 2) return "medium";
	return "hard";
}

/**
 * Calculates total number of rounds for a given player count.
 */
export function getTotalRounds(playerCount: number): number {
	return Math.log2(playerCount);
}

/**
 * Generates the initial bracket (round 0 matchups) from seeded participants.
 * Participants are sorted by joinOrder with userId tie-break, then shuffled
 * deterministically using the tournamentId as seed.
 */
export function generateBracket(
	participants: TournamentParticipant[],
	tournamentId: string
): { seededParticipants: TournamentParticipant[]; matchups: TournamentMatchup[] } {
	// Sort by joinOrder, tie-break by userId for determinism
	const sorted = [...participants].sort((a, b) => {
		if (a.joinOrder !== b.joinOrder) return a.joinOrder - b.joinOrder;
		return a.userId.localeCompare(b.userId);
	});

	// Deterministic shuffle using tournamentId as seed
	const shuffled = seededShuffle(sorted, tournamentId);

	// Assign seeds
	const seededParticipants = shuffled.map((p, i) => ({
		...p,
		seed: i + 1,
	}));

	// Create matchups: pair sequential players
	const matchups: TournamentMatchup[] = [];
	for (let i = 0; i < seededParticipants.length; i += 2) {
		matchups.push({
			slotIndex: i / 2,
			matchId: null,
			player1Id: seededParticipants[i].userId,
			player2Id: seededParticipants[i + 1]?.userId || null,
			winnerId: seededParticipants[i + 1] ? null : seededParticipants[i].userId,
			status: seededParticipants[i + 1] ? "pending" : "bye",
		});
	}

	return { seededParticipants, matchups };
}

/**
 * Creates a Match document inside a Firestore transaction for a tournament matchup.
 * Uses transaction.set() to ensure atomicity — no orphaned docs on retry.
 */
export function createTournamentMatch(
	transaction: Transaction,
	player1Id: string,
	player1Name: string,
	player2Id: string,
	player2Name: string,
	problemId: string,
	tournamentId: string
): string {
	const matchRef = doc(collection(firestore, "matches"));
	const nowMs = Date.now();
	const nowDate = new Date();

	const match: Match = {
		players: [
			{ userId: player1Id, displayName: player1Name, joinedAt: nowDate } as unknown as MatchPlayer,
			{ userId: player2Id, displayName: player2Name, joinedAt: nowDate } as unknown as MatchPlayer,
		],
		problemId,
		status: "active",
		winner: null,
		startedAtMs: nowMs,
		createdAtMs: nowMs,
		penaltiesMs: {
			[player1Id]: 0,
			[player2Id]: 0,
		},
		solvedElapsedMs: {},
		tournamentId,
		createdAt: serverTimestamp(),
		updatedAt: serverTimestamp(),
	};

	transaction.set(matchRef, match as any);
	return matchRef.id;
}
