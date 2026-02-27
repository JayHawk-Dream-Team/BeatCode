/**
 * Artifact:             problem.ts
 * Description:          TypeScript type definitions for the two-layer problem data model:
 *                       Problem (full local definition) and DBProblem (Firestore metadata).
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *   2026-02-27          Extended DBProblem with new Firestore schema fields: beatcodeId,
 *                       leetcodeId, description, tags, youtubeLinks (Carlos Mbendera)
 *
 * Preconditions:        N/A — file contains only type definitions; no runtime behavior.
 * Acceptable Input:     N/A — compile-time types only.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       N/A — no runtime state is modified.
 * Return Values:        Exports types: Example, Problem, DBProblem.
 *
 * Error/Exception Conditions:
 *                       N/A — type mismatches are caught at compile time by TypeScript.
 * Side Effects:         None.
 * Invariants:           Problem.handlerFunction is typed as `((fn: any) => boolean) | string`
 *                       because it is serialized to a string during SSG (getStaticProps)
 *                       and re-evaluated in the browser via new Function().
 * Known Faults:         The `any` type in handlerFunction's signature bypasses TypeScript
 *                       safety for the user-submitted function argument.
 */

export type Example = {
	id: number;
	inputText: string;
	outputText: string;
	explanation?: string;
	img?: string;
};

// local problem data
export type Problem = {
	id: string;
	title: string;
	problemStatement: string;
	examples: Example[];
	constraints: string;
	order: number;
	starterCode: string;
	handlerFunction: ((fn: any) => boolean) | string;
	starterFunctionName: string;
};

export type DBProblem = {
	id: string;
	title: string;
	category: string;
	difficulty: string;
	likes: number;
	dislikes: number;
	order: number;
	videoId?: string;
	link?: string;
	// Fields from the new Firestore schema. Shout out to Mahdi
	beatcodeId?: string;
	leetcodeId?: number;
	description?: string;
	tags?: string[];
	youtubeLinks?: string[];
};
