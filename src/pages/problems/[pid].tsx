/**
 * Name of Code Artifact: [pid].tsx (problem detail page)
 * Brief Description: Resolves a problem by route id, hydrates local or Firestore-backed problem data, and renders the coding workspace.
 * Programmer: Jonathan Johnston
 * Date Created: 2023-03-18
 * Dates Revised:
 *   - 2026-02-24: Added initial prologue comments and docs refresh (Carlos Mbendera)
 *   - 2026-02-27: Added blocking fallback and Firestore question fallback logic (Carlos Mbendera)
 *   - 2026-03-15: Repaired metadata/test-case normalization and added formalized prologue revision metadata (Jonathan Johnston)
 * Preconditions:
 *   - Dynamic route param pid is available.
 *   - Local problem map and/or Firestore questions collection is accessible.
 * Acceptable Input Values/Types:
 *   - pid: valid local problem key or valid Firestore document id.
 * Unacceptable Input Values/Types:
 *   - Missing/invalid pid not found in local map or Firestore source.
 * Postconditions:
 *   - Returns serialized Problem props for rendering, or notFound for invalid IDs.
 * Return Values/Types:
 *   - getStaticPaths returns { paths, fallback }.
 *   - getStaticProps returns { props: { problem } } or { notFound: true }.
 * Error and Exception Conditions:
 *   - Firestore read/parsing errors may lead to notFound response.
 * Side Effects:
 *   - Reads Firestore documents/subcollections when local map misses.
 * Invariants:
 *   - Render path always expects a Problem-shaped object before workspace render.
 * Known Faults:
 *   - Parser behavior for heterogeneous scraped starter-code/test-case formats is best-effort.
 */
import Topbar from "@/components/Topbar/Topbar";
import Workspace from "@/components/Workspace/Workspace";
import useHasMounted from "@/hooks/useHasMounted";
import { problems } from "@/utils/problems";
import { Problem } from "@/utils/types/problem";
import { JudgeFunctionMetadata, JudgeTestCase } from "@/utils/types/judge";
import { collection, doc, getDoc, getDocs, QueryDocumentSnapshot } from "firebase/firestore";
import { firestore } from "@/firebase/firebase";
import React from "react";
import { useRouter } from "next/router";

type ProblemPageProps = {
	problem: Problem;
};

type RawProblemRecord = Record<string, unknown>;
type RawStarter = {
	code?: string;
	lang?: string;
	langSlug?: string;
};

type NormalizedStarters = {
	js?: string;
	python?: string;
	cpp?: string;
	functionName: string;
};

const QUESTION_DESCRIPTION_IMAGE_RE = /\[((https?:\/\/)[^\]]+)\]/g;
const IMAGE_EXTS = /\.(png|jpg|jpeg|gif|svg|webp)(\?.*)?$/i;

function parseDescriptionDescription(text: string): string {
	return text
		.split("\n\n")
		.map((para) => {
			const inner = para
				.replace(/\n/g, "<br />")
				.replace(QUESTION_DESCRIPTION_IMAGE_RE, (_match, url) =>
					IMAGE_EXTS.test(url)
						? `<img src="${url}" alt="" class="mt-3 max-w-full rounded" />`
						: `<a href="${url}" target="_blank" rel="noreferrer" class="text-blue-400 hover:underline">${url}</a>`
				);
			return `<p class="mt-3">${inner}</p>`;
		})
		.join("");
}

function normalizeLangSlug(rawLang: string | undefined): string {
	const lang = (rawLang || "").toLowerCase();
	if (["javascript", "js", "node", "nodejs"].includes(lang)) return "javascript";
	if (["python", "python3", "py"].includes(lang)) return "python";
	if (["cpp", "c++", "cxx"].includes(lang)) return "cpp";
	return lang;
}

function asString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function isLikelyStarterCodeField(value: unknown): value is RawStarter[] | Record<string, string> {
	return Array.isArray(value) || typeof value === "object";
}

