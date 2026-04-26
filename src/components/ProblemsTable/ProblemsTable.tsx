/**
 * prologue comment
 * Name of code artifact: ProblemsTable.tsx
 * Brief description: Renders the problems table, solved-status indicators, and multiplayer queue actions.
 * Programmer's name: Jonathan Johnston
 * Date the code was created: 2023-03-18
 * Dates the code was revised:
 *   - 2026-02-24: Added earlier prologue documentation (Carlos Mbendera)
 *   - 2026-02-27: Updated Firestore schema mapping and problem loading behavior (Carlos Mbendera)
 *   - 2026-03-01: Added local problem map/testing-related updates (Carlos Mbendera)
 *   - 2026-03-20: Updated multiplayer join flow to prefer Firestore displayName and fixed UI text encoding artifacts (Jonathan Johnston)
 * Brief description of each revision & author: See revision list above.
 * Preconditions:
 *   - Firebase auth and firestore clients are initialized.
 *   - questions collection is readable under active rules.
 * Acceptable and unacceptable input values or types, and their meanings:
 *   - Acceptable: setLoadingProblems as a React state dispatcher.
 *   - Unacceptable: missing dispatcher or denied Firestore access; table may render with empty data.
 * Postconditions:
 *   - Problem rows and multiplayer actions are rendered according to fetched data.
 * Return values or types, and their meanings:
 *   - Returns React JSX markup for table body and optional video modal.
 * Error and exception condition values or types that can occur, and their meanings:
 *   - Firestore/network failures may produce empty lists and user-facing toast errors.
 * Side effects:
 *   - Performs Firestore reads and matchmaking API calls.
 * Invariants:
 *   - solvedProblems remains an array used for membership checks.
 * Any known faults:
 *   - Debug logging may still appear in development output.
 */
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AiFillYoutube } from "react-icons/ai";
import { BsCheckCircleFill, BsCircle } from "react-icons/bs";
import { useRouter } from "next/router";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { auth, firestore } from "@/firebase/firebase";
import { toast } from "react-toastify";
import { DBProblem } from "@/utils/types/problem";
import { useAuthState } from "react-firebase-hooks/auth";

type ProblemsTableProps = {
	setLoadingProblems: React.Dispatch<React.SetStateAction<boolean>>;
	selectedDifficulty?: string | null;
	selectedStatus?: string | null;
	selectedTopic?: string | null;
	onTopicsChange?: (topics: string[]) => void;
};

