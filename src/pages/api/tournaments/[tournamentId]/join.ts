// Written by Carlos with help from Claude
/**
 * Artifact:             join.ts (API route: /api/tournaments/[tournamentId]/join)
 * Description:          Joins a player to a tournament lobby. Uses a Firestore transaction
 *                       to prevent overfill races. When the lobby fills, automatically
 *                       starts the tournament: seeds players, generates the bracket,
 *                       creates Match documents for round 0.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        User must be authenticated. Tournament must be in lobby status.
 * Acceptable Input:     POST with valid auth token. Tournament not full, user not already in.
 * Unacceptable Input:   Non-POST method, missing auth, full lobby, duplicate join.
 *
 * Postconditions:       User is added to participants. If lobby fills, tournament starts
 *                       with generated bracket and Match documents.
 * Return Values:        JSON { joined: true, tournamentStarted: boolean }.
 *
 * Error/Exception Conditions:
 *                       401 for missing/invalid auth. 404 for tournament not found.
 *                       409 for non-lobby, full, or duplicate join.
 *                       500 for Firestore/transaction failures.
 * Side Effects:         Updates tournament document. May create Match documents.
 * Invariants:           Transaction ensures exactly playerCount participants and exactly
 *                       one bracket generation.
 * Known Faults:         None.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import { verifyAuthToken } from "@/utils/authHelpers";
import {
	resolveDisplayName,
	generateBracket,
	selectProblemForRound,
	getDifficultyForRound,
	getTotalRounds,
	createTournamentMatch,
} from "@/utils/tournamentHelpers";
import type { Tournament, TournamentRound } from "@/utils/types/tournament";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

	const userId = await verifyAuthToken(req);
	if (!userId) return res.status(401).json({ error: "Authentication required" });

	const { tournamentId } = req.query;
	if (!tournamentId || typeof tournamentId !== "string") {
		return res.status(400).json({ error: "Missing tournamentId" });
	}

	try {
		const displayName = await resolveDisplayName(userId);

		let tournamentStarted = false;

		await runTransaction(firestore, async (transaction) => {
			const tournamentRef = doc(firestore, "tournaments", tournamentId);
			const snap = await transaction.get(tournamentRef);
			if (!snap.exists()) throw new Error("NOT_FOUND");

			const data = snap.data() as Tournament;

			if (data.status !== "lobby") throw new Error("NOT_LOBBY");
			if (data.participants.length >= data.playerCount) throw new Error("FULL");
			if (data.participants.some(p => p.userId === userId)) throw new Error("ALREADY_JOINED");

			const newParticipant = {
				userId,
				displayName,
				joinedAt: new Date(),
				joinOrder: data.participants.length,
				seed: null,
			};

			const updatedParticipants = [...data.participants, newParticipant];

			if (updatedParticipants.length === data.playerCount) {
				// Lobby is full — start the tournament
				tournamentStarted = true;

				const { seededParticipants, matchups } = generateBracket(updatedParticipants, tournamentId);
				const totalRounds = getTotalRounds(data.playerCount);
				const round0Difficulty = getDifficultyForRound(data.difficulty, 0, totalRounds);
				const round0ProblemId = await selectProblemForRound(round0Difficulty, []);

				// Build display name lookup for match creation
				const nameMap: Record<string, string> = {};
				for (const p of seededParticipants) {
					nameMap[p.userId] = p.displayName;
				}

				// Create Match documents and assign matchIds
				const finalMatchups = matchups.map(matchup => {
					if (matchup.status === "bye" || !matchup.player1Id || !matchup.player2Id) {
						return matchup;
					}

					const matchId = createTournamentMatch(
						transaction,
						matchup.player1Id,
						nameMap[matchup.player1Id] || "Player",
						matchup.player2Id,
						nameMap[matchup.player2Id] || "Player",
						round0ProblemId,
						tournamentId
					);

					return { ...matchup, matchId, status: "active" as const };
				});

				const round0: TournamentRound = {
					roundIndex: 0,
					difficulty: round0Difficulty,
					problemId: round0ProblemId,
					matchups: finalMatchups,
				};

				transaction.update(tournamentRef, {
					participants: seededParticipants,
					rounds: [round0],
					status: "active",
					currentRound: 0,
					startedAtMs: Date.now(),
					updatedAt: serverTimestamp(),
				});
			} else {
				// Just add the participant
				transaction.update(tournamentRef, {
					participants: updatedParticipants,
					updatedAt: serverTimestamp(),
				});
			}
		});

		return res.status(200).json({ joined: true, tournamentStarted });
	} catch (err: any) {
		const msg = err?.message || String(err);
		if (msg === "NOT_FOUND") return res.status(404).json({ error: "Tournament not found" });
		if (msg === "NOT_LOBBY") return res.status(409).json({ error: "Tournament is not in lobby" });
		if (msg === "FULL") return res.status(409).json({ error: "Tournament is full" });
		if (msg === "ALREADY_JOINED") return res.status(409).json({ error: "Already joined this tournament" });
		return res.status(500).json({ error: msg });
	}
}
