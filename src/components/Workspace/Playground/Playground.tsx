/**
 * prologue comment
 * Name of code artifact: Playground.tsx
 * Brief description: Main coding playground handling editor state, judge run/submit, multiplayer HUD, penalties, and match-end redirects.
 * Programmer's name: Jonathan Johnston
 * Date the code was created: 2023-03-18
 * Dates the code was revised:
 *   - 2026-02-24: Added earlier prologue documentation (Carlos Mbendera)
 *   - 2026-03-19: Added multiplayer polling and winner/loser redirect handling (Jonathan Johnston)
 *   - 2026-03-20: Added timer HUD, multiplayer starter-code reset behavior, and no-local-persistence for match sessions (Jonathan Johnston)
 * Brief description of each revision & author: See revision list above.
 * Preconditions:
 *   - A valid Problem object is provided.
 *   - Judge APIs and Firestore are reachable.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: problem data with optional judgeMetadata and optional matchId.
 *   - Unacceptable: missing required problem fields or malformed judge responses.
 * Postconditions:
 *   - User code is run/submitted and UI state reflects judge and match outcomes.
 * Return values or types, and their meanings:
 *   - Returns React JSX for the full editor/testcase workspace.
 * Error and exception condition values or types that can occur, and their meanings:
 *   - Judge/network failures produce toast errors.
 *   - Firestore update failures surface as runtime errors/toasts.
 * Side effects:
 *   - Writes solved problems to Firestore on accepted submission.
 *   - Polls multiplayer state endpoint and may redirect to home on match completion.
 * Invariants:
 *   - Match HUD timer values are derived from server state when in multiplayer.
 * Any known faults:
 *   - High-frequency polling can produce repeated network traffic on unstable connections.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { collection, getDocs } from "firebase/firestore";
import PreferenceNav from "./PreferenceNav/PreferenceNav";
import Split from "react-split";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import EditorFooter from "./EditorFooter";
import ComplexityPanel from "./ComplexityPanel";
import AIHelpPanel from "./AIHelpPanel";
import { Problem } from "@/utils/types/problem";
import type { ComplexityAnalysis, AIHelpTier, AIHelpMessage } from "@/utils/types/ai";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import useLocalStorage from "@/hooks/useLocalStorage";

// Dynamically import Chat to avoid SSR issues
const Chat = dynamic(() => import("../Chat/Chat"), { ssr: false });

type PlaygroundProps = {
	problem: Problem;
	setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
	setSolved: React.Dispatch<React.SetStateAction<boolean>>;
	matchId?: string;
};

export interface ISettings {
	fontSize: string;
	settingsModalIsOpen: boolean;
	dropdownIsOpen: boolean;
}

export type JudgeLanguage = "javascript" | "python" | "cpp";
export type JudgeStatus = "unknown" | "ok" | "down";

function formatMsAsClock(ms: number): string {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const Playground: React.FC<PlaygroundProps> = ({ problem, setSuccess, setSolved, matchId }) => {
	// Multiplayer chat state (must be inside component)
	const [chatOpen, setChatOpen] = useState(false);
	const [hasUnread, setHasUnread] = useState(false);
	const [selfName, setSelfName] = useState<string>("You");
	const [activeTestCaseId, setActiveTestCaseId] = useState<number>(0);
	const [userCode, setUserCode] = useState<string>(problem.starterCode);
	const [storedLanguage, setStoredLanguage] = useLocalStorage("beatcode-language", "javascript");
	const language = (storedLanguage as JudgeLanguage) || "javascript";
	const [running, setRunning] = useState(false);
	const [runStdout, setRunStdout] = useState<string | undefined>(undefined);
	const [submitting, setSubmitting] = useState(false);
	const [judgeStatus, setJudgeStatus] = useState<JudgeStatus>("unknown");
	const [checkingJudge, setCheckingJudge] = useState(false);
	const [matchFinished, setMatchFinished] = useState(false);
	const [matchOutcomeHandled, setMatchOutcomeHandled] = useState(false);
	const [matchStatusText, setMatchStatusText] = useState<string>("Active");
	const [myElapsedMs, setMyElapsedMs] = useState<number>(0);
	const [opponentElapsedMs, setOpponentElapsedMs] = useState<number>(0);
	const [myPenaltyMs, setMyPenaltyMs] = useState<number>(0);
	const [opponentPenaltyMs, setOpponentPenaltyMs] = useState<number>(0);
	const [opponentName, setOpponentName] = useState<string>("Opponent");

	// ─── Big-O Complexity Analysis state ─────────────────────────────────
	// Written by Carlos with help from Claude
	const [complexityAnalysis, setComplexityAnalysis] = useState<ComplexityAnalysis | null>(null);
	const [complexityLoading, setComplexityLoading] = useState(false);
	const [complexityError, setComplexityError] = useState<string | null>(null);
	const [activeBottomTab, setActiveBottomTab] = useState<"testcases" | "complexity">("testcases");

	// ─── AI Help state ────────────────────────────────────────────────────
	const [aiHelpOpen, setAiHelpOpen] = useState(false);
	const [aiHelpMessages, setAiHelpMessages] = useState<AIHelpMessage[]>([]);
	const [aiHelpLoading, setAiHelpLoading] = useState(false);
	const [aiHelpError, setAiHelpError] = useState<string | null>(null);
	const [hasFailedRun, setHasFailedRun] = useState(false);
	const [hasFailedSubmit, setHasFailedSubmit] = useState(false);

	const [fontSize, setFontSize] = useLocalStorage("beatcode-fontSize", "16px");

	const [settings, setSettings] = useState<ISettings>({
		fontSize: fontSize,
		settingsModalIsOpen: false,
		dropdownIsOpen: false,
	});

	const [user] = useAuthState(auth);
	const router = useRouter();
	const {
		query: { pid },
	} = router;

	// Firestore testcases
	const [firestoreTestcases, setFirestoreTestcases] = useState<any[]>([]);
	const [loadingTestcases, setLoadingTestcases] = useState(true);


	// Stable callback so Chat's Firestore subscription doesn't rebuild on every poll cycle
	const handleNewMessage = useCallback(() => {
		setChatOpen((open) => {
			if (!open) setHasUnread(true);
			return open;
		});
	}, []);

	// Assign self name if not present (top-level effect)
	useEffect(() => {
		if (!matchId) return;
		if (user && !selfName) setSelfName("You");
	}, [matchId, user, selfName]);

	useEffect(() => {
		async function fetchTestcases() {
			setLoadingTestcases(true);
			try {
				const snap = await getDocs(collection(firestore, "questions", problem.id, "testcases"));
				const cases = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
				setFirestoreTestcases(cases);
			} catch {
				setFirestoreTestcases([]);
			} finally {
				setLoadingTestcases(false);
			}
		}
		fetchTestcases();
	}, [problem.id]);

	// Prefer Firestore testcases if available, else fallback to problem.examples
	const testCases = (firestoreTestcases.length > 0
		? firestoreTestcases.map(tc => ({ input: tc.input || "", expectedOutput: tc.expectedOutput || "" }))
		: problem.examples.map((example) => ({ input: example.inputText || "", expectedOutput: example.outputText || "" }))
	);

	const notifyMatchSubmission = useCallback(
		async (result: "accepted" | "failed", details: any) => {
			if (!matchId || !user) return;
			try {
				await fetch(`/api/matches/${matchId}/submit`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						userId: user.uid,
						result,
						details,
					}),
				});
			} catch (err) {
				console.error("Failed to notify match submit", err);
			}
		},
		[matchId, user]
	);

	// ─── Close AI help panel when entering multiplayer ────────────────────
	// Written by Carlos with help from Claude
	useEffect(() => {
		if (matchId) setAiHelpOpen(false);
	}, [matchId]);

	// ─── Big-O Complexity Analysis ────────────────────────────────────────
	// Written by Carlos with help from Claude
	const fetchComplexityAnalysis = useCallback(
		async (code: string, lang: string) => {
			if (complexityLoading) return; // debounce
			setComplexityLoading(true);
			setComplexityError(null);
			try {
				const resp = await fetch("/api/ai/complexity", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						code,
						language: lang,
						problemTitle: problem.title,
						problemStatement: problem.problemStatement,
					}),
				});
				const data = await resp.json();
				if (!resp.ok) throw new Error(data.error || "Analysis failed");
				setComplexityAnalysis(data.analysis);
				setActiveBottomTab("complexity");
			} catch (e: any) {
				setComplexityError(e.message);
			} finally {
				setComplexityLoading(false);
			}
		},
		[complexityLoading, problem.title, problem.problemStatement]
	);

	// ─── AI Help request handler ──────────────────────────────────────────
	// Written by Carlos with help from Claude
	const handleRequestAIHelp = useCallback(
		async (tier: AIHelpTier, followUp?: string) => {
			setAiHelpLoading(true);
			setAiHelpError(null);

			const tierLabels: Record<AIHelpTier, string> = {
				hint: "Give me a hint",
				guide: "Guide me through my issue",
				explain: "Explain the full solution",
			};
			const userMsg: AIHelpMessage = {
				role: "user",
				content: followUp || tierLabels[tier],
				tier,
				timestamp: Date.now(),
			};
			const updatedHistory = [...aiHelpMessages, userMsg];
			setAiHelpMessages(updatedHistory);

			try {
				const resp = await fetch("/api/ai/help", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						code: userCode,
						language,
						problemTitle: problem.title,
						problemStatement: problem.problemStatement,
						testCases,
						tier,
						conversationHistory: updatedHistory,
						followUpQuestion: followUp,
					}),
				});
				const data = await resp.json();
				if (!resp.ok) throw new Error(data.error || "AI help failed");

				const assistantMsg: AIHelpMessage = {
					role: "assistant",
					content: data.message,
					tier,
					timestamp: Date.now(),
				};
				setAiHelpMessages((prev) => [...prev, assistantMsg]);
			} catch (e: any) {
				setAiHelpError(e.message);
			} finally {
				setAiHelpLoading(false);
			}
		},
		[aiHelpMessages, userCode, language, problem.title, problem.problemStatement, testCases]
	);

	useEffect(() => {
		if (!matchId || !user) return;

		let cancelled = false;
		let intervalId: NodeJS.Timeout | null = null;

		const pollState = async () => {
			try {
				const response = await fetch(`/api/matches/${matchId}/state`);
				if (!response.ok) return;
				const data = await response.json();
				if (cancelled) return;
				const players = Array.isArray(data?.players) ? data.players : [];
				const me = players.find((p: any) => p?.userId === user.uid);
				const opp = players.find((p: any) => p?.userId !== user.uid);
				if (opp?.displayName) setOpponentName(String(opp.displayName));

				const timers = (data?.timersMs || {}) as Record<string, number>;
				const penalties = (data?.penaltiesMs || {}) as Record<string, number>;
				setMyElapsedMs(Number(timers[user.uid] || 0));
				setOpponentElapsedMs(Number(opp?.userId ? timers[opp.userId] || 0 : 0));
				setMyPenaltyMs(Number(penalties[user.uid] || 0));
				setOpponentPenaltyMs(Number(opp?.userId ? penalties[opp.userId] || 0 : 0));
				setMatchStatusText(data?.status === "finished" ? "Finished" : "Active");

				if (data?.status === "finished" && data?.winner) {
					setMatchFinished(true);
					if (!matchOutcomeHandled) {
						setMatchOutcomeHandled(true);
						if (data.winner === user.uid) {
							toast.success("Match ended: You won!", {
								position: "top-center",
								autoClose: 2200,
								theme: "dark",
							});
						} else {
							toast.info("Match ended: Opponent won.", {
								position: "top-center",
								autoClose: 2200,
								theme: "dark",
							});
						}
						setTimeout(() => {
							if (!cancelled) router.push("/");
						}, 1200);
					}
				}
			} catch {
				// ignore transient polling errors
			}
		};

		pollState();
		intervalId = setInterval(pollState, 2000);

		return () => {
			cancelled = true;
			if (intervalId) clearInterval(intervalId);
		};
	}, [matchId, user, router, matchOutcomeHandled]);

	const getDefaultStarterCode = useCallback(
		(lang: JudgeLanguage) => {
			if (lang === "javascript") return problem.starterCode;
			if (lang === "python" && problem.pythonStarterCode) return problem.pythonStarterCode;
			if (lang === "cpp" && problem.cppStarterCode) return problem.cppStarterCode;
			// Generic fallback when per-language starter code is not defined
			const functionName = (problem.starterFunctionName || "solution")
				.replace(/^function\s+/, "")
				.replace(/\(.*/, "")
				.trim();
			if (lang === "python") {
				return `def ${functionName}():\n    # Write your solution here\n    pass`;
			}
			return `#include <bits/stdc++.h>\nusing namespace std;\n\nauto ${functionName}() {\n    // Write your solution here\n}`;
		},
		[problem.starterCode, problem.starterFunctionName, problem.pythonStarterCode, problem.cppStarterCode]
	);

	const editorExtensions = useMemo(() => {
		if (language === "python") return [python()];
		if (language === "cpp") return [cpp()];
		return [javascript()];
	}, [language]);

	const codeStorageKey = `code-${pid}-${language}`;

	/**
	 * Artifact:             handleSubmit
	 * Description:          Extracts the user's function from the editor, executes it via
	 *                       new Function(), and validates it against the problem's test cases.
	 *
	 * Preconditions:        User must be authenticated. problem.starterFunctionName and
	 *                       problem.handlerFunction must be valid.
	 * Acceptable Input:     No parameters; reads userCode and problem from closure.
	 * Unacceptable Input:   N/A — called only by button click.
	 *
	 * Postconditions:       On success: Firestore solvedProblems updated, confetti triggered.
	 *                       On failure: appropriate toast error shown to the user.
	 * Return Values:        Promise<void> — no return value; effects are via state and Firestore.
	 *
	 * Error/Exception Conditions:
	 *                       AssertionError — caught, toast "One or more test cases failed".
	 *                       Any other error — caught, toast with error.message.
	 *                       Not authenticated — early return with toast before execution.
	 * Side Effects:         May write to Firestore. Shows toast. Calls setSuccess / setSolved.
	 * Invariants:           userCode is sliced from starterFunctionName forward before eval.
	 * Known Faults:         No sandbox around new Function(); user code runs with full access.
	 */
	const handleRun = async () => {
		if (matchFinished) {
			toast.info("Match has already ended.", {
				position: "top-center",
				autoClose: 2200,
				theme: "dark",
			});
			return;
		}
		setRunning(true);
		try {
			const body: Record<string, any> = { language, code: userCode };

			if (problem.judgeMetadata) {
				// Function-based: pass the full metadata; server invokes the function directly
				body.metadata = problem.judgeMetadata;
			} else {
				// Legacy stdin/stdout fallback
				body.stdin = testCases[activeTestCaseId]?.input || "";
			}

			const response = await fetch("/api/judge/run", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(body),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Run request failed");
			}

			// Function-based response: data.status is set
			if (data.status) {
				if (data.status === "accepted") {
					const passed = (data.testResults ?? []).filter((r: any) => r.passed).length;
					const total = (data.testResults ?? []).length;
					toast.success(`All ${total} test case${total !== 1 ? "s" : ""} passed! ✓`, { position: "top-center", autoClose: 2500, theme: "dark" });
					// Collect and expose any printed stdout from the judge results
					const printed = (data.testResults ?? []).map((r: any) => r.stdout).filter(Boolean).join("\n").trim();
					setRunStdout(printed || undefined);
				} else {
					const failedTest = (data.testResults ?? []).find((r: any) => !r.passed);
					const passed = (data.testResults ?? []).filter((r: any) => r.passed).length;
					const total = (data.testResults ?? []).length;
					const detail = failedTest?.error
						? failedTest.error
						: failedTest
						? `Expected ${JSON.stringify(failedTest.expected)}, got ${JSON.stringify(failedTest.actual)}`
						: data.message || data.status;
					toast.error(`${passed}/${total} passed — Test ${(failedTest?.testIndex ?? 0) + 1}: ${detail}`, {
						position: "top-center",
						autoClose: 4000,
						theme: "dark",
					});
					setRunStdout(undefined);
					setHasFailedRun(true);
				}
			} else {
				// Legacy response: exitCode-based
				if (data.exitCode === 0) {
					toast.success("Code ran successfully", { position: "top-center", autoClose: 2500, theme: "dark" });
				} else {
					toast.error(data.stderr || "Runtime or compile error", {
						position: "top-center",
						autoClose: 3500,
						theme: "dark",
					});
					setHasFailedRun(true);
				}
			}
		} catch (error: any) {
			toast.error(error.message || "Unable to run code", { position: "top-center", autoClose: 3000, theme: "dark" });
			setHasFailedRun(true);
		} finally {
			setRunning(false);
		}
	};

	const handleSubmit = async () => {
		if (matchFinished) {
			toast.info("Match has already ended.", {
				position: "top-center",
				autoClose: 2200,
				theme: "dark",
			});
			return;
		}
		if (!user) {
			toast.error("Please login to submit your code", {
				position: "top-center",
				autoClose: 3000,
				theme: "dark",
			});
			return;
		}
		// Require judge metadata for function-based problems
		if (!problem.judgeMetadata) {
			toast.error("No test cases configured for this problem yet.", {
				position: "top-center",
				autoClose: 3000,
				theme: "dark",
			});
			return;
		}
		setSubmitting(true);
		try {
			const response = await fetch("/api/judge/submit", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					language,
					code: userCode,
					metadata: problem.judgeMetadata,
				}),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Submit request failed");
			}

			// Function-based judge response: data.status is "accepted" | "wrong_answer" | ...
			const accepted = data.status === "accepted" || data.passed === true;

			if (accepted) {
				toast.success("Congrats! All tests passed!", {
					position: "top-center",
					autoClose: 3000,
					theme: "dark",
				});
				setSuccess(true);
				setTimeout(() => {
					setSuccess(false);
				}, 4000);

				const userRef = doc(firestore, "users", user.uid);
				await updateDoc(userRef, {
					solvedProblems: arrayUnion(pid),
				});
				setSolved(true);

				// If this submission is for a match, notify the match document
				await notifyMatchSubmission("accepted", data);

				// Trigger Big-O complexity analysis (skip in multiplayer)
				// Written by Carlos with help from Claude
				if (!matchId) {
					fetchComplexityAnalysis(userCode, language);
				}
			} else {
				const failedTest = (data.testResults ?? []).find((r: any) => !r.passed);
				const passed = (data.testResults ?? []).filter((r: any) => r.passed).length;
				const total = data.testResults?.length ?? 0;
				const detail = failedTest?.error
					? failedTest.error
					: failedTest
					? `Expected ${JSON.stringify(failedTest.expected)}, got ${JSON.stringify(failedTest.actual)}`
					: data.message || data.status || "One or more test cases failed";
				toast.error(
					total > 0
						? `${passed}/${total} passed — Test ${(failedTest?.testIndex ?? 0) + 1}: ${detail}`
						: detail,
					{ position: "top-center", autoClose: 4000, theme: "dark" }
				);
				setHasFailedSubmit(true);
				await notifyMatchSubmission("failed", data);
			}
		} catch (error: any) {
			toast.error(error.message || "Unable to submit code", {
				position: "top-center",
				autoClose: 3000,
				theme: "dark",
			});
			setHasFailedSubmit(true);
		} finally {
			setSubmitting(false);
		}
	};

	const checkJudgeHealth = async () => {
		setCheckingJudge(true);
		try {
			const response = await fetch("/api/judge/health");
			const data = await response.json();
			if (!response.ok || !data?.ok) {
				setJudgeStatus("down");
				toast.error("Judge is unreachable", { position: "top-center", autoClose: 2200, theme: "dark" });
				return;
			}
			setJudgeStatus("ok");
			toast.success("Judge is online", { position: "top-center", autoClose: 1800, theme: "dark" });
		} catch {
			setJudgeStatus("down");
			toast.error("Judge is unreachable", { position: "top-center", autoClose: 2200, theme: "dark" });
		} finally {
			setCheckingJudge(false);
		}
	};

	useEffect(() => {
		const defaultCode = getDefaultStarterCode(language);

		// Multiplayer matches should always start from clean starter code.
		if (matchId) {
			setUserCode(defaultCode);
			return;
		}

		const stored = localStorage.getItem(codeStorageKey);

		if (user) {
			if (!stored) {
				setUserCode(defaultCode);
			} else {
				const parsed = JSON.parse(stored) as string;
				// If the stored code is the old generic stub, replace it with the proper starter
				const isOldGenericStub =
					/^def\s+\w+\s*\(\s*\):\s*\n\s+# Write your solution here\s*\n\s+pass/.test(parsed.trim()) ||
					/^#include.*\nauto\s+\w+\s*\(\)\s*\{/.test(parsed.trim());
				setUserCode(isOldGenericStub ? defaultCode : parsed);
			}
		} else {
			setUserCode(defaultCode);
		}
	}, [codeStorageKey, user, language, getDefaultStarterCode, matchId]);

	/**
	 * Artifact:             onChange
	 * Description:          Syncs the editor value to component state and persists it to
	 *                       localStorage so drafts survive page refreshes.
	 *
	 * Preconditions:        pid must be available from the router query.
	 * Acceptable Input:     value — the full current string content of the CodeMirror editor.
	 * Unacceptable Input:   N/A — always called by CodeMirror with a valid string.
	 *
	 * Postconditions:       userCode state and localStorage["code-{pid}"] both reflect value.
	 * Return Values:        void.
	 *
	 * Error/Exception Conditions:
	 *                       localStorage.setItem errors are not caught here (see useLocalStorage).
	 * Side Effects:         Writes JSON-stringified code to localStorage on every keystroke.
	 * Invariants:           localStorage key is always "code-" + pid.
	 * Known Faults:         None known.
	 */
	const onChange = (value: string) => {
		setUserCode(value);
		// Keep multiplayer sessions isolated from local draft persistence.
		if (!matchId) {
			localStorage.setItem(codeStorageKey, JSON.stringify(value));
		}
	};

	// ─── AI Help gating logic ─────────────────────────────────────────────
	// Written by Carlos with help from Claude
	const codeModified = userCode.trim() !== getDefaultStarterCode(language).trim();
	const hintAvailable = codeModified && !matchId;
	const guideAvailable = (hasFailedRun || hasFailedSubmit) && !matchId;
	const explainAvailable = hasFailedSubmit && !matchId;

	const showComplexityTab = complexityAnalysis !== null || complexityLoading || complexityError !== null;

	return (
		<div className='flex flex-col bg-dark-layer-1 relative overflow-x-hidden'>
			{/* Chat Panel (multiplayer only) */}
						{matchId && user && (
							<Chat
								matchId={matchId}
								opponentName={opponentName}
								selfName={selfName}
								isOpen={chatOpen}
								onClose={() => setChatOpen(false)}
								onNewMessage={handleNewMessage}
							/>
						)}
			 <PreferenceNav
					 settings={settings}
					 setSettings={setSettings}
					 language={language}
					 setLanguage={(next) => setStoredLanguage(next)}
					 judgeStatus={judgeStatus}
					 checkingJudge={checkingJudge}
					 onCheckJudge={checkJudgeHealth}
					 chatButton={matchId && user ? (
						 <button
							 className={`ml-2 px-3 py-1.5 rounded bg-dark-fill-3 hover:bg-dark-fill-2 text-xs font-medium relative ${hasUnread ? "text-red-500" : "text-white"}`}
							 onClick={() => {
								 setChatOpen((open) => {
									 if (!open) setHasUnread(false); // clear unread when opening chat
									 return !open;
								 });
							 }}
							 aria-label="Toggle chat"
						 >
							 Chat
							 {hasUnread && (
								 <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
							 )}
						 </button>
					 ) : null}
				 />
			{matchId && user ? (
				<div className='px-4 py-2 text-xs' style={{ borderBottom: "1px solid rgba(70, 69, 84, 0.15)", background: "var(--surface-container)", color: "var(--on-surface-variant)" }}>
					<div className='flex flex-wrap items-center gap-4'>
						<span className='font-bold' style={{ color: "var(--on-surface)" }}>Match: {matchStatusText}</span>
						<span
							style={{
								color:
									myElapsedMs === opponentElapsedMs
										? "var(--on-surface-variant)"
										: myElapsedMs < opponentElapsedMs
										? "var(--tertiary)"
										: "var(--error)",
								fontWeight: myElapsedMs === opponentElapsedMs ? "normal" : "600"
							}}
						>
							You: {formatMsAsClock(myElapsedMs)}
						</span>
						<span
							style={{
								color:
									myElapsedMs === opponentElapsedMs
										? "var(--on-surface-variant)"
										: opponentElapsedMs < myElapsedMs
										? "var(--tertiary)"
										: "var(--error)",
								fontWeight: myElapsedMs === opponentElapsedMs ? "normal" : "600"
							}}
						>
							{opponentName}: {formatMsAsClock(opponentElapsedMs)}
						</span>
						<span>Penalty (you): +{Math.floor(myPenaltyMs / 1000)}s</span>
						<span>Penalty ({opponentName}): +{Math.floor(opponentPenaltyMs / 1000)}s</span>
					</div>
				</div>
			) : null}

			<Split className='h-[calc(100vh-94px)]' direction='vertical' sizes={[60, 40]} minSize={60}>
				<div className='w-full overflow-auto'>
					<CodeMirror
						value={userCode}
						theme={vscodeDark}
						onChange={onChange}
						extensions={editorExtensions}
						style={{ fontSize: settings.fontSize }}
					/>
				</div>
				<div className='w-full px-5 overflow-auto pb-[50px]'>
					{/* Tab bar: Testcases + Complexity (when available) */}
					<div className='flex h-10 items-center space-x-6'>
						<div
							className='relative flex h-full flex-col justify-center cursor-pointer'
							onClick={() => setActiveBottomTab("testcases")}
						>
							<div className={`text-sm font-medium leading-5 ${activeBottomTab === "testcases" ? "text-white" : "text-gray-500"}`}>
								Testcases
							</div>
							{activeBottomTab === "testcases" && (
								<hr className='absolute bottom-0 h-0.5 w-full rounded-full border-none bg-white' />
							)}
						</div>
						{showComplexityTab && (
							<div
								className='relative flex h-full flex-col justify-center cursor-pointer'
								onClick={() => setActiveBottomTab("complexity")}
							>
								<div className={`text-sm font-medium leading-5 ${activeBottomTab === "complexity" ? "text-white" : "text-gray-500"}`}>
									Complexity
								</div>
								{activeBottomTab === "complexity" && (
									<hr className='absolute bottom-0 h-0.5 w-full rounded-full border-none bg-white' />
								)}
							</div>
						)}
					</div>

					{/* Tab content */}
					{activeBottomTab === "testcases" ? (
						<>
							{/* Prefer Firestore testcases if available, else fallback to problem.examples */}
							{loadingTestcases ? (
								<p className='text-sm text-gray-400 mt-4'>Loading test cases...</p>
							) : testCases.length > 0 ? (
								<>
									<div className='flex'>
										{testCases.map((tc, index) => (
											<div
												className='mr-2 items-start mt-2 '
												key={index}
												onClick={() => setActiveTestCaseId(index)}
											>
												<div
													className={`font-medium items-center transition-all focus:outline-none inline-flex bg-dark-fill-3 hover:bg-dark-fill-2 relative rounded-lg px-4 py-1 cursor-pointer whitespace-nowrap
														${activeTestCaseId === index ? "text-white" : "text-gray-500"}
													`}
												>
													Test Case {index + 1}
												</div>
											</div>
										))}
									</div>
									<div className='font-semibold my-4'>
										<p className='text-sm font-medium mt-4 text-white'>Input:</p>
										<div className='w-full cursor-text rounded-lg border px-3 py-[10px] bg-dark-fill-3 border-transparent text-white mt-2'>
											{testCases[activeTestCaseId]?.input}
										</div>
										<p className='text-sm font-medium mt-4 text-white'>Output:</p>
										<div className='w-full cursor-text rounded-lg border px-3 py-[10px] bg-dark-fill-3 border-transparent text-white mt-2'>
											{testCases[activeTestCaseId]?.expectedOutput}
										</div>
									</div>
								</>
							) : (
								<p className='text-sm text-gray-400 mt-4'>No test cases available for this problem.</p>
							)}

							{/* Captured stdout (printed output) from the last run */}
							{runStdout ? (
								<div className='mt-4'>
									<p className='text-sm font-medium text-white'>Stdout (prints):</p>
									<pre className='whitespace-pre-wrap bg-dark-fill-3 rounded-lg p-3 text-white mt-2 overflow-auto'>{runStdout}</pre>
								</div>
							) : null}
						</>
					) : (
						<ComplexityPanel
							analysis={complexityAnalysis}
							loading={complexityLoading}
							error={complexityError}
						/>
					)}
				</div>
			</Split>

			{/* AI Help overlay panel */}
			<AIHelpPanel
				isOpen={aiHelpOpen}
				onClose={() => setAiHelpOpen(false)}
				messages={aiHelpMessages}
				onRequestHelp={handleRequestAIHelp}
				loading={aiHelpLoading}
				error={aiHelpError}
				hintAvailable={hintAvailable}
				guideAvailable={guideAvailable}
				explainAvailable={explainAvailable}
			/>

			<EditorFooter
				handleRun={handleRun}
				handleSubmit={handleSubmit}
				running={running}
				submitting={submitting}
				isMultiplayer={Boolean(matchId)}
				onToggleAIHelp={() => setAiHelpOpen((prev) => !prev)}
				aiHelpDisabled={Boolean(matchId)}
			/>
		</div>
	);
};
export default Playground;