const ProblemsTable: React.FC<ProblemsTableProps> = ({
	setLoadingProblems,
	selectedDifficulty,
	selectedStatus,
	selectedTopic,
	onTopicsChange,
}) => {
	const problems = useGetProblems(setLoadingProblems);
	const { solvedProblems, attemptedProblems } = useGetSolvedProblems();
	const [user] = useAuthState(auth);
	const router = useRouter();
	const [joiningId, setJoiningId] = useState<string | null>(null);
	const [pollingInfo, setPollingInfo] = useState<{ problemId: string; userId: string } | null>(null);

	const solved = solvedProblems ?? [];
	const attempted = attemptedProblems ?? [];

	const filteredProblems = problems.filter((problem) => {
		if (selectedDifficulty && problem.difficulty !== selectedDifficulty) return false;
		if (selectedStatus) {
			if (selectedStatus === "Solved" && !solved.includes(problem.id)) return false;
			if (selectedStatus === "Todo" && (solved.includes(problem.id) || attempted.includes(problem.id))) return false;
			if (selectedStatus === "Attempted" && !attempted.includes(problem.id)) return false;
		}
		if (selectedTopic && (problem.category ?? "").toLowerCase() !== selectedTopic.toLowerCase()) return false;
		return true;
	});

	useEffect(() => {
		if (!onTopicsChange) return;
		const uniqueTopics = Array.from(
			new Set(
				problems
					.map((problem) => String(problem.category || "").trim())
					.filter((topic) => topic.length > 0)
			)
		).sort((a, b) => a.localeCompare(b));
		onTopicsChange(["All", ...uniqueTopics]);
	}, [problems, onTopicsChange]);

	useEffect(() => {
		if (!pollingInfo) return;
		const interval = setInterval(async () => {
			try {
				const res = await fetch("/api/matchmaking/check", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ userId: pollingInfo.userId, problemId: pollingInfo.problemId }),
				});
				const data = await res.json();
				if (data.matchId) {
					router.push(`/problems/${pollingInfo.problemId}?matchId=${data.matchId}`);
				}
			} catch (err) {
				// ignore
			}
		}, 2000);
		return () => clearInterval(interval);
	}, [pollingInfo, router]);

	const handleJoin = async (problemId: string) => {
		if (!user) {
			toast.error("Please sign in to join multiplayer", { position: "top-center", theme: "dark" });
			router.push("/auth");
			return;
		}
		try {
			setJoiningId(problemId);
			let dbDisplayName = "";
			try {
				const userSnap = await getDoc(doc(firestore, "users", user.uid));
				if (userSnap.exists()) {
					const userData = userSnap.data() as any;
					dbDisplayName =
						(typeof userData?.displayName === "string" && userData.displayName.trim()) ||
						(typeof userData?.username === "string" && userData.username.trim()) ||
						"";
				}
			} catch {
				// fallback below
			}
			const preferredDisplayName =
				dbDisplayName ||
				(user.displayName && user.displayName.trim()) ||
				(user.email ? user.email.split("@")[0] : "") ||
				"Player";
			const res = await fetch("/api/matchmaking/join", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: user.uid, displayName: preferredDisplayName, problemId }),
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error || "Failed to join queue");
			if (data.queued) {
				toast.info("Queued for match - waiting for an opponent", { position: "top-center", theme: "dark" });
				setPollingInfo({ problemId, userId: user.uid });
			} else {
				router.push(`/problems/${problemId}?matchId=${data.matchId}`);
			}
		} catch (err: any) {
			toast.error(err.message || "Unable to join matchmaking", { position: "top-center", theme: "dark" });
		} finally {
			setJoiningId(null);
		}
	};

	const handleCancel = async (queueId?: string) => {
		try {
			await fetch("/api/matchmaking/cancel", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId: user?.uid || null, queueId: queueId || null }),
			});
			toast.info("Cancelled matchmaking", { position: "top-center", theme: "dark" });
		} catch (err) {
			toast.error("Failed to cancel matchmaking", { position: "top-center", theme: "dark" });
		}
	};

	return (
		<>
			<tbody style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
				{filteredProblems.map((problem, idx) => {
					const difficultyColor =
						problem.difficulty === "Easy"
							? "var(--tertiary)"
							: problem.difficulty === "Medium"
							? "var(--secondary)"
							: "var(--error)";

					return (
						<tr key={problem.id} className='group hover:bg-surface-container-high transition-colors' style={{ borderBottom: '1px solid rgba(70, 69, 84, 0.05)', cursor: 'pointer' }}>
							{/* Status Column */}
							<td className='px-8 py-5 text-center'>
								{solved.includes(problem.id) ? (
									<BsCheckCircleFill
										size={18}
										aria-label='Solved'
										title='Solved'
										style={{ color: 'var(--tertiary-fixed-dim)' }}
									/>
								) : (
									<BsCircle
										size={16}
										aria-label='Unsolved'
										title='Unsolved'
										style={{ color: 'rgba(70, 69, 84, 0.3)' }}
									/>
								)}
							</td>

							{/* Title Column */}
							<td className='px-6 py-5'>
								<div className='flex flex-col'>
									<div className='flex items-center gap-2'>
										<Link
											href={`/problems/${problem.id}`}
											className='text-base font-bold transition-colors group-hover:text-primary'
											style={{ color: 'var(--on-surface)' }}
										>
											{problem.title}
										</Link>
										{problem.link ? (
											<a
												href={problem.link}
												target='_blank'
												rel='noreferrer'
												title='Open on LeetCode'
												className='inline-flex items-center text-sm font-bold'
												style={{ color: 'var(--primary)' }}
											>
												&#8599;
											</a>
										) : null}
										{problem.videoId ? (
											<a
												href={`https://www.youtube.com/watch?v=${problem.videoId}`}
												target='_blank'
												rel='noreferrer'
												title='Watch solution video'
												className='inline-flex items-center'
												style={{ color: '#ef4444' }}
											>
												<AiFillYoutube size={18} />
											</a>
										) : null}
									</div>
									<span className='text-xs mt-1' style={{ color: 'var(--on-surface-variant)' }}>
										{problem.category}
									</span>
								</div>
							</td>

							{/* Difficulty Column */}
							<td className='px-6 py-5'>
								<span className='text-xs font-bold uppercase tracking-widest' style={{ color: difficultyColor }}>
									{problem.difficulty}
								</span>
							</td>

							{/* Category Column */}
							<td className='px-6 py-5'>
								<span className='text-xs' style={{ color: 'var(--on-surface-variant)' }}>
									{problem.category}
								</span>
							</td>

							{/* Action Column */}
							<td className='px-6 py-5'>
								<button
									className='font-medium text-sm py-1 px-3 rounded-lg transition-all active:scale-95'
									style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}
									onClick={() => handleJoin(problem.id)}
									disabled={joiningId === problem.id}
								>
									{joiningId === problem.id ? 'Joining...' : 'Solve'}
								</button>
							</td>
						</tr>
					);
				})}
			</tbody>
		</>
	);
};
export default ProblemsTable;

