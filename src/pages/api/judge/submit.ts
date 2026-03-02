import type { NextApiRequest, NextApiResponse } from "next";
import { JudgeResponse, JudgeTestResult } from "@/utils/types/judge";
import { buildRunnerScript, validateFunctionPresence } from "@/utils/codePreprocessor";
import { evaluateRunResult, buildJudgeResponse } from "@/utils/judgeHelpers";

/**
 * Artifact:             submit.ts (judge/submit API endpoint)
 * Description:          Handles final code submission requests by forwarding to the judge server.
 *                       Supports function-based invocation (LeetCode-style) and stdin/stdout (Codeforces-style).
 *
 * Programmer:           Carlos Mbendera (EECS 582, with help from Claude)
 * Date Created:         2026-03-01
 * Revisions:
 *   2026-03-01          Rewrote to use /run + per-test driver scripts instead of /judge
 *                       endpoint which ignored metadata and always returned passed:true
 *                       (Carlos Mbendera, with help from Claude)
 *
 * Preconditions:        Valid POST request with language, code, and metadata.
 * Acceptable Input:     { language: "javascript"|"python"|"cpp", code: string, metadata?: JudgeFunctionMetadata }
 * Unacceptable Input:   GET requests, missing required fields, invalid language.
 *
 * Postconditions:       Returns judge server response with test results.
 * Return Values:        JSON JudgeResponse with detailed test results or error.
 *
 * Error/Exception Conditions:
 *                       Missing JUDGE_URL environment variable
 *                       Judge service unavailable
 *                       Function not found in code
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

	const { language, code, metadata } = req.body;

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

			// Run all test cases in parallel using /run + driver scripts
			const base = judgeUrl.replace(/\/$/, "");
			const results: JudgeTestResult[] = await Promise.all(
				metadata.testCases.map(async (tc: { args: any[]; expected: any }, idx: number) => {
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
			return res.status(400).json({
				error: "Problem metadata is required for submission",
				details: "metadata field with function name and test cases must be provided",
			});
		}
	} catch (error: any) {
		return res.status(502).json({
			error: "Judge service unavailable",
			details: String(error?.message || error),
		});
	}
}
