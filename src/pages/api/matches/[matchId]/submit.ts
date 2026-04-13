/**
 * Prologue comment
 * Name of code artifact: submit.ts (API route: /api/matches/[matchId]/submit)
 * Brief description: Records match submissions, applies failure penalties, stores solved elapsed times, and finalizes winner state.
 * Programmer's name: Jonathan Johnston
 * Date the code was created: 2026-03-19
 * Dates the code was revised:
 *   - 2026-03-19: Added server-side multiplayer win-condition evaluation and penalty handling (Jonathan Johnston)
 *   - 2026-03-20: Updated default penalty configuration support and response payload fields (Jonathan Johnston)
 * Brief description of each revision & author: See revision list above.
 * Preconditions:
 *   - matchId is valid.
 *   - Request body includes userId and result.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: result values such as accepted/win/failed with optional details object.
 *   - Unacceptable: missing userId/result, non-participant user, finished match updates.
 * Postconditions:
 *   - Submission record is written and match state is updated with penalties/solved timers/winner if applicable.
 * Return values or types, and their meanings:
 *   - Returns JSON with stored submission info and match-finish metadata.
 * Error and exception condition values or types that can occur, and their meanings:
 *   - 400 for missing identifiers.
 *   - 403 for non-participant writes.
 *   - 404 for unknown match.
 *   - 405 for unsupported method.
 *   - 500 for Firestore/processing failures.
 * Side effects:
 *   - Writes both submission subcollection documents and parent match state fields.
 * Invariants:
 *   - Penalties are additive and expressed in milliseconds.
 * Any known faults:
 *   - Near-simultaneous submits can race before eventual winner consistency settles.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { collection, doc, addDoc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { firestore } from "../../../../firebase/firebase";
import { toNumberMap, getStartedAtMs, getElapsedMs, computeWinner } from "../../../../utils/matchHelpers";
import { verifyAuthToken } from "../../../../utils/authHelpers";

const PENALTY_MS = Number(process.env.MATCH_SUBMISSION_PENALTY_MS || 60_000);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { matchId } = req.query;
  if (!matchId || typeof matchId !== "string") return res.status(400).json({ error: "Missing matchId" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth: verify token if present; derive userId from token or fallback to body
  const verifiedUid = await verifyAuthToken(req);
  const bodyUserId = req.body?.userId;
  const { result, details } = req.body || {};

  // For tournament matches, token is required (checked after reading match doc below)
  const userId = verifiedUid || bodyUserId;
  if (!userId || !result) return res.status(400).json({ error: "Missing userId or result" });

  try {
    const matchRef = doc(firestore, "matches", matchId);
    const matchSnap = await getDoc(matchRef);
    if (!matchSnap.exists()) return res.status(404).json({ error: "Match not found" });

    const matchData = matchSnap.data() as Record<string, any>;

    // Tournament matches require verified auth token — no spoofing allowed
    if (matchData.tournamentId && !verifiedUid) {
      return res.status(401).json({ error: "Authentication required for tournament matches" });
    }

    const players = Array.isArray(matchData.players) ? matchData.players.map((p: any) => p?.userId).filter(Boolean) : [];
    if (!players.includes(userId)) return res.status(403).json({ error: "User is not part of this match" });

    const status = String(matchData.status || "active");
    if (status === "finished") {
      return res.status(200).json({ ok: true, matchFinished: true, winner: matchData.winner || null });
    }

    const nowMs = Date.now();
    const startedAtMs = getStartedAtMs(matchData);
    const penaltiesMs = toNumberMap(matchData.penaltiesMs);
    const solvedElapsedMs = toNumberMap(matchData.solvedElapsedMs);

    const normalizedResult = String(result).toLowerCase();
    const isAccepted = normalizedResult === "win" || normalizedResult === "accepted";
    const isIncorrect = !isAccepted;

    if (isIncorrect) {
      penaltiesMs[userId] = (penaltiesMs[userId] || 0) + PENALTY_MS;
    } else if (typeof solvedElapsedMs[userId] !== "number") {
      solvedElapsedMs[userId] = getElapsedMs(userId, nowMs, startedAtMs, penaltiesMs, solvedElapsedMs);
    }

    const winnerDecision = computeWinner(players, nowMs, startedAtMs, penaltiesMs, solvedElapsedMs);

    const submissionsCol = collection(firestore, `matches/${matchId}/submissions`);
    const subRef = await addDoc(submissionsCol, {
      userId,
      result: isAccepted ? "accepted" : normalizedResult,
      details: details || null,
      penaltyAppliedMs: isIncorrect ? PENALTY_MS : 0,
      elapsedMs: getElapsedMs(userId, nowMs, startedAtMs, penaltiesMs, solvedElapsedMs),
      createdAt: serverTimestamp(),
      createdAtMs: nowMs,
    });

    await setDoc(
      matchRef,
      {
        startedAtMs,
        penaltiesMs,
        solvedElapsedMs,
        status: winnerDecision ? "finished" : status,
        winner: winnerDecision ? winnerDecision.winner : null,
        winnerReason: winnerDecision ? winnerDecision.reason : null,
        winnerDecidedAtMs: winnerDecision ? nowMs : null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const added = await getDoc(subRef);
    return res.status(200).json({
      id: added.id,
      ...added.data(),
      matchFinished: Boolean(winnerDecision),
      winner: winnerDecision?.winner || null,
      winnerReason: winnerDecision?.reason || null,
    });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}