/**
 * Artifact:             extractYoutubeId
 * Description:          Extracts the 11-character YouTube video ID from a full YouTube URL
 *                       or returns the string as-is when it is already a bare video ID.
 *
 * Preconditions:        url must be a non-empty string.
 * Acceptable Input:     Full YouTube URLs (youtube.com/watch?v=..., youtu.be/...) or
 *                       bare 11-character video IDs.
 * Unacceptable Input:   Empty string; non-YouTube URLs (returned unchanged).
 *
 * Postconditions:       Returns the video ID string.
 * Return Values:        string â€” the extracted or original video ID.
 *
 * Error/Exception Conditions:
 *                       None; falls back to returning the original string on parse failure.
 * Side Effects:         None â€” pure function.
 * Invariants:           Return value is always a non-empty string when input is non-empty.
 * Known Faults:         Does not validate that the returned ID is a real YouTube video.
 */
// Written by Carlos with help from Claude
function extractYoutubeId(url: string): string {
	try {
		const parsed = new URL(url);
		if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1);
		const v = parsed.searchParams.get("v");
		if (v) return v;
	} catch {
		// url is not a valid URL â€” treat it as a bare video ID
	}
	return url;
}

/**
 * Artifact:             useGetProblems
 * Description:          Custom hook â€” fetches all problems from Firestore, normalises both
 *                       old and new document schemas into DBProblem objects, sorts by order
 *                       (falling back to LeetcodeId / Beatcode_id), and signals loading state.
 *
 * Preconditions:        Firestore must be initialized; "problems" collection must exist.
 * Acceptable Input:     setLoadingProblems â€” React dispatch for a boolean loading flag.
 * Unacceptable Input:   null or undefined setLoadingProblems.
 *
 * Postconditions:       problems state holds all DBProblem documents sorted by order;
 *                       setLoadingProblems is called false when the fetch completes.
 * Return Values:        DBProblem[] â€” array of all problem metadata documents.
 *
 * Error/Exception Conditions:
 *                       getDocs errors propagate as unhandled promise rejections.
 * Side Effects:         Reads the "problems" Firestore collection on mount.
 * Invariants:           setLoadingProblems transitions to false exactly once per mount.
 * Known Faults:         None known.
 */

