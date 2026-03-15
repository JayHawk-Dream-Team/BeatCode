/**
 * Prologue Comment
 * Name of Code Artifact: codePreprocessor.ts
 * Brief Description: Provides language-aware code preprocessing and function-presence checks before judge execution.
 * Programmer: Jonathan Johnston
 * Date Created: 2026-03-01
 * Dates Revised:
 *   - 2026-03-01: Added Python class/method extraction and typing import injection utilities (Carlos Mbendera)
 *   - 2026-03-01: Added runner script builder for function-based judging flow (Carlos Mbendera)
 *   - 2026-03-15: Added/updated formal prologue documentation block and revision metadata (Jonathan Johnston)
 * Preconditions:
 *   - Caller provides non-empty code, functionName, and supported language.
 * Acceptable Input Values/Types:
 *   - language: "javascript"|"python"|"cpp"
 *   - code/functionName: non-empty strings.
 * Unacceptable Input Values/Types:
 *   - Empty code/functionName or unsupported language identifier.
 * Postconditions:
 *   - Returns transformed or validated code suitable for judge execution workflow.
 * Return Values/Types:
 *   - Returns processed script strings and boolean validation outcomes.
 * Error and Exception Conditions:
 *   - Throws Error when required arguments are empty in preprocessCodeForJudge.
 * Side Effects:
 *   - None; pure string/regex transformations.
 * Invariants:
 *   - Function name token is preserved for invocation matching.
 * Known Faults:
 *   - Regex-based extraction is best-effort for highly unusual formatting.
 */
/** Standard Python typing imports to prepend to all Python submissions. */
const PYTHON_TYPING_HEADER = `from typing import List, Optional, Tuple, Dict, Set, Any, Union\n\n`;

/**
 * Detects whether Python code is written as a class-based solution
 * (e.g. LeetCode's `class Solution: def method(self, ...):`).
 */
function isPythonClassBased(code: string): boolean {
	return /^\s*class\s+\w+\s*:/m.test(code);
}

/**
 * Extracts a method from a Python class and returns it as a standalone function.
 * Handles both `self` and `cls` method signatures.
 *
 * Input:
 *   class Solution:
 *       def twoSum(self, nums: List[int], target: int) -> List[int]:
 *           ...
 *
 * Output:
 *   def twoSum(nums: List[int], target: int) -> List[int]:
 *       ...
 */
