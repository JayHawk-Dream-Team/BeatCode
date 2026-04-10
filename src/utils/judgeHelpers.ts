/**
 * Artifact:             judgeHelpers.ts
 * Description:          Shared helpers for comparing judge /run results against expected
 *                       outputs and building a JudgeResponse from per-test results.
 *
 * Programmer:           Carlos Mbendera (EECS 582, with help from Claude)
 * Date Created:         2026-03-01
 */

import { JudgeResponse, JudgeTestResult } from "./types/judge";

/**
 * Parses a single /run response `{ exitCode, stdout, stderr }` and compares it
 * against the expected value for this test case.
 */
export function evaluateRunResult(
	runData: { exitCode?: number; stdout?: string; stderr?: string; error?: string },
	expected: any,
	testIndex: number,
	options?: {
		inPlaceArgIndex?: number;
		judgeMode?: "return_only" | "in_place_ordered" | "in_place_unordered" | "in_place_full_ordered";
	}
): JudgeTestResult {
	// Non-zero exit code → runtime/compilation error
	if (runData.exitCode !== 0) {
		return {
			testIndex,
			passed: false,
			expected,
			actual: undefined,
			error: (runData.stderr || runData.stdout || runData.error || "Runtime error").trim(),
		};
	}

	// Parse the JSON output printed by the driver script. Many user solutions
	// print debugging lines; attempt to recover the JSON payload even when
	// extra stdout is present (e.g., LeetCode-style prints).
	const rawStdout = runData.stdout ?? "";
	const trimmed = rawStdout.trim();

	const tryParse = (s: string | undefined) => {
		if (s === undefined) return null;
		try {
			return JSON.parse(s);
		} catch {
			return null;
		}
	};

	// 1) Try parsing the whole stdout
	let actual: any = tryParse(trimmed);

	// 2) If that fails, try the last non-empty line (common when prints precede JSON)
	if (actual === null) {
		const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== "");
		if (lines.length > 0) {
			actual = tryParse(lines[lines.length - 1]);
		}
	}

	// 3) If still failing, attempt to find a trailing JSON object/array by
	// locating the last '{' or '[' and parsing from there.
	if (actual === null && trimmed.length > 0) {
		const lastBraceIdx = Math.max(trimmed.lastIndexOf('{'), trimmed.lastIndexOf('['));
		if (lastBraceIdx !== -1) {
			const candidate = trimmed.slice(lastBraceIdx);
			actual = tryParse(candidate);
		}
	}

	if (actual === null) {
		return {
			testIndex,
			passed: false,
			expected,
			actual: rawStdout.trim(),
			error: "Could not parse function output as JSON",
			stdout: rawStdout.trim(),
		};
	}

	// Determine any printed output (everything in stdout except the JSON payload)
	let printed: string | undefined = undefined;
	if (trimmed === JSON.stringify(actual)) {
		printed = undefined;
	} else {
		// If the whole stdout parsed as JSON, nothing was printed.
		// Otherwise try to remove the parsed candidate from the end to leave only prints.
		const lines = rawStdout.split(/\r?\n/);
		// If last non-empty line was the JSON payload, drop it.
		const lastNonEmptyIdx = (() => {
			for (let i = lines.length - 1; i >= 0; i--) {
				if (lines[i].trim() !== "") return i;
			}
			return -1;
		})();
		if (lastNonEmptyIdx >= 0) {
			const lastLine = lines[lastNonEmptyIdx].trim();
			if (tryParse(lastLine) !== null) {
				const printedLines = lines.slice(0, lastNonEmptyIdx);
				printed = printedLines.join("\n").trim() || undefined;
			} else {
				// Fallback: if we extracted candidate from a trailing brace, remove that suffix
				const lastBraceIdx = Math.max(trimmed.lastIndexOf('{'), trimmed.lastIndexOf('['));
				if (lastBraceIdx !== -1) {
					const prefix = trimmed.slice(0, lastBraceIdx).trim();
					printed = prefix || undefined;
				} else {
					printed = rawStdout.trim() || undefined;
				}
			}
		}

	}

	const judgeEnvelope =
		actual &&
		typeof actual === "object" &&
		(actual as any).__judge &&
		typeof (actual as any).__judge === "object"
			? (actual as any).__judge
			: null;
	const actualResult = judgeEnvelope ? judgeEnvelope.result : actual;
	const mutatedArgs = judgeEnvelope && Array.isArray(judgeEnvelope.mutatedArgs) ? judgeEnvelope.mutatedArgs : undefined;
	const judgeMode = options?.judgeMode ?? "return_only";

	if (judgeMode === "in_place_full_ordered" && mutatedArgs) {
		const argIndex = Number.isInteger(options?.inPlaceArgIndex) ? Number(options?.inPlaceArgIndex) : 0;
		const targetArg = mutatedArgs[argIndex];
		const expectedArray = parseExpectedArray(expected);
		if (Array.isArray(targetArg) && Array.isArray(expectedArray)) {
			const actualSlice = targetArg.slice(0, expectedArray.length);
			const normalize = (v: any): any =>
				Array.isArray(v) ? v.map(normalize) : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : v;
			const actualNorm = normalize(actualSlice);
			const expectedNorm = normalize(expectedArray);
			const passed = deepEqual(actualNorm, expectedNorm);
			return {
				testIndex,
				passed,
				expected,
				actual: {
					result: actualResult,
					mutatedPrefix: actualSlice,
					mutatedArgIndex: argIndex,
				},
				stdout: printed,
				...(passed
					? {}
					: {
							error: `Expected nums1=${JSON.stringify(expectedNorm)}, got nums1=${JSON.stringify(actualNorm)}`,
					  }),
			};
		}
	}

	const inPlaceExpectation = parseInPlaceExpectation(expected);
	if (inPlaceExpectation && mutatedArgs) {
		const argIndex = Number.isInteger(options?.inPlaceArgIndex) ? Number(options?.inPlaceArgIndex) : 0;
		const targetArg = mutatedArgs[argIndex];
		const actualK = Number(actualResult);
		const expectedK = inPlaceExpectation.k;
		const prefixArray = Array.isArray(targetArg) ? targetArg.slice(0, expectedK) : undefined;
		const normalize = (v: any): any =>
			Array.isArray(v) ? v.map(normalize) : typeof v === "string" && /^-?\d+(\.\d+)?$/.test(v.trim()) ? Number(v) : v;
		const actualNorm = Array.isArray(prefixArray) ? normalize(prefixArray) : prefixArray;
		const expectedNorm = normalize(inPlaceExpectation.prefix);
		const orderedMatch = Array.isArray(actualNorm) && deepEqual(actualNorm, expectedNorm);
		const unorderedMatch =
			Array.isArray(actualNorm) &&
			deepEqual(
				[...actualNorm].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
				[...expectedNorm].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
			);
		const prefixMatches = judgeMode === "in_place_unordered" ? unorderedMatch : orderedMatch;
		const passed = Number.isFinite(actualK) && actualK === expectedK && prefixMatches;

		return {
			testIndex,
			passed,
			expected,
			actual: {
				result: actualResult,
				mutatedPrefix: prefixArray,
				mutatedArgIndex: argIndex,
			},
			stdout: printed,
			...(passed
				? {}
				: {
						error: `Expected k=${expectedK} and nums prefix=${JSON.stringify(
							inPlaceExpectation.prefix
						)}, got k=${String(actualResult)} and nums prefix=${JSON.stringify(prefixArray)}`,
				  }),
		};
	}

	const passed = deepEqual(actualResult, expected);
	return { testIndex, passed, expected, actual: actualResult, stdout: printed };
}