function useGetProblems(setLoadingProblems: React.Dispatch<React.SetStateAction<boolean>>) {
	const [problems, setProblems] = useState<DBProblem[]>([]);

	const normalizeDifficulty = (difficulty: unknown): string => {
		const raw = typeof difficulty === "string" ? difficulty.trim() : "";
		return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : "Medium";
	};

	const normalizeCategory = (data: any): string => {
		if (typeof data.category === "string" && data.category.trim()) return data.category;
		if (Array.isArray(data.tags) && data.tags.length > 0) {
			const tag = data.tags[0];
			return typeof tag?.name === "string" && tag.name.trim()
				? tag.name
				: typeof tag?.slug === "string" && tag.slug.trim()
				? tag.slug
				: "Algorithms";
		}
		return "Algorithms";
	};

	const toNumber = (value: unknown, fallback: number): number => {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : fallback;
	};

	const normalizeProblem = (docSnap: any, fallbackOrder: number): DBProblem => {
		const data = docSnap.data();
		const rawDifficulty = data.difficulty || data.difficultyLevel || data.level || "medium";
		const rawOrder =
			data.order ??
			data.beatcode_id ??
			data.beatcodeId ??
			data.id ??
			data.leetcodeId ??
			data.leetCodeId ??
			fallbackOrder;
		const rawVideo = data.videoId || data.yt_url || data.videoURL;

		return {
			id: docSnap.id,
			title: data.title || "Untitled",
			category: normalizeCategory(data),
			difficulty: normalizeDifficulty(rawDifficulty),
			likes: toNumber(data.likes, 0),
			dislikes: toNumber(data.dislikes, 0),
			order: toNumber(rawOrder, fallbackOrder),
			videoId: rawVideo ? extractYoutubeId(String(rawVideo)) : undefined,
			link: data.link || data.leetcodeLink || undefined,
		} as DBProblem;
	};

	useEffect(() => {
		setLoadingProblems(true);
		async function fetchProblems() {
			try {
				const querySnapshot = await getDocs(collection(firestore, "questions"));
				let docs = querySnapshot.docs;

				if (docs.length === 0) {
					const legacySnapshot = await getDocs(collection(firestore, "problems"));
					docs = legacySnapshot.docs;
				}

				// eslint-disable-next-line react-hooks/exhaustive-deps
				const fetched: DBProblem[] = docs.map((docSnap, idx) => normalizeProblem(docSnap, idx + 1));

				if (fetched.length === 0) {
					console.warn("[ProblemsTable] No problems found in Firestore collection(s)");
					setProblems([]);
					return;
				}

				fetched.sort((a, b) => (a.order || 0) - (b.order || 0));
				setProblems(fetched);
			} catch (e) {
				console.error("[ProblemsTable] Failed to load problems from Firestore", e);
				setProblems([]);
			} finally {
				setLoadingProblems(false);
			}
		}
		fetchProblems();
	}, [setLoadingProblems]);

	return problems;
}
function useGetSolvedProblems() {
	const [solvedProblems, setSolvedProblems] = useState<string[]>([]);
	const [attemptedProblems, setAttemptedProblems] = useState<string[]>([]);
	const [user] = useAuthState(auth);

	useEffect(() => {
		const getSolvedProblems = async () => {
			const userRef = doc(firestore, "users", user!.uid);
			const userDoc = await getDoc(userRef);

			if (userDoc.exists()) {
				setSolvedProblems(userDoc.data().solvedProblems || []);
				setAttemptedProblems(userDoc.data().attemptedProblems || []);
			}
		};

		if (user) getSolvedProblems();
		if (!user) {
			setSolvedProblems([]);
			setAttemptedProblems([]);
		}
	}, [user]);

	return { solvedProblems, attemptedProblems };
}







