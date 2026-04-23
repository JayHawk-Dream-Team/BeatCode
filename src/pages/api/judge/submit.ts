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

const JUDGE_REQUEST_TIMEOUT_MS = 15000;

async function postJsonWithTimeout(url: string, body: Record<string, any>, timeoutMs = JUDGE_REQUEST_TIMEOUT_MS) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const resp = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: controller.signal,
		});
		const data = await resp.json();
		return { resp, data };
	} finally {
		clearTimeout(timer);
	}
}

function deriveFunctionName(language: "javascript" | "python" | "cpp", code: string): string | undefined {
	const src = String(code || "");
	if (!src.trim()) return undefined;

	if (language === "python") {
		const matches = [...src.matchAll(/\bdef\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/g)];
		for (const m of matches) {
			const name = m[1];
			if (name && name !== "__init__") return name;
		}
		return undefined;
	}

	if (language === "javascript") {
		const fnDecl = src.match(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
		if (fnDecl?.[1]) return fnDecl[1];
		const fnExpr = src.match(/\b(?:var|let|const)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*function\b/);
		if (fnExpr?.[1]) return fnExpr[1];
		const arrow = src.match(/\b(?:var|let|const)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/);
		if (arrow?.[1]) return arrow[1];
		return undefined;
	}

	const classMethod = src.match(/\bclass\s+Solution\b[\s\S]*?\b(?:public|private|protected)\s*:\s*[\s\S]*?\b([A-Za-z_][A-Za-z0-9_]*)\s*\([^;{}]*\)\s*\{/);
	if (classMethod?.[1]) return classMethod[1];
	const freeFn = src.match(/\b(?:auto|void|bool|int|long long|double|string|vector<[^>]+>|std::vector<[^>]+>|\w+)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^;{}]*\)\s*\{/);
	if (freeFn?.[1]) return freeFn[1];
	return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const judgeUrl = process.env.JUDGE_URL;
	if (!judgeUrl) {
		return res.status(500).json({ error: "Missing JUDGE_URL environment variable" });
	}

	const { language, code, metadata, problemId, beatcodeId } = req.body;

	// Validation
	if (!language || !code) {
		return res.status(400).json({ error: "Missing required fields: language, code" });
	}

	if (!["javascript", "python", "cpp"].includes(language)) {
		return res.status(400).json({ error: "Invalid language. Must be javascript, python, or cpp" });
	}

	try {
		if (metadata && metadata.name) {

			const base = judgeUrl.replace(/\/$/, "");
			const testCases = metadata.testCases as { args: any[]; expected: any; inPlaceArgIndex?: number }[];
			const metadataName = String(metadata.name || "").trim();
			const derivedName = deriveFunctionName(language, code);
			const effectiveFunctionName =
				metadataName && metadataName.toLowerCase() !== "solution" ? metadataName : derivedName || metadataName || "solution";
			const normalizedFn = String(effectiveFunctionName || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
			const normalizedProblemId = String(problemId ?? "").trim().toLowerCase();
			const normalizedBeatcodeId = String(beatcodeId ?? "").trim().toLowerCase();
			const forcedJudgeMode =
				normalizedProblemId === "17" || normalizedBeatcodeId === "17"
					? "in_place_full_ordered"
					: normalizedFn.includes("sortedarraytobst")
					? "bst_from_sorted"
					: normalizedFn.includes("removeelement")
					? "in_place_unordered"
					: normalizedFn.includes("removeduplicates")
					? "in_place_ordered"
					: metadata.judgeMode;

			const buildRequestBody = (tc: { args: any[]; expected: any }): Record<string, any> => ({
				language,
				code,
				functionName: effectiveFunctionName,
				args: tc.args,
				beatcodeId,
				...(language === "cpp" && Array.isArray(metadata.cppArgTypes) ? { argTypes: metadata.cppArgTypes } : {}),
				timeoutMs: 5000,
			});

			let results: JudgeTestResult[] = [];

			// C++ compiles on each /run and can saturate small servers under Promise.all fan-out.
			// Keep C++ submissions sequential to avoid hanging submits.
			if (language === "cpp") {
				for (let idx = 0; idx < testCases.length; idx += 1) {
					const tc = testCases[idx];
					const { data } = await postJsonWithTimeout(`${base}/run`, buildRequestBody(tc));
					results.push(
						evaluateRunResult(data, tc.expected, idx, {
							inPlaceArgIndex: tc.inPlaceArgIndex,
							judgeMode: forcedJudgeMode,
						})
					);
				}
			} else {
				results = await Promise.all(
					testCases.map(async (tc, idx) => {
						const { data } = await postJsonWithTimeout(`${base}/run`, buildRequestBody(tc));
						return evaluateRunResult(data, tc.expected, idx, {
							inPlaceArgIndex: tc.inPlaceArgIndex,
							judgeMode: forcedJudgeMode,
						});
					})
				);
			}

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







