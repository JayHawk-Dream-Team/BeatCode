/**
 * Artifact:             valid-parentheses.ts
 * Description:          Full problem definition for "Valid Parentheses" (LeetCode #20) —
 *                       HTML statement, examples, constraints, starter code, and a client-side
 *                       test handler using Node's assert library.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *   2026-03-01          Added judge server metadata for function-based invocation (Carlos Mbendera)
 *
 * Preconditions:        N/A — exports static data and a pure validation function.
 * Acceptable Input:     Handler accepts fn(s: string) returning a boolean indicating
 *                       whether the string contains only valid matching bracket pairs.
 * Unacceptable Input:   fn that does not return a boolean or throws unexpectedly.
 *
 * Postconditions:       Handler returns true if all test cases pass.
 * Return Values:        Handler — boolean true on success; throws Error on failure.
 *                       validParentheses — exports a Problem object with all required fields.
 *
 * Error/Exception Conditions:
 *                       assert.deepStrictEqual throws AssertionError if any test case fails.
 * Side Effects:         Logs handler function error to the browser console on failure.
 * Invariants:           Test input strings and expected answers are fixed at module load time.
 * Known Faults:         None known.
 */

import assert from "assert";
import { Problem } from "../types/problem";
import { JudgeFunctionMetadata } from "../types/judge";

export const validParenthesesHandler = (fn: any) => {
	try {
		const tests = ["()", "()[]{}", "(]", "([)]", "{[]}"];
		const answers = [true, true, false, false, true];
		for (let i = 0; i < tests.length; i++) {
			const result = fn(tests[i]);
			assert.deepEqual(result, answers[i]);
		}
		return true;
	} catch (error: any) {
		console.error("Error from validParenthesesHandler: ", error);
		throw new Error(error);
	}
};

const starterCodeValidParenthesesJS = `function validParentheses(s) {
  // Write your code here
};`;

// Judge server metadata for function-based invocation
const judgeMetadataValidParentheses: JudgeFunctionMetadata = {
	name: "validParentheses",
	testCases: [
		{ args: ["()"], expected: true },
		{ args: ["()[]{}"], expected: true },
		{ args: ["(]"], expected: false },
		{ args: ["([)]"], expected: false },
		{ args: ["{[]}"], expected: true },
	],
	signature: "function validParentheses(s: string): boolean",
};

export const validParentheses: Problem = {
	id: "valid-parentheses",
	title: "4. Valid Parentheses",
	problemStatement: `<p class='mt-3'>Given a string <code>s</code> containing just the characters <code>'('</code>, <code>')'</code>, <code>'{'</code>, <code>'}'</code>, <code>'['</code> and <code>']'</code>, determine if the input string is valid.</p> <p class='mt-3'>An input string is valid if:</p> <ul> <li class='mt-2'>Open brackets must be closed by the same type of brackets.</li> <li class='mt-3'>Open brackets must be closed in the correct order.</li>
	<li class="mt-3">Every close bracket has a corresponding open bracket of the same type. </li>
	</ul>`,
	examples: [
		{
			id: 0,
			inputText: 's = "()"',
			outputText: "true",
		},
		{
			id: 1,
			inputText: 's = "()[]{}"',
			outputText: "true",
		},
		{
			id: 2,
			inputText: 's = "(]"',
			outputText: "false",
		},
		{
			id: 3,
			inputText: 's = "([)]"',
			outputText: "false",
		},
	],
	constraints: `<li class='mt-2'><code>1 <= s.length <= 10<sup>4</sup></code></li>
<li class='mt-2 '><code>s</code> consists of parentheses only <code class="text-md">'()[]{}'</code>.</li>`,
	handlerFunction: validParenthesesHandler,
	starterCode: starterCodeValidParenthesesJS,
	pythonStarterCode: `def validParentheses(s: str) -> bool:
    # Write your code here
    pass`,
	cppStarterCode: `#include <bits/stdc++.h>
using namespace std;

bool validParentheses(string s) {
    // Write your code here
    return false;
}`,
	starterFunctionName: "function validParentheses(",
	order: 4,
	judgeMetadata: judgeMetadataValidParentheses,
};

