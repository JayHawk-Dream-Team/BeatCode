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
    let matchId = null;
    snap.forEach((doc) => {
      const data = doc.data();
      if (data.players && Array.isArray(data.players) && data.players.some((p: any) => p.userId === userId)) {
        matchId = doc.id;
      }
    });
    return res.status(200).json({ matchId });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