function parseStarterCodeFromCode(language: "javascript" | "python" | "cpp", code: string): string {
	const fallbackNames = {
		javascript: "function",
		python: "def",
		cpp: "class",
	};

	const escaped = (fallbackNames[language] || "solution").toLowerCase();
	if (!code) return "solution";

	const patterns: { [key: string]: RegExp[] } = {
		javascript: [
			/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/m,
			/(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_][A-Za-z0-9_]*)\s*=>/m,
			/(?:class\s+\w+[\s\S]*?\n\s*)([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\(/m,
		],
		python: [
			/^\s*class\s+\w+[\s\S]*?^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/m,
			/\bdef\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/m,
		],
		cpp: [
			/\b(?:class\s+Solution[\s\S]*?\n\s*[A-Za-z_][\w\s:<>&*]*\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^\)]*\)\s*(?:const\s*)?\{[\s\S]*?\n\s*\})/m,
			/\b(?:auto|void|bool|int|long long|double|string|vector<[^>]+>|std::vector<[^>]+>|\w+)\s+([A-Za-z_][A-Za-z0-9_]*)\s*\([^\)]*\)\s*(?:const\s*)?\{/m,
		],
	};

	for (const pattern of patterns[language] || []) {
		const match = code.match(pattern);
		if (match && match[1]) {
			return match[1];
		}
	}

	return "solution";
}


