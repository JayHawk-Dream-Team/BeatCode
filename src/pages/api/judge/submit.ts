import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const judgeUrl = process.env.JUDGE_URL;
	if (!judgeUrl) {
		return res.status(500).json({ error: "Missing JUDGE_URL environment variable" });
	}

	try {
		const response = await fetch(`${judgeUrl.replace(/\/$/, "")}/judge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(req.body),
		});

		const data = await response.json();
		return res.status(response.status).json(data);
	} catch (error: any) {
		return res.status(502).json({ error: "Judge service unavailable", details: String(error?.message || error) });
	}
}
