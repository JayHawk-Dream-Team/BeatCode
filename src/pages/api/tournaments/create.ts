// Written by Carlos with help from Claude
/**
 * Artifact:             create.ts (API route: /api/tournaments/create)
 * Description:          Creates a new tournament with lobby status. Validates auth token,
 *                       player count, and difficulty. Auto-adds the creator as the first
 *                       participant.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        User must be authenticated (valid Firebase ID token).
 * Acceptable Input:     POST with { playerCount: 4|8|16, difficulty, name?, timeLimitMs? }.
 * Unacceptable Input:   Missing auth token, invalid playerCount, non-POST method.
 *
 * Postconditions:       A new tournament document is created in Firestore with lobby status.
 * Return Values:        JSON { tournamentId: string }.
 *
 * Error/Exception Conditions:
 *                       401 for missing/invalid auth token.
 *                       400 for invalid playerCount or difficulty.
 *                       405 for non-POST method.
 *                       500 for Firestore write failures.
 * Side Effects:         Writes a new document to the tournaments collection.
 * Invariants:           Tournament starts with status "lobby" and currentRound -1.
 * Known Faults:         None.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import { verifyAuthToken } from "@/utils/authHelpers";
import { resolveDisplayName } from "@/utils/tournamentHelpers";
import type { Tournament, TournamentDifficulty } from "@/utils/types/tournament";

const VALID_PLAYER_COUNTS = [4, 8, 16];
const VALID_DIFFICULTIES: TournamentDifficulty[] = ["easy", "medium", "hard", "escalating"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

	const userId = await verifyAuthToken(req);
	if (!userId) return res.status(401).json({ error: "Authentication required" });

	const { playerCount, difficulty, name, timeLimitMs } = req.body || {};

	if (!VALID_PLAYER_COUNTS.includes(playerCount)) {
		return res.status(400).json({ error: "playerCount must be 4, 8, or 16" });
	}
	if (!VALID_DIFFICULTIES.includes(difficulty)) {
		return res.status(400).json({ error: "difficulty must be easy, medium, hard, or escalating" });
	}

	try {
		const displayName = await resolveDisplayName(userId);

		const tournament: Omit<Tournament, "id"> = {
			creatorId: userId,
			creatorDisplayName: displayName,
			name: (typeof name === "string" && name.trim()) ? name.trim() : `${displayName}'s Tournament`,
			playerCount,
			difficulty,
			timeLimitMs: typeof timeLimitMs === "number" && timeLimitMs > 0 ? timeLimitMs : null,
			status: "lobby",
			currentRound: -1,
			participants: [
				{
					userId,
					displayName,
					joinedAt: new Date(),
					joinOrder: 0,
					seed: null,
				},
			],
			rounds: [],
			championId: null,
			startedAtMs: null,
			finishedAtMs: null,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};

		const docRef = await addDoc(collection(firestore, "tournaments"), tournament as any);

		return res.status(200).json({ tournamentId: docRef.id });
	} catch (err: any) {
		return res.status(500).json({ error: String(err?.message || err) });
	}
}
