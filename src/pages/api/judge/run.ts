import type { NextApiRequest, NextApiResponse } from "next";
import { JudgeResponse, JudgeTestResult } from "@/utils/types/judge";
import { buildRunnerScript, validateFunctionPresence } from "@/utils/codePreprocessor";
import { evaluateRunResult, buildJudgeResponse } from "@/utils/judgeHelpers";

/**
 * Artifact:             run.ts (judge/run API endpoint)
 * Description:          Handles test run requests by forwarding preprocessed code to the judge server.
 *                       Supports both function-based invocation (new) and stdin/stdout (legacy).
 *
 * Programmer:           Carlos Mbendera (EECS 582, with help from Claude)
 * Date Created:         2026-03-01
 * Revisions:
 *   2026-03-01          Rewrote to use /run + per-test driver scripts instead of /judge
 *                       endpoint which ignored metadata and always returned passed:true
 *                       (Carlos Mbendera, with help from Claude)
 *
 * Preconditions:        Valid POST request with language, code, and optionally metadata.
 * Acceptable Input:     { language: "javascript"|"python"|"cpp", code: string, metadata?: JudgeFunctionMetadata }
 * Unacceptable Input:   GET requests, missing required fields, invalid language.
 *
 * Postconditions:       Returns judge server response or appropriate error.
 * Return Values:        JSON JudgeResponse or error message.
 *
 * Error/Exception Conditions:
 *                       Missing JUDGE_URL environment variable
 *                       Judge service unavailable
 *                       Invalid request format
 * Side Effects:         Forwards request to external judge service.
 * Invariants:           JUDGE_URL must be a valid URL.
 * Known Faults:         None known.
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const judgeUrl = process.env.JUDGE_URL;
	if (!judgeUrl) {
		return res.status(500).json({ error: "Missing JUDGE_URL environment variable" });
	}

	const { language, code, metadata, stdin } = req.body;

	// Validation
	if (!language || !code) {
		return res.status(400).json({ error: "Missing required fields: language, code" });
	}

	if (!["javascript", "python", "cpp"].includes(language)) {
		return res.status(400).json({ error: "Invalid language. Must be javascript, python, or cpp" });
	}

	try {
		if (metadata && metadata.name) {
			// Validate the function exists before sending to judge
			if (!validateFunctionPresence(code, metadata.name, language)) {
				return res.status(400).json({
					error: `Function "${metadata.name}" not found in submitted code`,
				});
			}

			// Run only the first 3 test cases for a quick "Run" check
			const testCasesToRun = metadata.testCases.slice(0, 3);
			const base = judgeUrl.replace(/\/$/, "");

			const results: JudgeTestResult[] = await Promise.all(
				testCasesToRun.map(async (tc: { args: any[]; expected: any }, idx: number) => {
					const driverCode = buildRunnerScript(code, metadata.name, tc.args, language);
					const resp = await fetch(`${base}/run`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ language, code: driverCode, timeoutMs: 5000 }),
					});
					const runData = await resp.json();
					return evaluateRunResult(runData, tc.expected, idx);
				})
			);

			return res.status(200).json(buildJudgeResponse(results));
		} else {
			// Legacy stdin/stdout mode
			const response = await fetch(`${judgeUrl.replace(/\/$/, "")}/run`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ language, code, stdin: stdin || "" }),
			});
			const data = await response.json();
			return res.status(response.status).json(data);
		}
	} catch (error: any) {
		return res.status(502).json({
			error: "Judge service unavailable",
			details: String(error?.message || error),
		});
	}
}
