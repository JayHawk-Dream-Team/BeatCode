// Written by Carlos with help from Claude
/**
 * Artifact:             leave.ts (API route: /api/tournaments/[tournamentId]/leave)
 * Description:          Removes a participant from a tournament lobby.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        User must be authenticated and be a participant in the tournament.
 * Acceptable Input:     POST with valid auth token. Tournament must be in "lobby" status.
 * Unacceptable Input:   Non-POST method, missing auth, tournament not in lobby.
 *
 * Postconditions:       User is removed from the participants array.
 * Return Values:        JSON { left: true }.
 *
 * Error/Exception Conditions:
 *                       401 for missing/invalid auth. 400 for bad tournamentId.
 *                       404 for tournament not found. 409 for non-lobby tournament.
 *                       500 for Firestore failures.
 * Side Effects:         Updates the tournament document.
 * Invariants:           Creator cannot leave their own tournament (use cancel instead).
 * Known Faults:         None.
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import { verifyAuthToken } from "@/utils/authHelpers";
import type { Tournament } from "@/utils/types/tournament";

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

		if (data.status !== "lobby") {
			return res.status(409).json({ error: "Can only leave a tournament in lobby status" });
		}
		if (data.creatorId === userId) {
			return res.status(409).json({ error: "Creator cannot leave. Use cancel instead." });
		}

		const updatedParticipants = (data.participants || []).filter(p => p.userId !== userId);

		await setDoc(tournamentRef, {
			participants: updatedParticipants,
			updatedAt: serverTimestamp(),
		}, { merge: true });

		return res.status(200).json({ left: true });
	} catch (err: any) {
		return res.status(500).json({ error: String(err?.message || err) });
	}
}
