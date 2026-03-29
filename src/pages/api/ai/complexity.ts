// Written by Carlos with help from Claude
/**
 * Name of code artifact: complexity.ts
 * Brief description: API route that analyzes submitted code for Big-O time and space complexity using Gemini.
 * Programmer's name: Carlos Mbendera
 * Date the code was created: 2026-03-29
 * Dates the code was revised: N/A
 * Brief description of each revision & author: N/A
 * Preconditions: GEMINI_API_KEY must be set. Request must be POST with valid body.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: POST with { code, language, problemTitle, problemStatement }.
 *   - Unacceptable: GET or missing required fields.
 * Postconditions: Returns a ComplexityAnalysisResponse JSON.
 * Return values or types, and their meanings: JSON response with analysis or error.
 * Error and exception condition values or types that can occur, and their meanings:
 *   - 405: wrong HTTP method. 400: missing fields. 500: Gemini/parse error.
 * Side effects: Calls the Gemini API.
 * Invariants: API key is never sent to the client.
 * Any known faults: Gemini may return malformed JSON requiring regex extraction.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { callGemini, stripHtml } from "@/utils/geminiClient";
import type { ComplexityAnalysisResponse } from "@/utils/types/ai";

const MAX_STATEMENT_CHARS = 2000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { code, language, problemTitle, problemStatement } = req.body || {};

	if (!code || !language || !problemTitle) {
		return res.status(400).json({ error: "Missing required fields: code, language, problemTitle" });
	}

	try {
		const strippedStatement = stripHtml(problemStatement || "").slice(0, MAX_STATEMENT_CHARS);

		const prompt = `You are a computer science professor analyzing code complexity.

Problem: ${problemTitle}
Description: ${strippedStatement}
Language: ${language}

Code:
\`\`\`${language}
${code}
\`\`\`

Analyze this solution and return ONLY a JSON object with this exact schema (no markdown fences, no extra text):
{
  "timeComplexity": "<Big-O notation, e.g. O(n), O(n^2)>",
  "spaceComplexity": "<Big-O notation>",
  "worstCasePath": "<describe the control flow path that produces worst-case cost>",
  "recursionAnalysis": {
    "hasRecursion": <boolean>,
    "baseCase": "<description of detected base case, or null if no recursion>",
    "recurrenceRelation": "<e.g. T(n) = 2T(n/2) + O(n), or null>",
    "issues": ["<list any issues: missing base cases, unbounded recursion, etc.>"],
    "estimatedDepth": "<Big-O of recursion depth, or null>"
  },
  "reasoning": "<1-3 sentence justification for the complexity classification>"
}

Rules:
- Analyze loop nesting depth, recursive calls, and data structure operations.
- For space complexity: count auxiliary allocations, recursion stack depth, and dynamic data structures.
- Identify the exact worst-case path through conditionals and loops.
- If recursion exists, derive the recurrence relation and check for proper base cases.
- Flag any unbounded recursion or missing base cases in the issues array.
- If no recursion, set recursionAnalysis.hasRecursion to false and leave other fields null/empty.`;

		const rawResponse = await callGemini(prompt);

		// Extract JSON from the response (Gemini may wrap it in markdown fences)
		const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			return res.status(500).json({ error: "Failed to parse complexity analysis from AI response" });
		}

		const analysis = JSON.parse(jsonMatch[0]);

		// Validate required fields
		if (!analysis.timeComplexity || !analysis.spaceComplexity) {
			return res.status(500).json({ error: "Incomplete analysis returned by AI" });
		}

		const response: ComplexityAnalysisResponse = { analysis };
		return res.status(200).json(response);
	} catch (error: any) {
		return res.status(500).json({ error: error.message || "Complexity analysis failed" });
	}
}