function extractPythonMethodFromClass(code: string, methodName: string): string {
	const lines = code.split("\n");
	let methodStart = -1;
	let methodIndent = 0;

	// Find the method definition line within the class
	for (let i = 0; i < lines.length; i++) {
		const match = lines[i].match(/^(\s*)def\s+(\w+)\s*\(/);
		if (match && match[2] === methodName) {
			methodStart = i;
			methodIndent = match[1].length;
			break;
		}
	}

	if (methodStart === -1) return code; // method not found, return as-is

	// Collect lines belonging to this method (until next def/class at same or lower indent)
	const methodLines: string[] = [];
	for (let i = methodStart; i < lines.length; i++) {
		const line = lines[i];
		if (i > methodStart) {
			const isBlank = line.trim() === "";
			const indentLen = line.match(/^(\s*)/)?.[1].length ?? 0;
			// Stop if we hit another definition at the same class-level indent
			if (!isBlank && indentLen <= methodIndent && /^\s*(def|class)\s/.test(line)) {
				break;
			}
		}
		methodLines.push(line);
	}

	// Re-dedent: remove the class-level indentation from each line
	const dedented = methodLines.map((l) => {
		if (l.trim() === "") return "";
		return l.startsWith(" ".repeat(methodIndent)) ? l.slice(methodIndent) : l;
	});

	// Strip `self` or `cls` from the signature
	const rewritten = dedented.join("\n").replace(
		new RegExp(`def\\s+${methodName}\\s*\\(\\s*(?:self|cls)\\s*(?:,\\s*)?`),
		`def ${methodName}(`
	);

	return rewritten.trim();
}

/**
 * Preprocesses user-submitted Python code for the judge server:
 * 1. Strips class-based wrappers (class Solution) and extracts the method as a function.
 * 2. Prepends standard typing imports if they are not already present.
 */
function preprocessPython(code: string, functionName: string): string {
	let processed = code.trim();

	// Extract standalone function from class wrapper
	if (isPythonClassBased(processed)) {
		processed = extractPythonMethodFromClass(processed, functionName);
	}

	// Inject typing imports if not already present
	if (!processed.includes("from typing import")) {
		processed = PYTHON_TYPING_HEADER + processed;
	}

	return processed;
}

/**
 * Builds a complete, self-contained runner script that defines the user's function and
 * then immediately calls it with the given test case args, printing the result as JSON.
 * The judge server's /run endpoint executes this and we compare stdout to expected.
 *
 * @param code       - raw user-submitted code (will be preprocessed internally)
 * @param functionName - name of the function to invoke
 * @param args       - array of arguments for this test case
 * @param language   - target language
 */
export function buildRunnerScript(
	code: string,
	functionName: string,
	args: any[],
	language: "javascript" | "python" | "cpp"
): string {
	const processedCode = preprocessCodeForJudge(code, functionName, language);
	const jsonArgs = JSON.stringify(args);

	if (language === "python") {
		return (
			processedCode +
			`\n\nimport json as _json\n_result = ${functionName}(*${jsonArgs})\nprint(_json.dumps(_result))\n`
		);
	}

	if (language === "javascript") {
		// Wrap invocation in an async IIFE and await the result so that async
		// user functions (returning Promises) are handled correctly. Print JSON
		// result to stdout and ensure errors write to stderr with non-zero exit.
		return (
			processedCode +
			`\n\n(async () => {\n  try {\n    const _maybe = ${functionName}(...${jsonArgs});\n    const _result = await Promise.resolve(_maybe);\n    process.stdout.write(JSON.stringify(_result) + "\\n");\n  } catch (e) {\n    process.stderr.write(String(e) + "\\n");\n    process.exit(1);\n  }\n})();\n`
		);
	}

	// C++ â€” return as-is; not yet fully supported for driver-based invocation
	return processedCode;
}

/**
 * Preprocesses user code for submission to the judge server.
 * - Python: strips class wrappers, injects typing imports.
 * - JavaScript/C++: returned as-is (server handles invocation).
 */
export function preprocessCodeForJudge(
	code: string,
	functionName: string,
	language: "javascript" | "python" | "cpp"
): string {
	if (!code || !code.trim()) {
		throw new Error("Code cannot be empty");
	}
	if (!functionName || !functionName.trim()) {
		throw new Error("Function name must be provided");
	}

	if (language === "python") {
		return preprocessPython(code, functionName);
	}

	// JavaScript and C++: return as-is; judge server handles invocation
	return code;
}

/**
 * Validates that the user has implemented the required function.
 * Checks both top-level function definitions and methods inside a class (Python).
 */
export function validateFunctionPresence(
	code: string,
	functionName: string,
	language: "javascript" | "python" | "cpp"
): boolean {
	if (language === "python") {
		// Accept both a top-level `def name(` and a method `def name(self,`
		return new RegExp(`def\\s+${functionName}\\s*\\(`, "m").test(code);
	} else if (language === "javascript") {
		return (
			new RegExp(`function\\s+${functionName}\\s*\\(`, "").test(code) ||
			new RegExp(`const\\s+${functionName}\\s*=\\s*\\(.*\\)\\s*=>`, "").test(code) ||
            new RegExp(`let\\s+${functionName}\\s*=\\s*\\(.*\\)\\s*=>`, "").test(code) ||
            new RegExp(`(?:var|let|const)\\s+${functionName}\\s*=\\s*(?:async\\s*)?function\\b`, "").test(code)
		);
	} else if (language === "cpp") {
		return new RegExp(`(?:[\\w:]+(?:\\s*<[^>]+>)?(?:\\s*[&*]+)?\\s+)+${functionName}\\s*\\(`, "").test(code);
	}

	return false;
}

/**
 * Extracts the submitted function code for a specific language.
 * Only needed for local (non-judge-server) use cases.
 */
export function extractFunctionCode(code: string, functionName: string, language: "javascript" | "python" | "cpp"): string {
	if (language === "python") {
		if (isPythonClassBased(code)) {
			return extractPythonMethodFromClass(code, functionName);
		}
		const funcPattern = new RegExp(`^def\\s+${functionName}\\s*\\([^)]*\\):`, "m");
		const match = code.match(funcPattern);
		if (!match) return code;
		const startIndex = match.index!;
		return code.substring(startIndex).trim();
	} else if (language === "javascript") {
		const patterns = [
			new RegExp(`function\\s+${functionName}\\s*\\([^)]*\\)\\s*\\{`, ""),
			new RegExp(`const\\s+${functionName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`, ""),
            new RegExp(`let\\s+${functionName}\\s*=\\s*\\([^)]*\\)\\s*=>\\s*\\{`, ""),
            new RegExp(`(?:var|let|const)\\s+${functionName}\\s*=\\s*(?:async\\s*)?function\\s*\\([^)]*\\)\\s*\\{`, ""),
		];

		for (const pattern of patterns) {
			const match = code.match(pattern);
			if (match) {
				const startIndex = match.index!;
				let braceCount = 0;
				let inString = false;
				let stringChar = "";
				let endIndex = startIndex + match[0].length;

				for (let i = endIndex; i < code.length; i++) {
					const char = code[i];
					const prevChar = i > 0 ? code[i - 1] : "";
					if ((char === '"' || char === "'" || char === "`") && prevChar !== "\\") {
						if (inString && char === stringChar) {
							inString = false;
						} else if (!inString) {
							inString = true;
							stringChar = char;
						}
					}
					if (!inString) {
						if (char === "{") braceCount++;
						if (char === "}") {
							braceCount--;
							if (braceCount === 0) {
								endIndex = i + 1;
								break;
							}
						}
					}
				}
				return code.substring(startIndex, endIndex).trim();
			}
		}
		return code;
	} else if (language === "cpp") {
		const pattern = new RegExp(
			`(?:[\\w:]+(?:\\s*<[^>]+>)?(?:\\s*[&*]+)?\\s+)+${functionName}\\s*\\([^)]*\\)\\s*\\{`, ""
		);
		const match = code.match(pattern);
		if (!match) return code;

		const startIndex = match.index!;
		let braceCount = 0;
		let endIndex = startIndex + match[0].length;

		for (let i = endIndex; i < code.length; i++) {
			const char = code[i];
			if (char === "{") braceCount++;
			if (char === "}") {
				braceCount--;
				if (braceCount === 0) {
					endIndex = i + 1;
					break;
				}
			}
		}
		return code.substring(startIndex, endIndex).trim();
	}

	return code;
}




