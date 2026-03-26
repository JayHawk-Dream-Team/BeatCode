/**
 * Artifact:             pages/index.tsx
 * Description:          Home page listing all problems — shows an animated loading skeleton
 *                       while Firestore data is fetched, then renders ProblemsTable.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Firebase must be configured; Firestore "problems" collection must
 *                       exist. RecoilRoot must be present (provided by _app.tsx).
 * Acceptable Input:     N/A — no props; data is fetched client-side by ProblemsTable.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       The full problems list is displayed once Firestore loading completes.
 * Return Values:        React JSX tree, or null during SSR before client mount.
 *
 * Error/Exception Conditions:
 *                       Firestore fetch errors are handled silently inside ProblemsTable;
 *                       the table may render empty if the collection is unreachable.
 * Side Effects:         Triggers a Firestore query on mount via ProblemsTable.
 * Invariants:           loadingProblems transitions from true to false exactly once per load;
 *                       the skeleton is shown only while loadingProblems is true.
 * Known Faults:         None known.
 */

import ProblemsTable from "@/components/ProblemsTable/ProblemsTable";
import Topbar from "@/components/Topbar/Topbar";
import useHasMounted from "@/hooks/useHasMounted";

import { useState, useEffect, useRef } from "react";

export default function Home() {
	const [loadingProblems, setLoadingProblems] = useState(true);
	const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
	const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const hasMounted = useHasMounted();

	// Close dropdown when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setShowDifficultyDropdown(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	if (!hasMounted) return null;

	const difficultyOptions = ["All", "Easy", "Medium", "Hard"];

	return (
		<>
			<main className='bg-dark-layer-2 min-h-screen'>
				<Topbar />
				{/* Written by Carlos with help from Claude */}
				<h1 className='text-2xl text-center text-gray-700 dark:text-gray-400 font-medium uppercase mt-10 mb-2'>
					Rock Chalk, Code Up
				</h1>
				<p className='text-center text-gray-500 dark:text-gray-500 text-sm mb-5'>
					University of Kansas &middot; EECS 582 &middot; BeatCode
				</p>
				<div className='relative overflow-x-auto mx-auto px-6 pb-10'>
					{loadingProblems && (
						<div className='max-w-[1200px] mx-auto sm:w-7/12 w-full animate-pulse'>
							{[...Array(10)].map((_, idx) => (
								<LoadingSkeleton key={idx} />
							))}
						</div>
					)}
					<table className='text-sm text-left text-gray-500 dark:text-gray-400 sm:w-7/12 w-full max-w-[1200px] mx-auto'>
						{!loadingProblems && (
							<thead className='text-xs text-gray-700 uppercase dark:text-gray-400 border-b '>
								<tr>
									<th scope='col' className='px-1 py-3 w-0 font-medium'>
										Status
									</th>
									<th scope='col' className='px-6 py-3 w-0 font-medium'>
										Title
									</th>
									<th scope='col' className='px-6 py-3 w-0 font-medium relative'>
										<div ref={dropdownRef} className='relative inline-block'>
											<button
												onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
												className='flex items-center gap-2 hover:text-gray-300 transition-colors'
											>
												Difficulty
												<svg
													className={`w-4 h-4 transition-transform ${showDifficultyDropdown ? 'rotate-180' : ''}`}
													fill='none'
													stroke='currentColor'
													viewBox='0 0 24 24'
												>
													<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 14l-7 7m0 0l-7-7m7 7V3' />
												</svg>
											</button>
											{showDifficultyDropdown && (
												<div
													className='absolute top-full left-0 mt-1 bg-dark-layer-1 border border-gray-600 rounded shadow-lg z-50'
													onClick={(e) => e.stopPropagation()}
												>
													{difficultyOptions.map((difficulty) => (
														<button
															key={difficulty}
															onClick={() => {
																setSelectedDifficulty(difficulty === "All" ? null : difficulty);
																setShowDifficultyDropdown(false);
															}}
															className={`block w-full text-left px-4 py-2 hover:bg-dark-fill-2 transition-colors ${
																(difficulty === "All" && selectedDifficulty === null) ||
																selectedDifficulty === difficulty
																	? "bg-dark-fill-3 text-gray-100"
																	: "text-gray-400"
															}`}
														>
															{difficulty}
														</button>
													))}
												</div>
											)}
										</div>
									</th>

									<th scope='col' className='px-6 py-3 w-0 font-medium'>
										Category
									</th>
									<th scope='col' className='px-6 py-3 w-0 font-medium'>
										Solution
									</th>
								</tr>
							</thead>
						)}
						<ProblemsTable setLoadingProblems={setLoadingProblems} selectedDifficulty={selectedDifficulty} />
					</table>
				</div>
			</main>
		</>
	);
}

const LoadingSkeleton = () => {
	return (
		<div className='flex items-center space-x-12 mt-4 px-6'>
			<div className='w-6 h-6 shrink-0 rounded-full bg-dark-layer-1'></div>
			<div className='h-4 sm:w-52  w-32  rounded-full bg-dark-layer-1'></div>
			<div className='h-4 sm:w-52  w-32 rounded-full bg-dark-layer-1'></div>
			<div className='h-4 sm:w-52 w-32 rounded-full bg-dark-layer-1'></div>
			<span className='sr-only'>Loading...</span>
		</div>
	);
};
