// Written by Carlos with help from Claude
/**
 * Artifact:             forfeit.ts (API route: /api/tournaments/[tournamentId]/forfeit)
 * Description:          Allows a player to forfeit their current tournament match.
 *                       Marks the opponent as the winner and finalizes the match.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        User must be authenticated and have an active matchup.
 * Acceptable Input:     POST with valid auth token.
 * Unacceptable Input:   Non-POST method, missing auth, user not in active matchup.
 *
 * Postconditions:       Match document is set to finished with opponent as winner.
 *                       Matchup in tournament is updated with winnerId.
 * Return Values:        JSON { forfeited: true, matchId, winnerId }.
 *
 * Error/Exception Conditions:
 *                       401 for missing/invalid auth. 404 for tournament not found.
 *                       409 for no active matchup found for user.
 *                       500 for Firestore failures.
 * Side Effects:         Updates match and tournament documents.
 * Invariants:           Forfeit prevents late submissions (match status becomes finished).
 * Known Faults:         None.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import { verifyAuthToken } from "@/utils/authHelpers";
import type { Tournament, TournamentMatchup } from "@/utils/types/tournament";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

	const userId = await verifyAuthToken(req);
	if (!userId) return res.status(401).json({ error: "Authentication required" });

	const { tournamentId } = req.query;
	if (!tournamentId || typeof tournamentId !== "string") {
		return res.status(400).json({ error: "Missing tournamentId" });
	}

	try {
		const tournamentRef = doc(firestore, "tournaments", tournamentId);
		const snap = await getDoc(tournamentRef);
		if (!snap.exists()) return res.status(404).json({ error: "Tournament not found" });

		const data = snap.data() as Tournament;
		if (data.status !== "active") {
			return res.status(409).json({ error: "Tournament is not active" });
		}

		// Find user's active matchup in the current round
		const currentRound = data.rounds[data.currentRound];
		if (!currentRound) {
			return res.status(409).json({ error: "No active round found" });
		}

		let targetMatchup: TournamentMatchup | null = null;
		let matchupIndex = -1;
		for (let i = 0; i < currentRound.matchups.length; i++) {
			const m = currentRound.matchups[i];
			if (m.status === "active" && (m.player1Id === userId || m.player2Id === userId)) {
				targetMatchup = m;
				matchupIndex = i;
				break;
			}
		}

		if (!targetMatchup || !targetMatchup.matchId) {
			return res.status(409).json({ error: "No active matchup found for user" });
		}

		const opponentId = targetMatchup.player1Id === userId
			? targetMatchup.player2Id!
			: targetMatchup.player1Id!;

		// Finalize the match document
		const matchRef = doc(firestore, "matches", targetMatchup.matchId);
		await setDoc(matchRef, {
			status: "finished",
			winner: opponentId,
			winnerReason: "opponent_clock_exceeded",
			winnerDecidedAtMs: Date.now(),
			updatedAt: serverTimestamp(),
		}, { merge: true });

		// Update tournament matchup
		const updatedRounds = [...data.rounds];
		updatedRounds[data.currentRound] = {
			...currentRound,
			matchups: currentRound.matchups.map((m, i) =>
				i === matchupIndex
					? { ...m, winnerId: opponentId, status: "finished" as const }
					: m
			),
		};

		await setDoc(tournamentRef, {
			rounds: updatedRounds,
			updatedAt: serverTimestamp(),
		}, { merge: true });

		return res.status(200).json({
			forfeited: true,
			matchId: targetMatchup.matchId,
			winnerId: opponentId,
		});
	} catch (err: any) {
		return res.status(500).json({ error: String(err?.message || err) });
	}
}
