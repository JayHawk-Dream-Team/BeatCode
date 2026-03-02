import type { NextApiRequest, NextApiResponse } from "next";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "../../../../firebase/firebase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { matchId } = req.query;
  if (!matchId || typeof matchId !== "string") return res.status(400).json({ error: "Missing matchId" });

  const matchRef = doc(firestore, "matches", matchId);

  try {
    if (req.method === "GET") {
      const snapshot = await getDoc(matchRef);
      if (!snapshot.exists()) return res.status(404).json({ error: "Match not found" });
      return res.status(200).json({ id: snapshot.id, ...snapshot.data() });
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
