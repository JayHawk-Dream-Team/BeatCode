/**
 * Artifact:             ProblemsTable.tsx
 * Description:          Renders the problems list table — fetches Firestore problem metadata
 *                       and the current user's solved problem IDs, with an inline YouTube
 *                       modal for solution videos.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *   2026-02-27          Updated useGetProblems to support both old (title, category, order)
 *                       and new (Title, Difficulty, Tags, Leetcode link, Youtube links,
 *                       Beatcode_id, LeetcodeId) Firestore document schemas; removed
 *                       orderBy("order") constraint so new docs without an order field are
 *                       returned; added extractYoutubeId helper (Carlos Mbendera)
 *   2026-02-27          Fixed collection name from "problems" to "questions"; updated field
 *                       mapping to match actual schema: title, difficulty (lowercase),
 *                       tags (array of {name,slug} objects), link, yt_url, beatcode_id,
 *                       id (LeetcodeId); normalised difficulty to title case (Carlos Mbendera)
 *
 * Preconditions:        Firebase and Firestore must be initialized. The "questions" collection
 *                       must exist with documents from the new schema. setLoadingProblems must
 *                       be a valid React dispatch function.
 * Acceptable Input:     setLoadingProblems — React setState dispatch function (boolean).
 * Unacceptable Input:   null or undefined setLoadingProblems.
 *
 * Postconditions:       Table rows are rendered for each Firestore problem document.
 *                       Solved checkmarks appear beside problems the authenticated user solved.
 * Return Values:        React JSX tbody rows and an optional YouTube modal tfoot overlay.
 *
 * Error/Exception Conditions:
 *                       Firestore getDocs errors reject silently; the table renders empty.
 *                       If the user Firestore document does not exist, solvedProblems stays [].
 * Side Effects:         Two Firestore reads on mount (problems collection; user document).
 *                       Registers and removes a keydown listener for Escape to close modal.
 * Invariants:           solvedProblems is always an array, never null or undefined.
 * Known Faults:         console.log("solvedProblems", solvedProblems) left in production code.
 */

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { BsCheckCircle } from "react-icons/bs";
import { AiFillYoutube } from "react-icons/ai";
import { IoClose } from "react-icons/io5";
import YouTube from "react-youtube";
import { collection, doc, getDoc, getDocs, query } from "firebase/firestore";
import { auth, firestore } from "@/firebase/firebase";
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
	console.log("solvedProblems", solvedProblems);
	const closeModal = () => {
		setYoutubePlayer({ isOpen: false, videoId: "" });
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
								{problem.link ? (
									<Link
										href={problem.link}
										className='hover:text-blue-600 cursor-pointer'
										target='_blank'
									>
										{problem.title}
									</Link>
								) : (
									<Link
										className='hover:text-blue-600 cursor-pointer'
										href={`/problems/${problem.id}`}
									>
										{problem.title}
									</Link>
								)}
							</td>
							<td className={`px-6 py-4 ${difficulyColor}`}>{problem.difficulty}</td>
							<td className={"px-6 py-4"}>{problem.category}</td>
							<td className={"px-6 py-4"}>
								{problem.videoId ? (
									<AiFillYoutube
										fontSize={"28"}
										className='cursor-pointer hover:text-red-600'
										onClick={() =>
											setYoutubePlayer({ isOpen: true, videoId: problem.videoId as string })
										}
									/>
								) : (
									<p className='text-gray-400'>Coming soon</p>
								)}
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
 * Return Values:        string — the extracted or original video ID.
 *
 * Error/Exception Conditions:
 *                       None; falls back to returning the original string on parse failure.
 * Side Effects:         None — pure function.
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
		// url is not a valid URL — treat it as a bare video ID
	}
	return url;
}

/**
 * Artifact:             useGetProblems
 * Description:          Custom hook — fetches all problems from Firestore, normalises both
 *                       old and new document schemas into DBProblem objects, sorts by order
 *                       (falling back to LeetcodeId / Beatcode_id), and signals loading state.
 *
 * Preconditions:        Firestore must be initialized; "problems" collection must exist.
 * Acceptable Input:     setLoadingProblems — React dispatch for a boolean loading flag.
 * Unacceptable Input:   null or undefined setLoadingProblems.
 *
 * Postconditions:       problems state holds all DBProblem documents sorted by order;
 *                       setLoadingProblems is called false when the fetch completes.
 * Return Values:        DBProblem[] — array of all problem metadata documents.
 *
 * Error/Exception Conditions:
 *                       getDocs errors propagate as unhandled promise rejections.
 * Side Effects:         Reads the "problems" Firestore collection on mount.
 * Invariants:           setLoadingProblems transitions to false exactly once per mount.
 * Known Faults:         None known.
 */
function useGetProblems(setLoadingProblems: React.Dispatch<React.SetStateAction<boolean>>) {
	const [problems, setProblems] = useState<DBProblem[]>([]);

	useEffect(() => {
		// Written by Carlos with help from Claude
		const getProblems = async () => {
			setLoadingProblems(true);
			try {
				const q = query(collection(firestore, "questions"));
				const querySnapshot = await getDocs(q);
				const tmp: DBProblem[] = [];
				querySnapshot.forEach((docSnap) => {
					const data = docSnap.data();

					// tags is an array of {name, slug, __typename} objects
					const tagNames: string[] = Array.isArray(data.tags)
						? data.tags.map((t: { name: string }) => t.name).filter(Boolean)
						: [];

					// Normalise difficulty to title case ("easy" → "Easy")
					const rawDifficulty: string = data.difficulty || "";
					const difficulty =
						rawDifficulty.charAt(0).toUpperCase() + rawDifficulty.slice(1).toLowerCase();

					const videoId = data.yt_url ? extractYoutubeId(data.yt_url) : undefined;

					tmp.push({
						id: docSnap.id,
						title: data.title || "",
						category: tagNames.join(", "),
						difficulty,
						likes: data.likes || 0,
						dislikes: data.dislikes || 0,
						order: data.beatcode_id || data.id || 0,
						videoId,
						link: data.link,
						beatcodeId: String(data.beatcode_id ?? ""),
						leetcodeId: data.id,
						description: data.description,
						tags: tagNames,
					} as DBProblem);
				});
				// Sort by beatcode_id ascending
				tmp.sort((a, b) => (a.order || 0) - (b.order || 0));
				setProblems(tmp);
			} catch (error) {
				console.error("Failed to fetch problems from Firestore:", error);
			} finally {
				setLoadingProblems(false);
			}
		};

		getProblems();
	}, [setLoadingProblems]);
	return problems;
}

/**
 * Artifact:             useGetSolvedProblems
 * Description:          Custom hook — returns the list of problem IDs the current user
 *                       has solved, resetting to empty on sign-out.
 *
 * Preconditions:        Firebase Auth and Firestore must be initialized.
 * Acceptable Input:     No parameters; reads user auth state internally.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       solvedProblems contains the user's solved problem ID array,
 *                       or [] when no user is authenticated.
 * Return Values:        string[] — array of solved problem ids (e.g. ["two-sum"]).
 *
 * Error/Exception Conditions:
 *                       If the user Firestore document does not exist, solvedProblems
 *                       remains [] (no error is thrown).
 * Side Effects:         Reads the "users/{uid}" Firestore document when a user is present.
 * Invariants:           Return value is always an array; never null or undefined.
 * Known Faults:         None known.
 */
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