function escapeRegex(source: string): string {
	return source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitTopLevelParams(input: string): string[] {
	const out: string[] = [];
	let token = "";
	let quote: string | null = null;
	let escaped = false;
	let angleDepth = 0;
	let bracketDepth = 0;
	let braceDepth = 0;
	let parenDepth = 0;

	for (let i = 0; i < input.length; i += 1) {
		const ch = input[i];

		if (escaped) {
			token += ch;
			escaped = false;
			continue;
		}

		if (ch === "\\") {
			escaped = true;
			token += ch;
			continue;
		}

		if ((ch === '"' || ch === "'") && quote === null) {
			quote = ch;
			token += ch;
			continue;
		}

		if (ch === quote) {
			quote = null;
			token += ch;
			continue;
		}

		if (quote === null) {
			if (ch === "<") angleDepth += 1;
			if (ch === ">") angleDepth = Math.max(0, angleDepth - 1);
			if (ch === "[") bracketDepth += 1;
			if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
			if (ch === "{") braceDepth += 1;
			if (ch === "}") braceDepth = Math.max(0, braceDepth - 1);
			if (ch === "(") parenDepth += 1;
			if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
		}

		if (
			ch === "," &&
			quote === null &&
			angleDepth === 0 &&
			bracketDepth === 0 &&
			braceDepth === 0 &&
			parenDepth === 0
		) {
			if (token.trim()) out.push(token.trim());
			token = "";
			continue;
		}

		token += ch;
	}

	if (token.trim()) out.push(token.trim());
	return out;
}

function normalizeCppParamType(rawParam: string): string | undefined {
	const withoutDefault = rawParam.replace(/\s*=\s*.*$/, "").trim();
	if (!withoutDefault || withoutDefault === "void") return undefined;

	const normalized = withoutDefault.replace(/\s+/g, " ").trim();
	const match = normalized.match(/^(.*?)([A-Za-z_][A-Za-z0-9_]*)$/);
	if (!match) {
		return normalized.replace(/\s*([*&])\s*/g, "$1").trim();
	}

	const typeCandidate = match[1].trim();
	if (!typeCandidate) {
		return normalized.replace(/\s*([*&])\s*/g, "$1").trim();
	}

	return typeCandidate.replace(/\s*([*&])\s*/g, "$1").trim();
}

function extractCppArgTypesFromStarter(cppStarter: string | undefined, functionName: string): string[] | undefined {
	if (!cppStarter || !functionName) return undefined;

	const escapedName = escapeRegex(functionName);
	const match = cppStarter.match(new RegExp(`${escapedName}\\s*\\(([^)]*)\\)`, "m"));
	if (!match) return undefined;

	const paramsBlock = (match[1] || "").trim();
	if (!paramsBlock || paramsBlock === "void") return [];

	const argTypes = splitTopLevelParams(paramsBlock)
		.map((param) => normalizeCppParamType(param))
		.filter((value): value is string => Boolean(value));

	return argTypes;
}
function getStarterCodeField(data: RawProblemRecord): NormalizedStarters {
	const starterRecords = (isLikelyStarterCodeField(data.starterCode) ? data.starterCode : undefined) as
		| RawStarter[]
		| Record<string, string>
		| undefined;

	const starters: NormalizedStarters = { functionName: "solution" };
	const names: string[] = [];
	let hasPython3Starter = false;

	if (Array.isArray(starterRecords)) {
		for (const entry of starterRecords) {
			const rawLang = asString(entry?.langSlug) || asString(entry?.lang);
			const lang = normalizeLangSlug(rawLang);
			const code = asString(entry?.code);
			if (!lang || !code) continue;
			if (lang === "javascript") {
				starters.js = code;
				const name = parseStarterCodeFromCode("javascript", code);
				names.push(name);
			}
			if (lang === "python") {
				const isPython3 = (rawLang || "").toLowerCase().includes("python3");
				if (isPython3) {
					starters.python = code;
					hasPython3Starter = true;
					const name = parseStarterCodeFromCode("python", code);
					names.push(name);
				} else if (!hasPython3Starter) {
					if (!starters.python) {
						starters.python = code;
					}
					const name = parseStarterCodeFromCode("python", code);
					names.push(name);
				}
			}
			if (lang === "cpp") {
				starters.cpp = code;
				const name = parseStarterCodeFromCode("cpp", code);
				names.push(name);
			}
		}
	} else if (typeof starterRecords === "object" && starterRecords !== null) {
		const js = asString(starterRecords["javascript"] || starterRecords["js"]);
		const js1 = asString(starterRecords["javascript_code"]);
		const python = asString(
			starterRecords["python3"] ||
			starterRecords["py3"] ||
			starterRecords["python"] ||
			starterRecords["Python3"] ||
			starterRecords["Python"] ||
			starterRecords["Py3"]
		);
		const cpp = asString(starterRecords["cpp"]);
		const langNames = [js, js1, asString(starterRecords["JavaScript"]) ]
			.filter(Boolean)
			.map((s) => s as string);
		if (langNames.length > 0) {
			starters.js = langNames[0];
			const name = parseStarterCodeFromCode("javascript", starters.js);
			names.push(name);
		}
		if (python) {
			starters.python = python;
			names.push(parseStarterCodeFromCode("python", python));
		}
		if (cpp) {
			starters.cpp = cpp;
			names.push(parseStarterCodeFromCode("cpp", cpp));
		}
	}

	const dedupedNames = Array.from(new Set(names.filter(Boolean)));
	if (dedupedNames.length === 1) {
		starters.functionName = dedupedNames[0];
	} else if (dedupedNames.length > 1) {
		for (const preferred of ["twoSum", "strStr", "solution"]) {
			if (dedupedNames.includes(preferred)) {
				starters.functionName = preferred;
				break;
			}
		}
		if (starters.functionName === "solution") {
			starters.functionName = dedupedNames[0];
		}
	}

	return starters;
}

function splitInputTokens(input: string): string[] {
	const tokens: string[] = [];
	let token = "";
	let quote: string | null = null;
	let escaped = false;
	let bracketDepth = 0;
	let braceDepth = 0;
	let parenDepth = 0;

	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		if (escaped) {
			token += ch;
			escaped = false;
			continue;
		}

		if (ch === "\\") {
			escaped = true;
			token += ch;
			continue;
		}

		if ((ch === '"' || ch === "'") && quote === null) {
			quote = ch;
			token += ch;
			continue;
		}

		if (ch === quote) {
			quote = null;
			token += ch;
			continue;
		}

		if (quote === null) {
			if (ch === "[") bracketDepth += 1;
			if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
			if (ch === "{") braceDepth += 1;
			if (ch === "}") braceDepth = Math.max(0, braceDepth - 1);
			if (ch === "(") parenDepth += 1;
			if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
		}

		if ((ch === " " || ch === "\t" || ch === "\n") && quote === null && bracketDepth === 0 && braceDepth === 0 && parenDepth === 0) {
			if (token.length > 0) {
				tokens.push(token);
				token = "";
			}
			continue;
		}

		token += ch;
	}

	if (token.length > 0) {
		tokens.push(token);
	}

	return tokens;
}
function splitTopLevelCommaSegments(input: string): string[] {
	const segments: string[] = [];
	let token = "";
	let quote: string | null = null;
	let escaped = false;
	let bracketDepth = 0;
	let braceDepth = 0;
	let parenDepth = 0;

	for (let i = 0; i < input.length; i++) {
		const ch = input[i];
		if (escaped) {
			token += ch;
			escaped = false;
			continue;
		}

		if (ch === "\\") {
			escaped = true;
			token += ch;
			continue;
		}

		if ((ch === '"' || ch === "'") && quote === null) {
			quote = ch;
			token += ch;
			continue;
		}

		if (ch === quote) {
			quote = null;
			token += ch;
			continue;
		}

		if (quote === null) {
			if (ch === "[") bracketDepth += 1;
			if (ch === "]") bracketDepth = Math.max(0, bracketDepth - 1);
			if (ch === "{") braceDepth += 1;
			if (ch === "}") braceDepth = Math.max(0, braceDepth - 1);
			if (ch === "(") parenDepth += 1;
			if (ch === ")") parenDepth = Math.max(0, parenDepth - 1);
		}

		if (ch === "," && quote === null && bracketDepth === 0 && braceDepth === 0 && parenDepth === 0) {
			if (token.trim().length > 0) {
				segments.push(token.trim());
			}
			token = "";
			continue;
		}

		token += ch;
	}

	if (token.trim().length > 0) {
		segments.push(token.trim());
	}

	return segments;
}

