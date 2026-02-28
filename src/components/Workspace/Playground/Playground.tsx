/**
 * Artifact:             Playground.tsx
 * Description:          Code editor panel — vertically split CodeMirror editor and test
 *                       case viewer. Handles code persistence, submission, and client-side
 *                       execution using new Function() validated by Node's assert library.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        A valid Problem object must be passed. Firebase and localStorage
 *                       must be accessible. User must be authenticated to submit.
 * Acceptable Input:     problem — Problem with valid starterCode and handlerFunction string;
 *                       setSuccess / setSolved — React dispatch functions (boolean).
 * Unacceptable Input:   Problem missing handlerFunction; null setSuccess or setSolved.
 *
 * Postconditions:       On successful submission, solvedProblems in Firestore is updated
 *                       and setSuccess / setSolved are called with true.
 * Return Values:        React JSX of the vertically split editor and test case panel.
 *
 * Error/Exception Conditions:
 *                       AssertionError from test cases — toast "One or more test cases failed".
 *                       SyntaxError / ReferenceError from new Function() — toast with message.
 *                       Unauthenticated submit — toast "Please login to submit your code".
 *                       Firestore updateDoc failure — error propagates to the browser console.
 * Side Effects:         Writes user code to localStorage on every keystroke (key: "code-{pid}").
 *                       Writes to Firestore solvedProblems array on successful submission.
 *                       Fires toast notifications and triggers confetti via setSuccess(true).
 * Invariants:           userCode always mirrors the current CodeMirror editor content.
 *                       localStorage key format is always "code-{pid}".
 * Known Faults:         new Function() executes arbitrary user JavaScript with no sandboxing;
 *                       malicious code could access window, document, or other browser APIs.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import PreferenceNav from "./PreferenceNav/PreferenceNav";
import Split from "react-split";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import EditorFooter from "./EditorFooter";
import { Problem } from "@/utils/types/problem";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, firestore } from "@/firebase/firebase";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import useLocalStorage from "@/hooks/useLocalStorage";

type PlaygroundProps = {
	problem: Problem;
	setSuccess: React.Dispatch<React.SetStateAction<boolean>>;
	setSolved: React.Dispatch<React.SetStateAction<boolean>>;
};

export interface ISettings {
	fontSize: string;
	settingsModalIsOpen: boolean;
	dropdownIsOpen: boolean;
}

export type JudgeLanguage = "javascript" | "python" | "cpp";
export type JudgeStatus = "unknown" | "ok" | "down";

const Playground: React.FC<PlaygroundProps> = ({ problem, setSuccess, setSolved }) => {
	const [activeTestCaseId, setActiveTestCaseId] = useState<number>(0);
	const [userCode, setUserCode] = useState<string>(problem.starterCode);
	const [storedLanguage, setStoredLanguage] = useLocalStorage("beatcode-language", "javascript");
	const language = (storedLanguage as JudgeLanguage) || "javascript";
	const [running, setRunning] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [judgeStatus, setJudgeStatus] = useState<JudgeStatus>("unknown");
	const [checkingJudge, setCheckingJudge] = useState(false);

	const [fontSize, setFontSize] = useLocalStorage("beatcode-fontSize", "16px");

	const [settings, setSettings] = useState<ISettings>({
		fontSize: fontSize,
		settingsModalIsOpen: false,
		dropdownIsOpen: false,
	});

	const [user] = useAuthState(auth);
	const {
		query: { pid },
	} = useRouter();

	const getDefaultStarterCode = useCallback(
		(lang: JudgeLanguage) => {
			if (lang === "javascript") return problem.starterCode;
			const functionName = (problem.starterFunctionName || "solution")
				.replace(/^function\s+/, "")
				.replace(/\(.*/, "")
				.trim();
			if (lang === "python") {
				return `def ${functionName}():
    # Write your solution here
    pass

if __name__ == "__main__":
    print(${functionName}())`;
			}
			return `#include <bits/stdc++.h>
using namespace std;

auto ${functionName}() {
    // Write your solution here
}

int main() {
    cout << ${functionName}() << "\\n";
    return 0;
}`;
		},
		[problem.starterCode, problem.starterFunctionName]
	);

	const editorExtensions = useMemo(() => {
		if (language === "python") return [python()];
		if (language === "cpp") return [cpp()];
		return [javascript()];
	}, [language]);

	const codeStorageKey = `code-${pid}-${language}`;
	const testCases = problem.examples.map((example) => ({
		input: example.inputText || "",
		expectedOutput: example.outputText || "",
	}));

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
		setRunning(true);
		try {
			const response = await fetch("/api/judge/run", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					language,
					code: userCode,
					stdin: testCases[activeTestCaseId]?.input || "",
				}),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Run request failed");
			}

			if (data.exitCode === 0) {
				toast.success("Code ran successfully", { position: "top-center", autoClose: 2500, theme: "dark" });
			} else {
				toast.error(data.stderr || "Runtime or compile error", {
					position: "top-center",
					autoClose: 3500,
					theme: "dark",
				});
			}
		} catch (error: any) {
			toast.error(error.message || "Unable to run code", { position: "top-center", autoClose: 3000, theme: "dark" });
		} finally {
			setRunning(false);
		}
	};

	const handleSubmit = async () => {
		if (!user) {
			toast.error("Please login to submit your code", {
				position: "top-center",
				autoClose: 3000,
				theme: "dark",
			});
			return;
		}
		if (testCases.length === 0) {
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
					testCases,
				}),
			});
			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Submit request failed");
			}

			if (data.passed) {
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
			} else if (data.reason === "wrong_answer") {
				toast.error(`Wrong answer on case ${Number(data.failedAt) + 1}`, {
					position: "top-center",
					autoClose: 3500,
					theme: "dark",
				});
			} else {
				toast.error("Runtime or compile error", {
					position: "top-center",
					autoClose: 3500,
					theme: "dark",
				});
			}
		} catch (error: any) {
			toast.error(error.message || "Unable to submit code", {
				position: "top-center",
				autoClose: 3000,
				theme: "dark",
			});
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
		const code = localStorage.getItem(codeStorageKey);
		if (user) {
			setUserCode(code ? JSON.parse(code) : getDefaultStarterCode(language));
		} else {
			setUserCode(getDefaultStarterCode(language));
		}
	}, [codeStorageKey, user, language, getDefaultStarterCode]);

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
		localStorage.setItem(codeStorageKey, JSON.stringify(value));
	};

	return (
		<div className='flex flex-col bg-dark-layer-1 relative overflow-x-hidden'>
			<PreferenceNav
				settings={settings}
				setSettings={setSettings}
				language={language}
				setLanguage={(next) => setStoredLanguage(next)}
				judgeStatus={judgeStatus}
				checkingJudge={checkingJudge}
				onCheckJudge={checkJudgeHealth}
			/>

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
				<div className='w-full px-5 overflow-auto'>
					{/* testcase heading */}
					<div className='flex h-10 items-center space-x-6'>
						<div className='relative flex h-full flex-col justify-center cursor-pointer'>
							<div className='text-sm font-medium leading-5 text-white'>Testcases</div>
							<hr className='absolute bottom-0 h-0.5 w-full rounded-full border-none bg-white' />
						</div>
					</div>

					{/* Written by Carlos with help from Claude — guard for problems with no examples */}
					{problem.examples.length > 0 ? (
						<>
							<div className='flex'>
								{problem.examples.map((example, index) => (
									<div
										className='mr-2 items-start mt-2 '
										key={example.id}
										onClick={() => setActiveTestCaseId(index)}
									>
										<div className='flex flex-wrap items-center gap-y-4'>
											<div
												className={`font-medium items-center transition-all focus:outline-none inline-flex bg-dark-fill-3 hover:bg-dark-fill-2 relative rounded-lg px-4 py-1 cursor-pointer whitespace-nowrap
												${activeTestCaseId === index ? "text-white" : "text-gray-500"}
											`}
											>
												Case {index + 1}
											</div>
										</div>
									</div>
								))}
							</div>
							<div className='font-semibold my-4'>
								<p className='text-sm font-medium mt-4 text-white'>Input:</p>
								<div className='w-full cursor-text rounded-lg border px-3 py-[10px] bg-dark-fill-3 border-transparent text-white mt-2'>
									{problem.examples[activeTestCaseId]?.inputText}
								</div>
								<p className='text-sm font-medium mt-4 text-white'>Output:</p>
								<div className='w-full cursor-text rounded-lg border px-3 py-[10px] bg-dark-fill-3 border-transparent text-white mt-2'>
									{problem.examples[activeTestCaseId]?.outputText}
								</div>
							</div>
						</>
					) : (
						<p className='text-sm text-gray-400 mt-4'>No test cases available for this problem.</p>
					)}
				</div>
			</Split>
			<EditorFooter
				handleRun={handleRun}
				handleSubmit={handleSubmit}
				running={running}
				submitting={submitting}
			/>
		</div>
	);
};
export default Playground;

