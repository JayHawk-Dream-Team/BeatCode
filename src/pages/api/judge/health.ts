import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const judgeUrl = process.env.JUDGE_URL;
	if (!judgeUrl) {
		return res.status(500).json({ ok: false, error: "Missing JUDGE_URL environment variable" });
	}

	try {
		const response = await fetch(`${judgeUrl.replace(/\/$/, "")}/health`);
		const data = await response.json();
		return res.status(response.status).json(data);
	} catch (error: any) {
		return res
			.status(502)
			.json({ ok: false, error: "Judge service unavailable", details: String(error?.message || error) });
	}
}
