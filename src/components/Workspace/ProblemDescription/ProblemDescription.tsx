/**
 * Artifact:             ProblemDescription.tsx
 * Description:          Left-pane component displaying the problem statement, examples,
 *                       constraints, difficulty badge, and user interaction controls
 *                       (like, dislike, star) backed by atomic Firestore transactions.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Firebase and Firestore must be initialized. "problems" and "users"
 *                       Firestore collections must exist. problem prop must be the SSG-
 *                       injected Problem object with a valid id field.
 * Acceptable Input:     problem — Problem object with id, title, problemStatement, examples,
 *                       constraints; _solved — boolean passed down from Workspace.
 * Unacceptable Input:   null or undefined problem; Problem object missing the id field.
 *
 * Postconditions:       Problem is displayed with live like/dislike/star counts from Firestore.
 *                       User interaction state (liked, disliked, starred) is reflected immediately.
 * Return Values:        React JSX of the full left-pane problem description view.
 *
 * Error/Exception Conditions:
 *                       Like/dislike/star without auth — toast shown, action aborted.
 *                       Firestore transaction failure — error propagates to the console only.
 *                       Missing Firestore problem document — currentProblem remains null.
 * Side Effects:         Reads Firestore on mount (problem doc and user doc).
 *                       Writes to both problem doc and user doc on like, dislike, or star.
 *                       updating flag serializes writes to prevent concurrent Firestore ops.
 * Invariants:           liked and disliked are never both true simultaneously.
 *                       updating is always reset to false after each async operation completes.
 * Known Faults:         problemStatement and constraints are rendered via dangerouslySetInnerHTML;
 *                       content must come only from trusted local TS files, never user input.
 */

