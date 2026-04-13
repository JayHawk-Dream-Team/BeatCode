// Written by Carlos with help from Claude
/**
 * Artifact:             cancel.ts (API route: /api/tournaments/[tournamentId]/cancel)
 * Description:          Cancels a tournament. Only the creator can cancel, and only while
 *                       the tournament is in lobby status.
 *
 * Programmer:           Carlos Mbendera
 * Date Created:         2026-04-12
 * Revisions:            N/A
 *
 * Preconditions:        User must be the tournament creator. Tournament must be in lobby.
 * Acceptable Input:     POST with valid auth token from the tournament creator.
 * Unacceptable Input:   Non-creator auth, non-lobby tournament, non-POST method.
 *
 * Postconditions:       Tournament status is set to "cancelled".
 * Return Values:        JSON { cancelled: true }.
 *
 * Error/Exception Conditions:
 *                       401 for missing/invalid auth. 403 for non-creator.
 *                       404 for tournament not found. 409 for non-lobby tournament.
 *                       500 for Firestore failures.
 * Side Effects:         Updates the tournament document status.
 * Invariants:           Only lobby tournaments can be cancelled.
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

		if (data.creatorId !== userId) {
			return res.status(403).json({ error: "Only the tournament creator can cancel" });
		}
		if (data.status !== "lobby") {
			return res.status(409).json({ error: "Can only cancel a tournament in lobby status" });
		}

		await setDoc(tournamentRef, {
			status: "cancelled",
			updatedAt: serverTimestamp(),
		}, { merge: true });

		return res.status(200).json({ cancelled: true });
	} catch (err: any) {
		return res.status(500).json({ error: String(err?.message || err) });
	}
}