function parseValueForHarness(raw: unknown): any {
	if (raw === undefined) return undefined;
	if (raw === null) return null;
	if (Array.isArray(raw) || typeof raw === "number" || typeof raw === "boolean" || raw === null) return raw;
	if (typeof raw === "object") return raw;

	const token = String(raw).trim();
	if (token === "") return "";

	try {
		if ((token.startsWith("[") && token.endsWith("]")) || (token.startsWith("{") && token.endsWith("}"))) {
			return JSON.parse(token);
		}
	} catch {
		// fall through
	}

	if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
		const normalized = token.startsWith("'")
			? `"${token.slice(1, -1).replace(/\\"/g, '"')}`
			: token;
		try {
			const parsed = JSON.parse(normalized);
			if (typeof parsed === "string" && ((parsed.startsWith("[") && parsed.endsWith("]")) || (parsed.startsWith("{") && parsed.endsWith("}")))) {
				return JSON.parse(parsed);
			}
			return parsed;
		} catch {
			return token.slice(1, -1);
		}
	}

	if (/^-?\d+\.\d+$/.test(token)) return Number(token);
	if (/^-?\d+$/.test(token)) return Number.parseInt(token, 10);
	if (/^(true|false)$/i.test(token)) return token.toLowerCase() === "true";
	if (token.toLowerCase() === "null") return null;
	return token;
}

function normalizeCaseFromRawInput(rawInput: unknown): any[] {
	if (Array.isArray(rawInput)) {
		return rawInput.map((value) => parseValueForHarness(value));
	}

	if (typeof rawInput === "string") {
		const trimmed = rawInput.trim();
		if (trimmed === "") return [];

		if (trimmed.includes(",")) {
			const csv = splitTopLevelCommaSegments(trimmed);
			if (csv.length > 1) {
				const values = csv
					.map((segment) => {
						if (segment.includes("=")) {
							const rhs = segment.slice(segment.indexOf("=") + 1).trim();
							return rhs ? parseValueForHarness(rhs) : undefined;
						}
						return parseValueForHarness(segment);
					})
					.filter((value) => value !== undefined);

				if (values.length > 0) {
					return values;
				}
			}
		}

		const assignmentMatch = trimmed.match(/^[^=]+\s*=\s*(.*)$/);
		if (assignmentMatch && assignmentMatch[1]) {
			const parsed = parseValueForHarness(assignmentMatch[1].trim());
			if (parsed !== undefined) return [parsed];
		}

		const tokens = splitInputTokens(trimmed);
		if (tokens.length > 0) {
			if (tokens.length === 1) {
				const assignmentMatch = tokens[0].match(/^[^=]+\s*=\s*(.*)$/);
				if (assignmentMatch && assignmentMatch[1]) {
					const parsed = parseValueForHarness(assignmentMatch[1].trim());
					if (parsed !== undefined) return [parsed];
				}
			}
			return tokens.map(parseValueForHarness);
		}
	}

	return [];
}
function normalizeRawCase(rawCase: Record<string, unknown> | undefined): { args: any[]; expected: any } | null {
	if (!rawCase || typeof rawCase !== "object") return null;

	const input = rawCase.input ?? rawCase.args ?? rawCase.testInput ?? rawCase.stdin;
	const expected = rawCase.expected ?? rawCase.expectedOutput ?? rawCase.output ?? rawCase.answer;

	const args = normalizeCaseFromRawInput(input);
	const parsedExpected = parseValueForHarness(expected);

	if (!Array.isArray(args) || args.length === 0 || parsedExpected === undefined) {
		return null;
	}

	return { args, expected: parsedExpected };
}

