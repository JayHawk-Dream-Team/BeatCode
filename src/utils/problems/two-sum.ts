/**
 * Artifact:             two-sum.ts
 * Description:          Full problem definition for "Two Sum" (LeetCode #1) — HTML problem
 *                       statement, examples, constraints, starter code, and a client-side
 *                       test handler using Node's assert library.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        N/A — exports static data and a pure validation function.
 * Acceptable Input:     handlerTwoSum accepts a function fn(nums: number[], target: number)
 *                       that returns an array of two indices [i, j] where nums[i]+nums[j] === target.
 * Unacceptable Input:   fn that does not return an index pair, returns wrong indices,
 *                       or throws an exception inside the function body.
 *
 * Postconditions:       handlerTwoSum returns true if all three test cases pass.
 * Return Values:        handlerTwoSum — boolean true on success; throws Error on failure.
 *                       twoSum — exports a Problem object with all required fields.
 *
 * Error/Exception Conditions:
 *                       assert.deepStrictEqual throws AssertionError if any test case fails;
 *                       re-thrown as a generic Error with the original assertion message.
 * Side Effects:         Logs "twoSum handler function error" to the browser console on failure.
 * Invariants:           Test inputs (nums, targets, answers) are fixed constants at module load.
 * Known Faults:         None known.
 */

import assert from "assert";
import { Problem } from "../types/problem";

const starterCodeTwoSum = `function twoSum(nums,target){
  // Write your code here
};`;

// checks if the user has the correct code
const handlerTwoSum = (fn: any) => {
	// fn is the callback that user's code is passed into
	try {
		const nums = [
			[2, 7, 11, 15],
			[3, 2, 4],
			[3, 3],
		];

		const targets = [9, 6, 6];
		const answers = [
			[0, 1],
			[1, 2],
			[0, 1],
		];

		// loop all tests to check if the user's code is correct
		for (let i = 0; i < nums.length; i++) {
			// result is the output of the user's function and answer is the expected output
			const result = fn(nums[i], targets[i]);
			assert.deepStrictEqual(result, answers[i]);
		}
		return true;
	} catch (error: any) {
		console.log("twoSum handler function error");
		throw new Error(error);
	}
};

export const twoSum: Problem = {
	id: "two-sum",
	title: "1. Two Sum",
	problemStatement: `<p class='mt-3'>
  Given an array of integers <code>nums</code> and an integer <code>target</code>, return
  <em>indices of the two numbers such that they add up to</em> <code>target</code>.
</p>
<p class='mt-3'>
  You may assume that each input would have <strong>exactly one solution</strong>, and you
  may not use thesame element twice.
</p>
<p class='mt-3'>You can return the answer in any order.</p>`,
	examples: [
		{
			id: 1,
			inputText: "nums = [2,7,11,15], target = 9",
			outputText: "[0,1]",
			explanation: "Because nums[0] + nums[1] == 9, we return [0, 1].",
		},
		{
			id: 2,
			inputText: "nums = [3,2,4], target = 6",
			outputText: "[1,2]",
			explanation: "Because nums[1] + nums[2] == 6, we return [1, 2].",
		},
		{
			id: 3,
			inputText: " nums = [3,3], target = 6",
			outputText: "[0,1]",
		},
	],
	constraints: `<li class='mt-2'>
  <code>2 ≤ nums.length ≤ 10</code>
</li> <li class='mt-2'>
<code>-10 ≤ nums[i] ≤ 10</code>
</li> <li class='mt-2'>
<code>-10 ≤ target ≤ 10</code>
</li>
<li class='mt-2 text-sm'>
<strong>Only one valid answer exists.</strong>
</li>`,
	handlerFunction: handlerTwoSum,
	starterCode: starterCodeTwoSum,
	order: 1,
	starterFunctionName: "function twoSum(",
};
