// Written by Carlos with help from Claude
/**
 * Artifact:             matchHelpers.ts
 * Description:          Shared utility functions for match state computation: timer
 *                       calculation, number map normalization, start time extraction,
 *                       and automatic winner determination based on solve times and
 *                       penalties. Extracted from match API routes to enable reuse
 *                       across match and tournament systems.
 *
 * Programmer:           Jonathan Johnston (original in state.ts / submit.ts);
 *                       Carlos Mbendera (extraction into shared utility)
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        Input data must be Firestore match document fields or
 *                       derived from them.
 * Acceptable Input:     Valid match data objects with numeric timer fields.
 * Unacceptable Input:   Non-object penalty/solved maps; non-numeric start times.
 *
 * Postconditions:       Returns computed values without mutating inputs.
 * Return Values:        toNumberMap: Record<string, number>;
 *                       getStartedAtMs: number;
 *                       getElapsedMs: number;
 *                       computeWinner: winner decision object or null.
 *
 * Error/Exception Conditions:
 *                       Returns safe defaults (empty map, Date.now(), 0, null)
 *                       for malformed inputs rather than throwing.
 * Side Effects:         None — pure functions.
 * Invariants:           Elapsed times are always non-negative.
 * Known Faults:         None.
 */

export type WinnerReason =
	| "first_correct_and_faster"
	| "both_correct_lower_time"
	| "opponent_clock_exceeded";

export type WinnerDecision = {
	winner: string;
	reason: WinnerReason;
};

export function toNumberMap(raw: unknown): Record<string, number> {
	if (!raw || typeof raw !== "object") return {};
	const out: Record<string, number> = {};
	for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
		const n = Number(value);
		out[key] = Number.isFinite(n) ? n : 0;
	}
	return out;
}

export function getStartedAtMs(data: Record<string, any>): number {
	if (typeof data.startedAtMs === "number" && Number.isFinite(data.startedAtMs)) return data.startedAtMs;
	if (data.createdAt?.toMillis) return data.createdAt.toMillis();
	return Date.now();
}

export function getElapsedMs(
	userId: string,
	nowMs: number,
	startedAtMs: number,
	penaltiesMs: Record<string, number>,
	solvedElapsedMs: Record<string, number>
): number {
	const solved = solvedElapsedMs[userId];
	if (typeof solved === "number" && Number.isFinite(solved)) return solved;
	const elapsed = Math.max(0, nowMs - startedAtMs);
	return elapsed + (penaltiesMs[userId] || 0);
}

export function computeWinner(
	players: string[],
	nowMs: number,
	startedAtMs: number,
	penaltiesMs: Record<string, number>,
	solvedElapsedMs: Record<string, number>
): WinnerDecision | null {
	if (players.length < 2) return null;
	const [a, b] = players;
	const aSolved = typeof solvedElapsedMs[a] === "number";
	const bSolved = typeof solvedElapsedMs[b] === "number";

	if (aSolved && bSolved) {
		const aTime = solvedElapsedMs[a];
		const bTime = solvedElapsedMs[b];
		if (aTime <= bTime) return { winner: a, reason: "both_correct_lower_time" };
		return { winner: b, reason: "both_correct_lower_time" };
	}

	if (aSolved && !bSolved) {
		const aTime = solvedElapsedMs[a];
		const bNow = getElapsedMs(b, nowMs, startedAtMs, penaltiesMs, solvedElapsedMs);
		if (aTime < bNow) return { winner: a, reason: "opponent_clock_exceeded" };
	}

	if (bSolved && !aSolved) {
		const bTime = solvedElapsedMs[b];
		const aNow = getElapsedMs(a, nowMs, startedAtMs, penaltiesMs, solvedElapsedMs);
		if (bTime < aNow) return { winner: b, reason: "opponent_clock_exceeded" };
	}

	return null;
}
