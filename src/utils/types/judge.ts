/**
 * Prologue Comment
 * Name of Code Artifact: judge.ts (shared judge type definitions)
 * Brief Description: Defines TypeScript contracts for judge metadata, requests, responses, and per-test results.
 * Programmer: Jonathan Johnston
 * Date Created: 2026-03-01
 * Dates Revised:
 *   - 2026-03-01: Introduced initial judge integration types (Carlos Mbendera)
 *   - 2026-03-15: Added/updated formal prologue documentation block and revision metadata (Jonathan Johnston)
 * Preconditions:
 *   - Used in a TypeScript build context.
 * Acceptable Input Values/Types:
 *   - Type-level usage only; interfaces are consumed at compile time.
 * Unacceptable Input Values/Types:
 *   - Runtime assumptions that bypass declared type contracts.
 * Postconditions:
 *   - Consistent compile-time typing for judge communication across client/server code.
 * Return Values/Types:
 *   - Exports type aliases/interfaces such as JudgeTestCase, JudgeFunctionMetadata, JudgeResponse.
 * Error and Exception Conditions:
 *   - Type violations surface as TypeScript compile-time errors.
 * Side Effects:
 *   - None at runtime.
 * Invariants:
 *   - Judge payload structure remains centrally defined and reusable.
 * Known Faults:
 *   - Runtime payloads can still be malformed if external services bypass TS boundaries.
 */
/**
 * Represents a single test case for the judge server.
 * Arguments are structured as an array of values that will be passed to the function.
 */
export type JudgeTestCase = {
	args: any[];
	expected: any;
	/** Optional index of mutated in-place argument to validate (defaults to 0). */
	inPlaceArgIndex?: number;
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
	/** Comparator mode for in-place vs return-only problems. */
	judgeMode?:
		| "return_only"
		| "in_place_ordered"
		| "in_place_unordered"
		| "in_place_full_ordered"
		| "unordered_nested"
		| "bst_from_sorted";
	/** Optional C++ argument types parsed from starter signature (e.g., ["vector<int>&", "int"]). */
	cppArgTypes?: string[];
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