import CircleSkeleton from "@/components/Skeletons/CircleSkeleton";
import RectangleSkeleton from "@/components/Skeletons/RectangleSkeleton";
import { auth, firestore } from "@/firebase/firebase";
import { DBProblem, Problem } from "@/utils/types/problem";
import { arrayRemove, arrayUnion, doc, getDoc, runTransaction, updateDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { AiFillLike, AiFillDislike, AiOutlineLoading3Quarters, AiFillStar } from "react-icons/ai";
import { BsCheck2Circle } from "react-icons/bs";
import { TiStarOutline } from "react-icons/ti";
import { toast } from "react-toastify";

type ProblemDescriptionProps = {
	problem: Problem;
	_solved: boolean;
};

const ProblemDescription: React.FC<ProblemDescriptionProps> = ({ problem, _solved }) => {
	const [user] = useAuthState(auth);
	const { currentProblem, loading, problemDifficultyClass, setCurrentProblem } = useGetCurrentProblem(problem.id);
	const { liked, disliked, solved, setData, starred } = useGetUsersDataOnProblem(problem.id);
	const [updating, setUpdating] = useState(false);

	/**
	 * Artifact:             returnUserDataAndProblemData
	 * Description:          Fetches both the user document and problem document within a
	 *                       Firestore transaction, returning refs and snapshots for both.
	 *
	 * Preconditions:        user must be non-null; transaction must be an active Firestore
	 *                       transaction object passed from runTransaction.
	 * Acceptable Input:     transaction — active Firestore Transaction object.
	 * Unacceptable Input:   null or undefined transaction; called outside runTransaction.
	 *
	 * Postconditions:       Both Firestore documents have been read within the transaction.
	 * Return Values:        { userDoc, problemDoc, userRef, problemRef } — Firestore document
	 *                       snapshots and references for the user and problem documents.
	 *
	 * Error/Exception Conditions:
	 *                       Throws if user is null (user!.uid will throw).
	 *                       Throws if Firestore read fails inside the transaction.
	 * Side Effects:         Reads two Firestore documents inside the provided transaction.
	 * Invariants:           Always reads both documents within the same transaction context.
	 * Known Faults:         None known.
	 */
	const returnUserDataAndProblemData = async (transaction: any) => {
		const userRef = doc(firestore, "users", user!.uid);
		const problemRef = doc(firestore, "problems", problem.id);
		const userDoc = await transaction.get(userRef);
		const problemDoc = await transaction.get(problemRef);
		return { userDoc, problemDoc, userRef, problemRef };
	};

	/**
	 * Artifact:             handleLike
	 * Description:          Toggles the user's like on this problem using a Firestore
	 *                       transaction — handles unlike and dislike-to-like conversion.
	 *
	 * Preconditions:        User must be authenticated; updating must be false.
	 * Acceptable Input:     No parameters; reads liked, disliked from closure state.
	 * Unacceptable Input:   N/A — called only by button click.
	 *
	 * Postconditions:       Firestore problem likes count and user likedProblems array
	 *                       are updated atomically. Local state is updated optimistically.
	 * Return Values:        Promise<void>.
	 *
	 * Error/Exception Conditions:
	 *                       Not authenticated — toast shown, early return.
	 *                       Firestore transaction failure — error propagates to console.
	 * Side Effects:         Writes to "problems/{id}" and "users/{uid}" in one transaction.
	 *                       Sets updating to true during the operation to block concurrent calls.
	 * Invariants:           liked and disliked are never both true after this function returns.
	 * Known Faults:         None known.
	 */
	const handleLike = async () => {
		if (!user) {
			toast.error("You must be logged in to like a problem", { position: "top-left", theme: "dark" });
			return;
		}
		if (updating) return;
		setUpdating(true);
		await runTransaction(firestore, async (transaction) => {
			const { problemDoc, userDoc, problemRef, userRef } = await returnUserDataAndProblemData(transaction);

			if (userDoc.exists() && problemDoc.exists()) {
				if (liked) {
					// remove problem id from likedProblems on user document, decrement likes on problem document
					transaction.update(userRef, {
						likedProblems: userDoc.data().likedProblems.filter((id: string) => id !== problem.id),
					});
					transaction.update(problemRef, {
						likes: problemDoc.data().likes - 1,
					});

					setCurrentProblem((prev) => (prev ? { ...prev, likes: prev.likes - 1 } : null));
					setData((prev) => ({ ...prev, liked: false }));
				} else if (disliked) {
					transaction.update(userRef, {
						likedProblems: [...userDoc.data().likedProblems, problem.id],
						dislikedProblems: userDoc.data().dislikedProblems.filter((id: string) => id !== problem.id),
					});
					transaction.update(problemRef, {
						likes: problemDoc.data().likes + 1,
						dislikes: problemDoc.data().dislikes - 1,
					});

					setCurrentProblem((prev) =>
						prev ? { ...prev, likes: prev.likes + 1, dislikes: prev.dislikes - 1 } : null
					);
					setData((prev) => ({ ...prev, liked: true, disliked: false }));
				} else {
					transaction.update(userRef, {
						likedProblems: [...userDoc.data().likedProblems, problem.id],
					});
					transaction.update(problemRef, {
						likes: problemDoc.data().likes + 1,
					});
					setCurrentProblem((prev) => (prev ? { ...prev, likes: prev.likes + 1 } : null));
					setData((prev) => ({ ...prev, liked: true }));
				}
			}
		});
		setUpdating(false);
	};

	/**
	 * Artifact:             handleDislike
	 * Description:          Toggles the user's dislike on this problem — handles un-dislike
	 *                       and like-to-dislike conversion via Firestore transaction.
	 *
	 * Preconditions:        User must be authenticated; updating must be false.
	 * Acceptable Input:     No parameters; reads liked, disliked from closure state.
	 * Unacceptable Input:   N/A — called only by button click.
	 *
	 * Postconditions:       Firestore problem dislikes count and user dislikedProblems array
	 *                       are updated atomically. Local state is updated optimistically.
	 * Return Values:        Promise<void>.
	 *
	 * Error/Exception Conditions:
	 *                       Not authenticated — toast shown, early return.
	 *                       Firestore transaction failure — error propagates to console.
	 * Side Effects:         Writes to "problems/{id}" and "users/{uid}" in one transaction.
	 * Invariants:           liked and disliked are never both true after this function returns.
	 * Known Faults:         None known.
	 */
	const handleDislike = async () => {
		if (!user) {
			toast.error("You must be logged in to dislike a problem", { position: "top-left", theme: "dark" });
			return;
		}
		if (updating) return;
		setUpdating(true);
		await runTransaction(firestore, async (transaction) => {
			const { problemDoc, userDoc, problemRef, userRef } = await returnUserDataAndProblemData(transaction);
			if (userDoc.exists() && problemDoc.exists()) {
				// already disliked, already liked, not disliked or liked
				if (disliked) {
					transaction.update(userRef, {
						dislikedProblems: userDoc.data().dislikedProblems.filter((id: string) => id !== problem.id),
					});
					transaction.update(problemRef, {
						dislikes: problemDoc.data().dislikes - 1,
					});
					setCurrentProblem((prev) => (prev ? { ...prev, dislikes: prev.dislikes - 1 } : null));
					setData((prev) => ({ ...prev, disliked: false }));
				} else if (liked) {
					transaction.update(userRef, {
						dislikedProblems: [...userDoc.data().dislikedProblems, problem.id],
						likedProblems: userDoc.data().likedProblems.filter((id: string) => id !== problem.id),
					});
					transaction.update(problemRef, {
						dislikes: problemDoc.data().dislikes + 1,
						likes: problemDoc.data().likes - 1,
					});
					setCurrentProblem((prev) =>
						prev ? { ...prev, dislikes: prev.dislikes + 1, likes: prev.likes - 1 } : null
					);
					setData((prev) => ({ ...prev, disliked: true, liked: false }));
				} else {
					transaction.update(userRef, {
						dislikedProblems: [...userDoc.data().dislikedProblems, problem.id],
					});
					transaction.update(problemRef, {
						dislikes: problemDoc.data().dislikes + 1,
					});
					setCurrentProblem((prev) => (prev ? { ...prev, dislikes: prev.dislikes + 1 } : null));
					setData((prev) => ({ ...prev, disliked: true }));
				}
			}
		});
		setUpdating(false);
	};

	/**
	 * Artifact:             handleStar
	 * Description:          Toggles the user's starred status for this problem via a
	 *                       direct Firestore arrayUnion / arrayRemove update.
	 *
	 * Preconditions:        User must be authenticated; updating must be false.
	 * Acceptable Input:     No parameters; reads starred from closure state.
	 * Unacceptable Input:   N/A — called only by button click.
	 *
	 * Postconditions:       "users/{uid}".starredProblems is updated in Firestore;
	 *                       local starred state is updated optimistically.
	 * Return Values:        Promise<void>.
	 *
	 * Error/Exception Conditions:
	 *                       Not authenticated — toast shown, early return.
	 *                       Firestore updateDoc failure — error propagates to console.
	 * Side Effects:         Writes to "users/{uid}" Firestore document (no transaction needed
	 *                       since only the user document is modified).
	 * Invariants:           updating is always reset to false after the operation completes.
	 * Known Faults:         None known.
	 */
	const handleStar = async () => {
		if (!user) {
			toast.error("You must be logged in to star a problem", { position: "top-left", theme: "dark" });
			return;
		}
		if (updating) return;
		setUpdating(true);

		if (!starred) {
			const userRef = doc(firestore, "users", user.uid);
			await updateDoc(userRef, {
				starredProblems: arrayUnion(problem.id),
			});
			setData((prev) => ({ ...prev, starred: true }));
		} else {
			const userRef = doc(firestore, "users", user.uid);
			await updateDoc(userRef, {
				starredProblems: arrayRemove(problem.id),
			});
			setData((prev) => ({ ...prev, starred: false }));
		}

		setUpdating(false);
	};

	return (
		<div className='bg-dark-layer-1'>
			{/* TAB */}
			<div className='flex h-11 w-full items-center pt-2 bg-dark-layer-2 text-white overflow-x-hidden'>
				<div className={"bg-dark-layer-1 rounded-t-[5px] px-5 py-[10px] text-xs cursor-pointer"}>
					Description
				</div>
			</div>

			<div className='flex px-0 py-4 h-[calc(100vh-94px)] overflow-y-auto'>
				<div className='px-5'>
					{/* Problem heading */}
					<div className='w-full'>
						<div className='flex space-x-4'>
							<div className='flex-1 mr-2 text-lg text-white font-medium'>{problem?.title}</div>
						</div>
						{!loading && currentProblem && (
							<div className='flex items-center mt-3'>
								<div
									className={`${problemDifficultyClass} inline-block rounded-[21px] bg-opacity-[.15] px-2.5 py-1 text-xs font-medium capitalize `}
								>
									{currentProblem.difficulty}
								</div>
								{(solved || _solved) && (
									<div className='rounded p-[3px] ml-4 text-lg transition-colors duration-200 text-green-s text-dark-green-s'>
										<BsCheck2Circle />
									</div>
								)}
								<div
									className='flex items-center cursor-pointer hover:bg-dark-fill-3 space-x-1 rounded p-[3px]  ml-4 text-lg transition-colors duration-200 text-dark-gray-6'
									onClick={handleLike}
								>
									{liked && !updating && <AiFillLike className='text-dark-blue-s' />}
									{!liked && !updating && <AiFillLike />}
									{updating && <AiOutlineLoading3Quarters className='animate-spin' />}

									<span className='text-xs'>{currentProblem.likes}</span>
								</div>
								<div
									className='flex items-center cursor-pointer hover:bg-dark-fill-3 space-x-1 rounded p-[3px]  ml-4 text-lg transition-colors duration-200 text-green-s text-dark-gray-6'
									onClick={handleDislike}
								>
									{disliked && !updating && <AiFillDislike className='text-dark-blue-s' />}
									{!disliked && !updating && <AiFillDislike />}
									{updating && <AiOutlineLoading3Quarters className='animate-spin' />}

									<span className='text-xs'>{currentProblem.dislikes}</span>
								</div>
								<div
									className='cursor-pointer hover:bg-dark-fill-3  rounded p-[3px]  ml-4 text-xl transition-colors duration-200 text-green-s text-dark-gray-6 '
									onClick={handleStar}
								>
									{starred && !updating && <AiFillStar className='text-dark-yellow' />}
									{!starred && !updating && <TiStarOutline />}
									{updating && <AiOutlineLoading3Quarters className='animate-spin' />}
								</div>
							</div>
						)}

						{loading && (
							<div className='mt-3 flex space-x-2'>
								<RectangleSkeleton />
								<CircleSkeleton />
								<RectangleSkeleton />
								<RectangleSkeleton />
								<CircleSkeleton />
							</div>
						)}

						{/* Problem Statement(paragraphs) */}
						<div className='text-white text-sm'>
							<div dangerouslySetInnerHTML={{ __html: problem.problemStatement }} />
						</div>

						{/* Examples */}
						<div className='mt-4'>
							{problem.examples.map((example, index) => (
								<div key={example.id}>
									<p className='font-medium text-white '>Example {index + 1}: </p>
									{example.img && <img src={example.img} alt='' className='mt-3' />}
									<div className='example-card'>
										<pre>
											<strong className='text-white'>Input: </strong> {example.inputText}
											<br />
											<strong>Output:</strong>
											{example.outputText} <br />
											{example.explanation && (
												<>
													<strong>Explanation:</strong> {example.explanation}
												</>
											)}
										</pre>
									</div>
								</div>
							))}
						</div>

						 
						{/* Constraints */}
						{/* <div className='my-8 pb-4'>
							<div className='text-white text-sm font-medium'>Constraints:</div>
							<ul className='text-white ml-5 list-disc '>
								<div dangerouslySetInnerHTML={{ __html: problem.constraints }} />
							</ul>
						</div> */}
						<div className='pb-2'></div>
					</div>
				</div>
			</div>
		</div>
	);
};
export default ProblemDescription;

/**
 * Artifact:             useGetCurrentProblem
 * Description:          Custom hook — fetches the live Firestore problem record for a given
 *                       problemId and derives the Tailwind difficulty CSS class string.
 *
 * Preconditions:        Firestore must be initialized; "problems" collection must exist.
 * Acceptable Input:     problemId — non-empty string matching a Firestore document id.
 * Unacceptable Input:   Empty string or id that does not exist in Firestore.
 *
 * Postconditions:       currentProblem holds the DBProblem record; loading is false;
 *                       problemDifficultyClass is set to the appropriate CSS class.
 * Return Values:        { currentProblem: DBProblem | null, loading: boolean,
 *                         problemDifficultyClass: string, setCurrentProblem: Dispatch }.
 *
 * Error/Exception Conditions:
 *                       Firestore getDoc failure propagates as an unhandled rejection.
 *                       Non-existent problemId leaves currentProblem as null.
 * Side Effects:         Reads one Firestore document on mount and on problemId change.
 * Invariants:           loading is true during the fetch and false after it completes.
 * Known Faults:         None known.
 */
function useGetCurrentProblem(problemId: string) {
	const [currentProblem, setCurrentProblem] = useState<DBProblem | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [problemDifficultyClass, setProblemDifficultyClass] = useState<string>("");

	useEffect(() => {
		// Get problem from DB
		// Written by Carlos with help from Claude
		const getCurrentProblem = async () => {
			setLoading(true);
			// Try the legacy "problems" collection first, then fall back to "questions"
			let docSnap = await getDoc(doc(firestore, "problems", problemId));
			if (!docSnap.exists()) {
				docSnap = await getDoc(doc(firestore, "questions", problemId));
			}
			if (docSnap.exists()) {
				const data = docSnap.data();
				// Normalise difficulty to title case ("easy" → "Easy")
				const difficulty =
					data.difficulty
						? data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1).toLowerCase()
						: "";
				const problem = { ...data, difficulty };
				setCurrentProblem({ id: docSnap.id, ...problem } as DBProblem);
				setProblemDifficultyClass(
					difficulty === "Easy"
						? "bg-olive text-olive"
						: difficulty === "Medium"
						? "bg-dark-yellow text-dark-yellow"
						: "bg-dark-pink text-dark-pink"
				);
			}
			setLoading(false);
		};
		getCurrentProblem();
	}, [problemId]);

	return { currentProblem, loading, problemDifficultyClass, setCurrentProblem };
}

