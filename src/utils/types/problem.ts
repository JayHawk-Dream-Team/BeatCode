/**
 * Shared type definitions for the two-layer problem data model.
 *
 * Problem holds the full local definition used in SSG pages and client-side code
 * execution — including the HTML problem statement, test examples, starter code, and
 * the handlerFunction that validates user submissions in the browser.
 *
 * DBProblem is the lightweight Firestore representation used in the problems list,
 * containing only metadata (difficulty, category, likes, videoId, etc.).
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
};
