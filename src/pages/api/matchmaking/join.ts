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

    // Try to find a waiting opponent for the same problem (or any if problemId not provided)
    let q = query(queueCol, orderBy("createdAt"), limit(1));
    if (problemId) q = query(queueCol, where("problemId", "==", problemId), orderBy("createdAt"), limit(1));

    const snapshot = await getDocs(q);
    const opponentDoc = snapshot.docs.find((d) => d.data().userId !== userId);

    if (opponentDoc) {
      const oppData = opponentDoc.data() as any;
      const batch = writeBatch(firestore);

      const match: Match = {
        players: [
          { userId, displayName, joinedAt: serverTimestamp() } as MatchPlayer,
          { userId: oppData.userId, displayName: oppData.displayName, joinedAt: serverTimestamp() } as MatchPlayer,
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
