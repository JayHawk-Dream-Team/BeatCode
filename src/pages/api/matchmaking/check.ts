/**
 * Prologue comment
 * Name of code artifact: check.ts (API route: /api/matchmaking/check)
 * Brief description: Finds an active match for a user/problem pair, excluding finished or cancelled matches.
 * Programmer's name: Jonathan Johnston
 * Date the code was created: 2026-03-19
 * Dates the code was revised:
 *   - 2026-03-20: Updated lookup to ignore finished/cancelled matches and prefer latest active update (Jonathan Johnston)
 * Brief description of each revision & author: See revision list above.
 * Preconditions:
 *   - Request method is POST with userId and problemId.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: JSON body containing userId and problemId strings.
 *   - Unacceptable: missing identifiers or unsupported methods.
 * Postconditions:
 *   - Returns either a valid active matchId or null.
 * Return values or types, and their meanings:
 *   - JSON { matchId: string | null }.
 * Error and exception condition values or types that can occur, and their meanings:
 *   - 400 for missing userId/problemId.
 *   - 405 for unsupported method.
 *   - 500 for query failures.
 * Side effects:
 *   - Reads match documents from Firestore.
 * Invariants:
 *   - Finished/cancelled matches are never returned.
 * Any known faults:
 *   - Array-of-object player membership still requires scan filtering in application code.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firestore } from "../../../firebase/firebase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, problemId } = req.body || {};
  if (!userId || !problemId) return res.status(400).json({ error: "Missing userId or problemId" });

  try {
    // Find a match for this user and problem
    const matchesCol = collection(firestore, "matches");
    // Firestore cannot query arrays of objects directly, so get all matches for the problem
    const q = query(matchesCol, where("problemId", "==", problemId));
    const snap = await getDocs(q);
    let matchId: string | null = null;
    let bestUpdatedAtMs = -1;
    snap.forEach((doc) => {
      const data = doc.data() as any;
      const status = String(data?.status || "");
      if (status === "finished" || status === "cancelled") return;

      const isParticipant =
        data.players &&
        Array.isArray(data.players) &&
        data.players.some((p: any) => p?.userId === userId);

      if (!isParticipant) return;

      const updatedAtMs =
        typeof data?.updatedAt?.toMillis === "function"
          ? data.updatedAt.toMillis()
          : typeof data?.updatedAtMs === "number"
          ? data.updatedAtMs
          : 0;

      if (updatedAtMs >= bestUpdatedAtMs) {
        bestUpdatedAtMs = updatedAtMs;
        matchId = doc.id;
      }
    });
    return res.status(200).json({ matchId });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}