function parseExpectedArray(expected: any): any[] | null {
	if (Array.isArray(expected)) return expected;
	if (typeof expected !== "string") return null;
	const trimmed = expected.trim();
	if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
	try {
		const parsed = JSON.parse(trimmed);
		return Array.isArray(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function parseInPlaceExpectation(expected: any): { k: number; prefix: any[] } | null {
	if (typeof expected !== "string") return null;
	const trimmed = expected.trim();
	const match = trimmed.match(/^(-?\d+)\s*,\s*nums\s*=\s*\[(.*)\]\s*$/i);
	if (!match) return null;

	const k = Number.parseInt(match[1], 10);
	if (!Number.isFinite(k) || k < 0) return null;

	const body = String(match[2] || "").trim();
	if (body === "") return { k, prefix: [] };

	const rawTokens = body.split(",").map((t) => t.trim());
	const prefix = rawTokens
		.filter((t) => t !== "_" && t !== "")
		.slice(0, k)
		.map((token) => parseLiteralToken(token));

	return { k, prefix };
}

function parseLiteralToken(token: string): any {
	if (/^-?\d+$/.test(token)) return Number.parseInt(token, 10);
	if (/^-?\d+\.\d+$/.test(token)) return Number(token);
	if (/^(true|false)$/i.test(token)) return token.toLowerCase() === "true";
	if (/^".*"$/.test(token) || /^'.*'$/.test(token)) return token.slice(1, -1);
	return token;
}

/**
 * Aggregates per-test results into a JudgeResponse.
 */
export function buildJudgeResponse(results: JudgeTestResult[]): JudgeResponse {
	const total = results.length;
	const passCount = results.filter((r) => r.passed).length;
	const hasRuntimeError = results.some((r) => r.error);

	let status: JudgeResponse["status"];
	if (passCount === total) {
		status = "accepted";
	} else if (hasRuntimeError) {
		status = "runtime_error";
	} else {
		status = "wrong_answer";
	}

	return {
		status,
		testResults: results,
		message:
			status === "accepted"
				? "All test cases passed"
				: `${passCount}/${total} test case${total === 1 ? "" : "s"} passed`,
	};
}

/**
 * Deep equality check that handles arrays, objects, primitives, and null/undefined.
 * Used to compare function output against expected test case values.
 */
function deepEqual(a: any, b: any): boolean {
	if (a === b) return true;
	if (a === null || b === null) return false;
	if (typeof a !== typeof b) return false;

	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		return a.every((v, i) => deepEqual(v, b[i]));
	}

	if (typeof a === "object") {
		const keysA = Object.keys(a).sort();
		const keysB = Object.keys(b).sort();
		if (keysA.length !== keysB.length) return false;
		return keysA.every((k, i) => k === keysB[i] && deepEqual(a[k], b[k]));
	}

	return false;
}
