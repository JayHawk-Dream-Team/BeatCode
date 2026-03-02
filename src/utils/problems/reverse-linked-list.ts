/**
 * Artifact:             reverse-linked-list.ts
 * Description:          Full problem definition for "Reverse Linked List" (LeetCode #206) —
 *                       HTML statement, diagram image, constraints, starter code, and handler.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *   2026-03-01          Added judge server metadata for function-based invocation (Carlos Mbendera)
 *
 * Preconditions:        N/A — exports static data and a pure validation function.
 * Acceptable Input:     Handler accepts fn(head: ListNode | null) returning the head of
 *                       the reversed linked list.
 * Unacceptable Input:   fn returning a non-node value, or mutating the test node chain
 *                       in a way that corrupts subsequent test cases.
 *
 * Postconditions:       Handler returns true if all test cases pass.
 * Return Values:        Handler — boolean true on success; throws Error on failure.
 *                       reverseLinkedList — exports a Problem object with all required fields.
 *
 * Error/Exception Conditions:
 *                       assert.deepStrictEqual throws AssertionError if any test case fails.
 * Side Effects:         Logs handler function error to the browser console on failure.
 * Invariants:           Test node chains and diagram image path are fixed at module load.
 * Known Faults:         None known.
 */

import assert from "assert";
import { Problem } from "../types/problem";
import { JudgeFunctionMetadata } from "../types/judge";
import example from "./images/reverseLL.jpg";

// JS doesn't have a built in LinkedList class, so we'll create one
class LinkedList {
	value: number;
	next: LinkedList | null;

	constructor(value: number) {
		this.value = value;
		this.next = null;
	}

	reverse(): LinkedList {
		let current: LinkedList | null = this;
		let prev: LinkedList | null = null;
		while (current !== null) {
			const next = current.next as LinkedList;
			current.next = prev;
			prev = current;
			current = next;
		}
		return prev!;
	}
}

export const reverseLinkedListHandler = (fn: any) => {
	try {
		const tests = [[1, 2, 3, 4, 5], [5, 4, 3, 2, 1], [1, 2, 3], [1]];
		const answers = [[5, 4, 3, 2, 1], [1, 2, 3, 4, 5], [3, 2, 1], [1]];
		for (let i = 0; i < tests.length; i++) {
			const list = createLinkedList(tests[i]);
			const result = fn(list);
			assert.deepEqual(getListValues(result), answers[i]);
		}
		return true;
	} catch (error: any) {
		console.log("Error from reverseLinkedListHandler: ", error);
		throw new Error(error);
	}
};

// it creates a linked list from an array
function createLinkedList(values: number[]): LinkedList {
	const head = new LinkedList(values[0]);
	let current = head;
	for (let i = 1; i < values.length; i++) {
		const node = new LinkedList(values[i]);
		current.next = node;
		current = node;
	}
	return head;
}

// it returns an array of values from a linked list
function getListValues(head: LinkedList): number[] {
	const values = [];
	let current: LinkedList | null = head;
	while (current !== null) {
		values.push(current.value);
		current = current.next;
	}
	return values;
}

const starterCodeReverseLinkedListJS = `
/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
// Do not edit function name
function reverseLinkedList(head) {
  // Write your code here
};`;

// Judge server metadata for function-based invocation
// Note: For linked list problems, test cases use array representation
// The judge server should serialize/deserialize ListNode structures
const judgeMetadataReverseLinkedList: JudgeFunctionMetadata = {
	name: "reverseLinkedList",
	testCases: [
		{ args: [[1, 2, 3, 4, 5]], expected: [5, 4, 3, 2, 1] },
		{ args: [[5, 4, 3, 2, 1]], expected: [1, 2, 3, 4, 5] },
		{ args: [[1, 2, 3]], expected: [3, 2, 1] },
		{ args: [[1]], expected: [1] },
	],
	signature: "function reverseLinkedList(head: ListNode | null): ListNode | null",
	comparator: "serialize_linked_list",
};

export const reverseLinkedList: Problem = {
	id: "reverse-linked-list",
	title: "2. Reverse Linked List",
	problemStatement: `<p class='mt-3'>Given the <code>head</code> of a singly linked list, reverse the list, and return <em>the reversed list</em>.</p>
	`,
	examples: [
		{
			id: 0,
			inputText: "head = [1,2,3,4,5]",
			outputText: "[5,4,3,2,1]",
			img: example.src,
		},
		{
			id: 1,
			inputText: "head = [1,2,3]",
			outputText: "[3,2,1]",
		},
		{
			id: 2,
			inputText: "head = [1]",
			outputText: "[1]",
		},
	],
	constraints: `<li class='mt-2'>The number of nodes in the list is the range <code>[0, 5000]</code>.</li>
<li class='mt-2'><code>-5000 <= Node.val <= 5000</code></li>`,
	starterCode: starterCodeReverseLinkedListJS,
	pythonStarterCode: `from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverseLinkedList(head: Optional[ListNode]) -> Optional[ListNode]:
    # Write your code here
    pass`,
	cppStarterCode: `#include <bits/stdc++.h>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

ListNode* reverseLinkedList(ListNode* head) {
    // Write your code here
    return nullptr;
}`,
	handlerFunction: reverseLinkedListHandler,
	starterFunctionName: "function reverseLinkedList(",
	order: 2,
	judgeMetadata: judgeMetadataReverseLinkedList,
};

