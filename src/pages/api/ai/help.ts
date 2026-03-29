// Written by Carlos with help from Claude
/**
 * Name of code artifact: help.ts
 * Brief description: API route providing tiered AI assistance (hint/guide/explain) using Gemini, with conversation history.
 * Programmer's name: Carlos Mbendera
 * Date the code was created: 2026-03-29
 * Dates the code was revised: N/A
 * Brief description of each revision & author: N/A
 * Preconditions: GEMINI_API_KEY must be set. Request must be POST with valid body.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: POST with { code, language, problemTitle, problemStatement, testCases, tier, conversationHistory }.
 *   - Unacceptable: GET, missing fields, or invalid tier value.
 * Postconditions: Returns an AIHelpResponse JSON with the AI's message.
 * Return values or types, and their meanings: JSON response with message or error.
 * Error and exception condition values or types that can occur, and their meanings:
 *   - 405: wrong HTTP method. 400: missing/invalid fields. 500: Gemini error.
 * Side effects: Calls the Gemini API.
 * Invariants: API key is never sent to the client.
 * Any known faults: None.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { callGeminiMultiTurn, stripHtml } from "@/utils/geminiClient";
import type { AIHelpTier, AIHelpMessage, AIHelpResponse } from "@/utils/types/ai";

const VALID_TIERS: AIHelpTier[] = ["hint", "guide", "explain"];

const TIER_INSTRUCTIONS: Record<AIHelpTier, string> = {
	hint: `You are a coding tutor giving a HINT. Give a brief nudge toward the right data structure or algorithmic pattern. Do NOT reveal the solution. Do NOT show any code. Keep it to 1-2 sentences maximum. Be encouraging.`,
	guide: `You are a coding tutor giving GUIDANCE. Identify the specific issue in the user's approach and suggest a direction to fix it. You may reference specific lines or sections of their code. Do NOT provide corrected code or a full solution. Keep it to 2-4 sentences.`,
	explain: `You are a coding tutor giving a full EXPLANATION. Provide a complete walkthrough of the correct approach. Include corrected code in the same programming language the user is using. Explain each step clearly so the user can learn from it.`,
};

const MAX_STATEMENT_CHARS = 2000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	const { code, language, problemTitle, problemStatement, testCases, tier, conversationHistory, followUpQuestion } =
		req.body || {};

	if (!code || !language || !problemTitle || !tier) {
		return res.status(400).json({ error: "Missing required fields: code, language, problemTitle, tier" });
	}

	if (!VALID_TIERS.includes(tier as AIHelpTier)) {
		return res.status(400).json({ error: `Invalid tier. Must be one of: ${VALID_TIERS.join(", ")}` });
	}

	const validTier = tier as AIHelpTier;

	try {
		const strippedStatement = stripHtml(problemStatement || "").slice(0, MAX_STATEMENT_CHARS);

		// Build test cases summary
		const testCaseSummary = Array.isArray(testCases)
			? testCases
					.slice(0, 5)
					.map((tc: any, i: number) => `  Test ${i + 1}: Input: ${tc.input} → Expected: ${tc.expectedOutput}`)
					.join("\n")
			: "No test cases available.";

		// Build system instruction with tier-specific behavior
		const systemInstruction = `${TIER_INSTRUCTIONS[validTier]}

Context about the problem the user is working on:
- Problem: ${problemTitle}
- Language: ${language}
- Description: ${strippedStatement}
- Visible test cases:
${testCaseSummary}`;

		// Build conversation messages for multi-turn
		const messages: { role: "user" | "model"; text: string }[] = [];

		// Add prior conversation history
		if (Array.isArray(conversationHistory)) {
			for (const msg of conversationHistory as AIHelpMessage[]) {
				if (msg.role === "user") {
					messages.push({ role: "user", text: msg.content });
				} else if (msg.role === "assistant") {
					messages.push({ role: "model", text: msg.content });
				}
			}
		}

		// Add the current request
		if (followUpQuestion) {
			messages.push({ role: "user", text: followUpQuestion });
		} else {
			messages.push({
				role: "user",
				text: `Here is my current code:\n\n\`\`\`${language}\n${code}\n\`\`\`\n\nPlease provide ${validTier}-level assistance.`,
			});
		}

		const responseText = await callGeminiMultiTurn(messages, systemInstruction);

		const response: AIHelpResponse = {
			message: responseText,
			tier: validTier,
		};

		return res.status(200).json(response);
	} catch (error: any) {
		return res.status(500).json({ error: error.message || "AI help request failed" });
	}
}
