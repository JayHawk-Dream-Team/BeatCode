// Written by Carlos with help from Claude
/**
 * Name of code artifact: ai.ts
 * Brief description: Type definitions for AI-powered Big-O complexity analysis and tiered AI help features.
 * Programmer's name: Carlos Mbendera
 * Date the code was created: 2026-03-29
 * Dates the code was revised: N/A
 * Brief description of each revision & author: N/A
 * Preconditions: None — pure type definitions.
 * Acceptable and unacceptable input values or types, and their meanings: N/A
 * Postconditions: Types are available for import.
 * Return values or types, and their meanings: N/A
 * Error and exception condition values or types that can occur, and their meanings: N/A
 * Side effects: None.
 * Invariants: None.
 * Any known faults: None.
 */

// ─── Big-O Complexity Analysis ───────────────────────────────────────────────

export type ComplexityClass =
	| "O(1)"
	| "O(log n)"
	| "O(n)"
	| "O(n log n)"
	| "O(n^2)"
	| "O(n^3)"
	| "O(2^n)"
	| "O(n!)"
	| "unknown";

export type ComplexityAnalysis = {
	timeComplexity: ComplexityClass;
	spaceComplexity: ComplexityClass;
	worstCasePath: string;
	recursionAnalysis?: {
		hasRecursion: boolean;
		baseCase: string | null;
		recurrenceRelation?: string;
		issues: string[];
		estimatedDepth?: string;
	};
	reasoning: string;
};

export type ComplexityAnalysisRequest = {
	code: string;
	language: "javascript" | "python" | "cpp";
	problemTitle: string;
	problemStatement: string;
};

export type ComplexityAnalysisResponse = {
	analysis: ComplexityAnalysis;
	error?: string;
};

// ─── AI Help / Feedback ─────────────────────────────────────────────────────

export type AIHelpTier = "hint" | "guide" | "explain";

export type AIHelpMessage = {
	role: "user" | "assistant";
	content: string;
	tier?: AIHelpTier;
	timestamp: number;
};

export type AIHelpRequest = {
	code: string;
	language: "javascript" | "python" | "cpp";
	problemTitle: string;
	problemStatement: string;
	testCases: { input: string; expectedOutput: string }[];
	tier: AIHelpTier;
	conversationHistory: AIHelpMessage[];
	followUpQuestion?: string;
};

export type AIHelpResponse = {
	message: string;
	tier: AIHelpTier;
	error?: string;
};
