/**
 * Artifact:             judge.ts
 * Description:          TypeScript type definitions for judge server integration.
 *                       Defines function metadata, test case structures, and judge request/response formats.
 *
 * Programmer:           Carlos Mbendera (EECS 582)
 * Date Created:         2026-03-01
 *
 * Preconditions:        N/A — file contains only type definitions; no runtime behavior.
 * Acceptable Input:     N/A — compile-time types only.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       N/A — no runtime state is modified.
 * Return Values:        Exports types: JudgeTestCase, JudgeFunctionMetadata, JudgeRequest, JudgeResponse, etc.
 *
 * Error/Exception Conditions:
 *                       N/A — type mismatches are caught at compile time by TypeScript.
 * Side Effects:         None.
 * Invariants:           Function metadata must align with the problem's starter code.
 * Known Faults:         None known.
 */

/**
 * Represents a single test case for the judge server.
 * Arguments are structured as an array of values that will be passed to the function.
 */
export type JudgeTestCase = {
	args: any[];
	expected: any;
};

/**
 * Metadata about the function that must be implemented for a problem.
 * This enables the judge server to properly invoke and validate the user's function.
 */
export type JudgeFunctionMetadata = {
	/** Name of the function to invoke (e.g., "twoSum", "validParentheses") */
	name: string;
	/** Structured test cases with arguments and expected outputs */
	testCases: JudgeTestCase[];
	/** Optional language-specific signature or constraints */
	signature?: string;
	/** Optional comparator function name if custom comparison is needed */
	comparator?: string;
};

/**
 * Request payload sent to the judge server for code execution and validation.
 */
export type JudgeRequest = {
	/** Programming language: "javascript", "python", or "cpp" */
	language: "javascript" | "python" | "cpp";
	/** Raw user-submitted code */
	code: string;
	/** Function metadata including test cases */
	metadata: JudgeFunctionMetadata;
};

/**
 * Individual test result from the judge server.
 */
export type JudgeTestResult = {
	/** Test case index */
	testIndex: number;
	/** Whether the test passed */
	passed: boolean;
	/** Expected output */
	expected: any;
	/** Actual output if test failed */
	actual?: any;
	/** Error message if compilation/execution failed */
	error?: string;
	/** Captured stdout (print/debug lines) from the user's program, excluding the JSON payload */
	stdout?: string;
};

/**
 * Response from the judge server after code execution and validation.
 */
export type JudgeResponse = {
	/** Overall status: "accepted" (all tests pass), "compilation_error", "runtime_error", "wrong_answer" */
	status: "accepted" | "compilation_error" | "runtime_error" | "wrong_answer" | "timeout";
	/** Individual test results */
	testResults: JudgeTestResult[];
	/** Human-readable message */
	message: string;
	/** Execution time in milliseconds */
	executionTime?: number;
	/** Memory used in bytes */
	memory?: number;
};
