/**
 * Prologue Comment
 * Name of Code Artifact: run.ts (API route: /api/judge/run)
 * Brief Description: Executes a quick run against sample test cases by forwarding code and metadata to the judge service.
 * Programmer: Jonathan Johnston
 * Date Created: 2026-03-01
 * Dates Revised:
 *   - 2026-03-01: Initial route for run-mode judge execution flow (Carlos Mbendera)
 *   - 2026-03-15: Added/updated formal prologue documentation block and revision metadata (Jonathan Johnston)
 * Preconditions:
 *   - Request method is POST.
 *   - JUDGE_URL environment variable is defined and points to a reachable judge service.
 * Acceptable Input Values/Types:
 *   - Body: { language: "javascript"|"python"|"cpp", code: string, metadata?: object, stdin?: string }
 *   - metadata.name and metadata.testCases should be present for function-based run mode.
 * Unacceptable Input Values/Types:
 *   - Missing language/code, unsupported language, non-POST methods.
 * Postconditions:
 *   - Returns aggregated test results for run mode, or raw stdin/stdout run response for legacy mode.
 * Return Values/Types:
 *   - JSON object compatible with JudgeResponse or upstream judge error payload.
 * Error and Exception Conditions:
 *   - 405 for invalid method.
 *   - 400 for malformed request fields.
 *   - 500 for missing JUDGE_URL.
 *   - 502 when judge service is unavailable or request fails.
 * Side Effects:
 *   - Issues outbound HTTP requests to the external judge service.
 * Invariants:
 *   - Supported language set remains {javascript, python, cpp}.
 * Known Faults:
 *   - None currently documented beyond upstream judge/network dependency risk.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { JudgeResponse, JudgeTestResult } from "@/utils/types/judge";
import { evaluateRunResult, buildJudgeResponse } from "@/utils/judgeHelpers";

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

	const { language, code, metadata, stdin, problemId, beatcodeId } = req.body;

	// Validation
	if (!language || !code) {
		return res.status(400).json({ error: "Missing required fields: language, code" });
	}

	if (!["javascript", "python", "cpp"].includes(language)) {
		return res.status(400).json({ error: "Invalid language. Must be javascript, python, or cpp" });
	}

	try {
		if (metadata && metadata.name) {

			// Run only the first 3 test cases for a quick "Run" check
			const testCasesToRun = metadata.testCases.slice(0, 3);
			const base = judgeUrl.replace(/\/$/, "");
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

			const results: JudgeTestResult[] = await Promise.all(
				testCasesToRun.map(async (tc: { args: any[]; expected: any; inPlaceArgIndex?: number }, idx: number) => {
					const requestBody: Record<string, any> = {
						language,
						code,
						functionName: effectiveFunctionName,
						args: tc.args,
						beatcodeId,
					...(language === "cpp" && Array.isArray(metadata.cppArgTypes) ? { argTypes: metadata.cppArgTypes } : {}),
						timeoutMs: 5000,
					};

					const resp = await fetch(`${base}/run`, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(requestBody),
					});
					const runData = await resp.json();
					return evaluateRunResult(runData, tc.expected, idx, {
						inPlaceArgIndex: tc.inPlaceArgIndex,
						judgeMode: forcedJudgeMode,
					});
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







