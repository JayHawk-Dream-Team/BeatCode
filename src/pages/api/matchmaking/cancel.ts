import type { NextApiRequest, NextApiResponse } from "next";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { firestore } from "../../../firebase/firebase";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { userId, queueId } = req.body || {};
  if (!userId && !queueId) return res.status(400).json({ error: "Missing userId or queueId" });

  try {
    if (queueId) {
      await deleteDoc(doc(firestore, "matchmaking_queue", queueId));
      return res.status(200).json({ cancelled: true });
    }

    const q = query(collection(firestore, "matchmaking_queue"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const batchDeletes = [] as Promise<any>[];
    snap.forEach((d) => batchDeletes.push(deleteDoc(doc(firestore, "matchmaking_queue", d.id))));
    await Promise.all(batchDeletes);
    return res.status(200).json({ cancelled: true });
  } catch (err: any) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
