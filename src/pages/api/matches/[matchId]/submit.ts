import type { NextApiRequest, NextApiResponse } from "next";
import { collection, doc, addDoc, serverTimestamp, setDoc, getDoc } from "firebase/firestore";
import { firestore } from "../../../../firebase/firebase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { matchId } = req.query;
  if (!matchId || typeof matchId !== "string") return res.status(400).json({ error: "Missing matchId" });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, result, details } = req.body || {};
  if (!userId || !result) return res.status(400).json({ error: "Missing userId or result" });

  try {
    const submissionsCol = collection(firestore, `matches/${matchId}/submissions`);
    const subRef = await addDoc(submissionsCol, {
      userId,
      result,
      details: details || null,
      createdAt: serverTimestamp(),
    });

    // if result indicates a win, mark match finished
    if (result === "win") {
      const matchRef = doc(firestore, "matches", matchId);
      await setDoc(matchRef, { status: "finished", winner: userId, updatedAt: serverTimestamp() }, { merge: true });
    }

    const added = await getDoc(subRef);
    return res.status(200).json({ id: added.id, ...added.data() });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