function normalizeJudgeMetadata(
	data: RawProblemRecord,
	rawCases: RawProblemRecord[]
): JudgeFunctionMetadata | undefined {
	const starters = getStarterCodeField(data);
	const testCaseDocs = rawCases
		.map((item) => normalizeRawCase(item as Record<string, unknown>))
		.filter(Boolean) as JudgeTestCase[];

	if (testCaseDocs.length === 0 && Array.isArray(data.testCases)) {
		for (const entry of data.testCases as unknown[]) {
			if (entry && typeof entry === "string") {
				const parsed = normalizeRawCase({ input: entry, expected: undefined } as Record<string, unknown>);
			if (parsed) testCaseDocs.push(parsed);
			} else if (typeof entry === "object") {
				const parsed = normalizeRawCase(entry as Record<string, unknown>);
				if (parsed) testCaseDocs.push(parsed);
			}
		}
	}
	if (testCaseDocs.length === 0) return undefined;

	const normalizedName = starters.functionName || "solution";
	const cppArgTypes = extractCppArgTypesFromStarter(starters.cpp, normalizedName);

	return {
		name: normalizedName,
		testCases: testCaseDocs,
		...(cppArgTypes === undefined ? {} : { cppArgTypes }),
	};
}

const ProblemPage: React.FC<ProblemPageProps> = ({ problem }) => {
	const hasMounted = useHasMounted();
	const router = useRouter();
	const { matchId } = router.query;

	if (!hasMounted) return null;

	return (
		<div>
			<Topbar problemPage />
			<Workspace problem={problem} matchId={typeof matchId === "string" ? matchId : undefined} />
		</div>
	);
};

export default ProblemPage;

export async function getStaticPaths() {
	const paths = Object.keys(problems).map((key) => ({
		params: { pid: key },
	}));

	return {
		paths,
		// 'blocking' lets Next.js generate pages for Firestore question IDs on first request
		fallback: "blocking",
	};
}

export async function getStaticProps({ params }: { params: { pid: string } }) {
	const { pid } = params;

	const localProblem = problems[pid];
	if (localProblem) {
		return {
			props: {
				problem: {
					...localProblem,
					handlerFunction: localProblem.handlerFunction.toString(),
					...(localProblem.judgeMetadata === undefined ? {} : { judgeMetadata: localProblem.judgeMetadata }),
				},
		},
		};
	}

	try {
		let sourceCollection = "questions";
		let docSnap = await getDoc(doc(firestore, sourceCollection, pid));

		if (!docSnap.exists()) {
			sourceCollection = "problems";
			docSnap = await getDoc(doc(firestore, sourceCollection, pid));
		}
		if (!docSnap.exists()) return { notFound: true };

		const data = docSnap.data() as RawProblemRecord;
		const starters = getStarterCodeField(data);
		const problemStatement = parseDescriptionDescription((data.description as string) || "");

		let firestoreTestCases: RawProblemRecord[] = [];
		try {
			const testCaseSnapshot = await getDocs(collection(firestore, sourceCollection, pid, "testcases"));
			firestoreTestCases = testCaseSnapshot.docs
				.map((docSnap: QueryDocumentSnapshot) => ({
					id: docSnap.id,
					...(docSnap.data() as RawProblemRecord),
				}))
				.sort((a, b) => {
					const lhs = Number.parseInt(String(a.id), 10);
					const rhs = Number.parseInt(String(b.id), 10);
					if (Number.isNaN(lhs) || Number.isNaN(rhs)) return 0;
					return lhs - rhs;
				});
		} catch {
			firestoreTestCases = [];
		}

		const normalizedJudgeMetadata = normalizeJudgeMetadata(data, firestoreTestCases);

		const problem: Problem = {
			id: pid,
			title: (data.title as string) || "",
			problemStatement,
			examples: [],
			constraints: "",
			order: (data.order as number) || (data.beatcode_id as number) || (data.id as number) || 0,
			starterCode: starters.js || "/**\n * Write your code below\n */\nfunction solution() {\n\t\n}",
			pythonStarterCode: starters.python,
			cppStarterCode: starters.cpp,
			handlerFunction: "function(fn) { return false; }",
			starterFunctionName: starters.functionName || "solution",
			...(normalizedJudgeMetadata === undefined ? {} : { judgeMetadata: normalizedJudgeMetadata }),
		};

		return { props: { problem } };
	} catch {
		return { notFound: true };
	}
}









