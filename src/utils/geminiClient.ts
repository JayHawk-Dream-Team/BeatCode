// Written by Carlos with help from Claude
/**
 * Name of code artifact: geminiClient.ts
 * Brief description: Server-only utility for calling the Gemini API (single-turn and multi-turn).
 * Programmer's name: Carlos Mbendera
 * Date the code was created: 2026-03-29
 * Dates the code was revised: N/A
 * Brief description of each revision & author: N/A
 * Preconditions: GEMINI_API_KEY must be set in environment variables (server-only).
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: non-empty prompt strings; well-formed message arrays for multi-turn.
 *   - Unacceptable: empty prompts, missing API key.
 * Postconditions: Returns the text content from Gemini's response.
 * Return values or types, and their meanings: Promise<string> — the model's text output.
 * Error and exception condition values or types that can occur, and their meanings:
 *   - Throws if GEMINI_API_KEY is missing or if the Gemini API returns an error.
 * Side effects: Makes HTTP requests to the Gemini API.
 * Invariants: API key is never exposed to client bundles.
 * Any known faults: None.
 */

const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Single-turn call to Gemini.
 */
export async function callGemini(prompt: string, systemInstruction?: string): Promise<string> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable");

	const body: Record<string, any> = {
		contents: [{ role: "user", parts: [{ text: prompt }] }],
		generationConfig: {
			temperature: 0.2,
			maxOutputTokens: 2048,
		},
	};

	if (systemInstruction) {
		body.systemInstruction = { parts: [{ text: systemInstruction }] };
	}

	const resp = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	if (!resp.ok) {
		const errText = await resp.text();
		throw new Error(`Gemini API error ${resp.status}: ${errText}`);
	}

	const data = await resp.json();
	return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * Multi-turn call to Gemini for conversation context (AI Help follow-ups).
 */
export async function callGeminiMultiTurn(
	messages: { role: "user" | "model"; text: string }[],
	systemInstruction?: string
): Promise<string> {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) throw new Error("Missing GEMINI_API_KEY environment variable");

	const contents = messages.map((m) => ({
		role: m.role,
		parts: [{ text: m.text }],
	}));

	const body: Record<string, any> = {
		contents,
		generationConfig: {
			temperature: 0.3,
			maxOutputTokens: 2048,
		},
	};

	if (systemInstruction) {
		body.systemInstruction = { parts: [{ text: systemInstruction }] };
	}

	const resp = await fetch(`${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	if (!resp.ok) {
		const errText = await resp.text();
		throw new Error(`Gemini API error ${resp.status}: ${errText}`);
	}

	const data = await resp.json();
	return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * Strip HTML tags from a string, collapsing whitespace.
 */
export function stripHtml(html: string): string {
	return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
