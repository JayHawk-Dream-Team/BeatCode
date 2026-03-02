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
	testIndex: number
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

	// Parse the JSON output printed by the driver script
	let actual: any = undefined;
	try {
		actual = JSON.parse((runData.stdout ?? "").trim());
	} catch {
		return {
			testIndex,
			passed: false,
			expected,
			actual: runData.stdout?.trim(),
			error: "Could not parse function output as JSON",
		};
	}

	const passed = deepEqual(actual, expected);
	return { testIndex, passed, expected, actual };
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
