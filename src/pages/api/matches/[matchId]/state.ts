/**
 * prologue comment
 * Name of code artifact: state.ts (API route: /api/matches/[matchId]/state)
 * Brief description: Retrieves or patches match state and auto-finalizes winners based on elapsed timers and solved times.
 * Programmer's name: Jonathan Johnston
 * Date the code was created: 2026-03-19
 * Dates the code was revised:
 *   - 2026-03-19: Added automatic winner computation and timer projection in GET responses (Jonathan Johnston)
 * Brief description of each revision & author: See revision list above.
 * Preconditions:
 *   - matchId route parameter is provided.
 *   - Match document exists in Firestore for GET/PATCH operations.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: GET with valid matchId; PATCH with partial update payload object.
 *   - Unacceptable: missing/invalid matchId, unsupported method, or malformed patch payload.
 * Postconditions:
 *   - Returns current match state, and may persist auto-finish fields when win conditions are met.
 * Return values or types, and their meanings:
 *   - GET: JSON match state including derived timersMs.
 *   - PATCH: JSON updated match state.
 * Error and exception condition values or types that can occur, and their meanings:
 *   - 400 for bad matchId.
 *   - 404 when match not found.
 *   - 405 for unsupported method.
 *   - 500 for Firestore/processing failures.
 * Side effects:
 *   - May write status/winner fields during GET if auto-finish conditions evaluate true.
 * Invariants:
 *   - Timers are always non-negative and include penalties.
 * Any known faults:
 *   - Concurrent writes may cause short-lived stale reads between poll intervals.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "../../../../firebase/firebase";
import { toNumberMap, getStartedAtMs, getElapsedMs, computeWinner } from "../../../../utils/matchHelpers";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { matchId } = req.query;
  if (!matchId || typeof matchId !== "string") return res.status(400).json({ error: "Missing matchId" });

  const matchRef = doc(firestore, "matches", matchId);

  try {
    if (req.method === "GET") {
      const snapshot = await getDoc(matchRef);
      if (!snapshot.exists()) return res.status(404).json({ error: "Match not found" });

      const data = snapshot.data() as Record<string, any>;
      const nowMs = Date.now();
      const startedAtMs = getStartedAtMs(data);
      const penaltiesMs = toNumberMap(data.penaltiesMs);
      const solvedElapsedMs = toNumberMap(data.solvedElapsedMs);
      const players = Array.isArray(data.players) ? data.players.map((p: any) => p?.userId).filter(Boolean) : [];

      let winner = data.winner || null;
      let winnerReason = data.winnerReason || null;
      let status = String(data.status || "active");

      if (status !== "finished") {
        const decision = computeWinner(players, nowMs, startedAtMs, penaltiesMs, solvedElapsedMs);
        if (decision) {
          winner = decision.winner;
          winnerReason = decision.reason;
          status = "finished";

          await setDoc(
            matchRef,
            {
              status,
              winner,
              winnerReason,
              winnerDecidedAtMs: nowMs,
              startedAtMs,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }
      }

      const timersMs: Record<string, number> = {};
      for (const userId of players) {
        timersMs[userId] = getElapsedMs(userId, nowMs, startedAtMs, penaltiesMs, solvedElapsedMs);
      }

      return res.status(200).json({
        id: snapshot.id,
        ...data,
        status,
        winner,
        winnerReason,
        startedAtMs,
        penaltiesMs,
        solvedElapsedMs,
        timersMs,
        nowMs,
      });
    }

    if (req.method === "PATCH") {
      const updates = req.body || {};
      updates.updatedAt = serverTimestamp();
      await setDoc(matchRef, updates, { merge: true });
      const updated = await getDoc(matchRef);
      return res.status(200).json({ id: updated.id, ...updated.data() });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}