/**
 * Artifact:             useGetUsersDataOnProblem
 * Description:          Custom hook — loads the current user's interaction state (liked,
 *                       disliked, starred, solved) for a given problem, resetting on sign-out.
 *
 * Preconditions:        Firebase Auth and Firestore must be initialized.
 * Acceptable Input:     problemId — non-empty string matching a Firestore document id.
 * Unacceptable Input:   Empty string or null problemId.
 *
 * Postconditions:       data reflects the user's current interaction flags for problemId,
 *                       or all-false when no user is authenticated.
 * Return Values:        { liked: boolean, disliked: boolean, starred: boolean,
 *                         solved: boolean, setData: Dispatch }.
 *
 * Error/Exception Conditions:
 *                       If the user Firestore document does not exist, flags remain false.
 * Side Effects:         Reads "users/{uid}" Firestore document when a user is authenticated.
 *                       Resets all flags to false via cleanup on user sign-out or problem change.
 * Invariants:           All four flags are always boolean; never null or undefined.
 * Known Faults:         None known.
 */
function useGetUsersDataOnProblem(problemId: string) {
	const [data, setData] = useState({ liked: false, disliked: false, starred: false, solved: false });
	const [user] = useAuthState(auth);

	useEffect(() => {
		const getUsersDataOnProblem = async () => {
			const userRef = doc(firestore, "users", user!.uid);
			const userSnap = await getDoc(userRef);
			if (userSnap.exists()) {
				const data = userSnap.data();
				const { solvedProblems, likedProblems, dislikedProblems, starredProblems } = data;
				setData({
					liked: likedProblems.includes(problemId), // likedProblems["two-sum","jump-game"]
					disliked: dislikedProblems.includes(problemId),
					starred: starredProblems.includes(problemId),
					solved: solvedProblems.includes(problemId),
				});
			}
		};

		if (user) getUsersDataOnProblem();
		return () => setData({ liked: false, disliked: false, starred: false, solved: false });
	}, [problemId, user]);

	return { ...data, setData };
}
