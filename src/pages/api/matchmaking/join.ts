/**
 * Prologue comment
 * Name of code artifact: join.ts (API route: /api/matchmaking/join)
 * Brief description: Queues users for matchmaking, pairs opponents, creates active match documents, and initializes timing metadata.
 * Programmer's name: Jonathan Johnston
 * Date the code was created: 2026-03-19
 * Dates the code was revised:
 *   - 2026-03-19: Added active-match creation with timer/penalty initialization fields (Jonathan Johnston)
 *   - 2026-03-20: Added display-name resolution from users collection with fallback behavior (Jonathan Johnston)
 * Brief description of each revision & author: See revision list above.
 * Preconditions:
 *   - Request method is POST with userId.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: JSON body with userId and optional displayName/problemId.
 *   - Unacceptable: missing userId or unsupported method.
 * Postconditions:
 *   - Returns queued response or immediate match assignment when opponent is available.
 * Return values or types, and their meanings:
 *   - JSON JoinResponse ({ queued: true, queueId } or { queued: false, matchId, opponent }).
 * Error and exception condition values or types that can occur, and their meanings:
 *   - 400 for missing userId.
 *   - 405 for unsupported method.
 *   - 500 for queue/match write failures.
 * Side effects:
 *   - Writes/deletes matchmaking_queue docs and writes new matches docs.
 * Invariants:
 *   - Newly created matches start with status active and initialized timer maps.
 * Any known faults:
 *   - Queue cleanup is opportunistic and tied to join traffic, not a scheduled cleanup job.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { firestore } from "../../../firebase/firebase";
import type { JoinResponse } from "../../../utils/types/matchmaking";
import type { Match, MatchPlayer } from "../../../utils/types/match";

async function resolveDisplayName(userId: string, fallback?: string | null): Promise<string | null> {
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
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<JoinResponse | { error: string }>) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, displayName, problemId } = req.body || {};
  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const queueCol = collection(firestore, "matchmaking_queue");


    // Query all queue entries for the same problem (or any if problemId not provided)
    let q = query(queueCol, orderBy("createdAt"));
    if (problemId) q = query(queueCol, where("problemId", "==", problemId), orderBy("createdAt"));

    const snapshot = await getDocs(q);
    const now = Date.now();
    const EXPIRATION_MS = 2 * 60 * 1000; // 2 minutes
    let opponentDoc = null;

    // Clean up expired queue docs and find a valid opponent (not just the oldest)
    for (const d of snapshot.docs) {
      const data = d.data();
      // Firestore serverTimestamp() is not immediately available, so fallback to client if missing
      const createdAt = (data.createdAt && data.createdAt.toMillis) ? data.createdAt.toMillis() : (data.createdAt ? data.createdAt : 0);
      if (now - createdAt > EXPIRATION_MS) {
        // Delete expired doc
        await deleteDoc(doc(firestore, "matchmaking_queue", d.id));
        continue;
      }
      if (data.userId !== userId) {
        opponentDoc = d;
        break;
      }
    }

    if (opponentDoc) {
      const oppData = opponentDoc.data() as any;
      const batch = writeBatch(firestore);
      const [meDisplayName, oppDisplayName] = await Promise.all([
        resolveDisplayName(userId, displayName || null),
        resolveDisplayName(oppData.userId, oppData.displayName || null),
      ]);

      const nowDate = new Date();
      const startedAtMs = Date.now();
      const match: Match = {
        players: [
          { userId, displayName: meDisplayName || undefined, joinedAt: nowDate } as unknown as MatchPlayer,
          { userId: oppData.userId, displayName: oppDisplayName || undefined, joinedAt: nowDate } as unknown as MatchPlayer,
        ],
        problemId: problemId || oppData.problemId,
        status: "active",
        winner: null,
        startedAtMs,
        createdAtMs: startedAtMs,
        penaltiesMs: {
          [userId]: 0,
          [oppData.userId]: 0,
        },
        solvedElapsedMs: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const matchesCol = collection(firestore, "matches");
      const matchRef = doc(matchesCol);
      batch.set(matchRef, match as any);

      // delete opponent queue doc
      batch.delete(doc(firestore, "matchmaking_queue", opponentDoc.id));

      await batch.commit();

      return res.status(200).json({
        queued: false,
        matchId: matchRef.id,
        opponent: { userId: oppData.userId, displayName: oppDisplayName || undefined },
      });
    }

    // No opponent â€” add to queue
    const qDoc = await addDoc(queueCol, {
      userId,
      displayName: displayName || null,
      problemId: problemId || null,
      createdAt: serverTimestamp(),
    });

    return res.status(200).json({ queued: true, queueId: qDoc.id });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}

