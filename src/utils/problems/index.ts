/**
 * Artifact:             problems/index.ts
 * Description:          Central registry mapping problem slug strings to full Problem
 *                       definitions for use in SSG and client-side code execution.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Each imported problem file must export a valid Problem object
 *                       conforming to the Problem type in utils/types/problem.ts.
 * Acceptable Input:     N/A — static module-level map with no dynamic input.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       The `problems` map is populated and ready for import by pages
 *                       and the Topbar navigator.
 * Return Values:        Exports { problems: ProblemMap } — object keyed by slug string.
 *
 * Error/Exception Conditions:
 *                       Missing or malformed problem exports cause TypeScript compile errors.
 * Side Effects:         None.
 * Invariants:           Each key must match the Firestore document id and the /problems/[pid]
 *                       URL segment; mismatches cause 404s on problem pages.
 * Known Faults:         Only 5 of the 100+ problems in clean_problems.json are fully
 *                       implemented here; the remaining problems link out to LeetCode.
 */

import { Problem } from "../types/problem";
import { jumpGame } from "./jump-game";
import { reverseLinkedList } from "./reverse-linked-list";
import { search2DMatrix } from "./search-a-2d-matrix";
import { twoSum } from "./two-sum";
import { validParentheses } from "./valid-parentheses";

interface ProblemMap {
	[key: string]: Problem;
}

export const problems: ProblemMap = {
	"two-sum": twoSum,
	"reverse-linked-list": reverseLinkedList,
	"jump-game": jumpGame,
	"search-a-2d-matrix": search2DMatrix,
	"valid-parentheses": validParentheses,
};
