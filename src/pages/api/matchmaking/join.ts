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
  deleteDoc
} from "firebase/firestore";
import { firestore } from "../../../firebase/firebase";
import type { JoinResponse } from "../../../utils/types/matchmaking";
import type { Match, MatchPlayer } from "../../../utils/types/match";

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

      const nowDate = new Date();
      const match: Match = {
        players: [
          { userId, displayName, joinedAt: nowDate } as unknown as MatchPlayer,
          { userId: oppData.userId, displayName: oppData.displayName, joinedAt: nowDate } as unknown as MatchPlayer,
        ],
        problemId: problemId || oppData.problemId,
        status: "starting",
        winner: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const matchesCol = collection(firestore, "matches");
      const matchRef = doc(matchesCol);
      batch.set(matchRef, match as any);

      // delete opponent queue doc
      batch.delete(doc(firestore, "matchmaking_queue", opponentDoc.id));

      await batch.commit();

      return res.status(200).json({ queued: false, matchId: matchRef.id, opponent: { userId: oppData.userId, displayName: oppData.displayName } });
    }

    // No opponent — add to queue
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
