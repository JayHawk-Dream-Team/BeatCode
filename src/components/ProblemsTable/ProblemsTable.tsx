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
import { BsCheckCircle } from "react-icons/bs";
import { AiFillYoutube } from "react-icons/ai";
import { IoClose } from "react-icons/io5";
import YouTube from "react-youtube";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { auth, firestore } from "@/firebase/firebase";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { DBProblem } from "@/utils/types/problem";
import { useAuthState } from "react-firebase-hooks/auth";

type ProblemsTableProps = {
	setLoadingProblems: React.Dispatch<React.SetStateAction<boolean>>;
};

const ProblemsTable: React.FC<ProblemsTableProps> = ({ setLoadingProblems }) => {
	const [youtubePlayer, setYoutubePlayer] = useState({
		isOpen: false,
		videoId: "",
	});
	const problems = useGetProblems(setLoadingProblems);
	const solvedProblems = useGetSolvedProblems();
	const [user] = useAuthState(auth);
	const router = useRouter();
	const [joiningId, setJoiningId] = useState<string | null>(null);
	const [pollingInfo, setPollingInfo] = useState<{ problemId: string; userId: string } | null>(null);
	console.log("solvedProblems", solvedProblems);
	const closeModal = () => {
		setYoutubePlayer({ isOpen: false, videoId: "" });
	};

	// Poll for match if queued
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

	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeModal();
		};
		window.addEventListener("keydown", handleEsc);

		return () => window.removeEventListener("keydown", handleEsc);
	}, []);

	return (
		<>
			<tbody className='text-white'>
				{problems.map((problem, idx) => {
					const difficulyColor =
						problem.difficulty === "Easy"
							? "text-dark-green-s"
							: problem.difficulty === "Medium"
							? "text-dark-yellow"
							: "text-dark-pink";
					return (
						<tr className={`${idx % 2 == 1 ? "bg-dark-layer-1" : ""}`} key={problem.id}>
							<th className='px-2 py-4 font-medium whitespace-nowrap text-dark-green-s'>
								{solvedProblems.includes(problem.id) && <BsCheckCircle fontSize={"18"} width='18' />}
							</th>
							<td className='px-6 py-4'>
								{/* Written by Carlos with help from Claude */}
								<div className='flex items-center gap-2'>
									<Link
										className='hover:text-blue-600 cursor-pointer'
										href={`/problems/${problem.id}`}
									>
										{problem.title}
									</Link>
									{problem.link && (
										<a
											href={problem.link}
											target='_blank'
											rel='noreferrer'
											className='text-gray-500 hover:text-blue-400'
											title='View on LeetCode'
										>
											&#8599;
										</a>
									)}
								</div>
							</td>
							<td className={`px-6 py-4 ${difficulyColor}`}>{problem.difficulty}</td>
							<td className={"px-6 py-4"}>{problem.category}</td>
							<td className={'px-6 py-4'}>
								{problem.videoId ? (
									<AiFillYoutube
										fontSize={'28'}
										className='cursor-pointer hover:text-red-600'
										onClick={() =>
											setYoutubePlayer({ isOpen: true, videoId: problem.videoId as string })
										}
									/>
								) : (
									<p className='text-gray-400'>Coming soon</p>
								)}

								{/* Multiplayer button */}
								<div className='mt-2'>
									<button
										className='bg-dark-fill-3 py-1 px-3 rounded hover:bg-dark-fill-2'
										onClick={() => handleJoin(problem.id)}
										disabled={joiningId === problem.id}
									>
										{joiningId === problem.id ? 'Joining...' : 'Multiplayer'}
									</button>
								</div>
							</td>
						</tr>
					);
				})}
			</tbody>
			{youtubePlayer.isOpen && (
				<tfoot className='fixed top-0 left-0 h-screen w-screen flex items-center justify-center'>
					<div
						className='bg-black z-10 opacity-70 top-0 left-0 w-screen h-screen absolute'
						onClick={closeModal}
					></div>
					<div className='w-full z-50 h-full px-6 relative max-w-4xl'>
						<div className='w-full h-full flex items-center justify-center relative'>
							<div className='w-full relative'>
								<IoClose
									fontSize={"35"}
									className='cursor-pointer absolute -top-16 right-0'
									onClick={closeModal}
								/>
								<YouTube
									videoId={youtubePlayer.videoId}
									loading='lazy'
									iframeClassName='w-full min-h-[500px]'
								/>
							</div>
						</div>
					</div>
				</tfoot>
			)}
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
	const [user] = useAuthState(auth);

	useEffect(() => {
		const getSolvedProblems = async () => {
			const userRef = doc(firestore, "users", user!.uid);
			const userDoc = await getDoc(userRef);

			if (userDoc.exists()) {
				setSolvedProblems(userDoc.data().solvedProblems);
			}
		};

		if (user) getSolvedProblems();
		if (!user) setSolvedProblems([]);
	}, [user]);

	return solvedProblems;
}







