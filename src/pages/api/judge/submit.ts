/**
 * Prologue Comment
 * Name of Code Artifact: submit.ts (API route: /api/judge/submit)
 * Brief Description: Executes full submission judging by running all configured test cases through the judge service.
 * Programmer: Jonathan Johnston
 * Date Created: 2026-03-01
 * Dates Revised:
 *   - 2026-03-01: Initial submission route for full test-case evaluation (Carlos Mbendera)
 *   - 2026-03-15: Added/updated formal prologue documentation block and revision metadata (Jonathan Johnston)
 * Preconditions:
 *   - Request method is POST.
 *   - JUDGE_URL is configured.
 *   - metadata with function name and test cases is provided.
 * Acceptable Input Values/Types:
 *   - Body: { language: "javascript"|"python"|"cpp", code: string, metadata: JudgeFunctionMetadata }
 * Unacceptable Input Values/Types:
 *   - Missing metadata/name/test cases, unsupported language, empty code, non-POST methods.
 * Postconditions:
 *   - Returns combined pass/fail status over all test cases.
 * Return Values/Types:
 *   - JSON JudgeResponse-shaped payload with per-test outcomes and summary status.
 * Error and Exception Conditions:
 *   - 405 for invalid method.
 *   - 400 for validation failures.
 *   - 500 for missing JUDGE_URL.
 *   - 502 for judge connectivity/runtime request failures.
 * Side Effects:
 *   - Sends one upstream /run request per test case.
 * Invariants:
 *   - Language whitelist and response-shaping behavior are consistent with run.ts.
 * Known Faults:
 *   - Overall correctness depends on upstream judge wrapper behavior and metadata quality.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { JudgeResponse, JudgeTestResult } from "@/utils/types/judge";
import { evaluateRunResult, buildJudgeResponse } from "@/utils/judgeHelpers";

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

			// Run all test cases in parallel using /run + driver scripts
			const base = judgeUrl.replace(/\/$/, "");
			const results: JudgeTestResult[] = await Promise.all(
				metadata.testCases.map(async (tc: { args: any[]; expected: any }, idx: number) => {
					const requestBody: Record<string, any> = {
						language,
						code,
						functionName: metadata.name,
						args: tc.args,
					...(language === "cpp" && Array.isArray(metadata.cppArgTypes) ? { argTypes: metadata.cppArgTypes } : {}),
						timeoutMs: 5000,
					};

					const resp = await fetch(`${base}/run`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(requestBody),
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







