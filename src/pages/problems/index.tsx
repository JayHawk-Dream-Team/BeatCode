/**
 * Artifact:             pages/problems/index.tsx
 * Description:          Problems library page with sidebar navigation, filters, and problem table
 *                       using Kinetic Monolith design system.
 *
 * Programmer:           Carlos Mbendera (design integration)
 * Date Created:         2026-03-28
 *
 * Preconditions:        Firebase must be configured; Firestore collections must be accessible.
 *                       ProblemsTable component must be available.
 * Acceptable Input:     N/A — no props; data fetched client-side.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       Problems library page with sidebar and main content displayed.
 * Return Values:        React JSX tree.
 *
 * Error/Exception Conditions:
 *                       Firestore fetch errors handled silently by ProblemsTable.
 * Side Effects:         Fetches problems and user data via ProblemsTable.
 * Invariants:           None known.
 * Known Faults:         None known.
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import ProblemsTable from "@/components/ProblemsTable/ProblemsTable";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import { useSetRecoilState } from "recoil";
import { authModalState } from "@/atoms/authModalAtom";
import { GiCrossedSwords } from "react-icons/gi";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { useRouter } from "next/navigation";
import { getRandomProblemNumber, getProblemIdByBeatcodeId } from "@/utils/matchmakingHelpers";

export default function ProblemsLibrary() {
	const [user] = useAuthState(auth);
	const setAuthModalState = useSetRecoilState(authModalState);
	const router = useRouter();
	const [loadingProblems, setLoadingProblems] = useState(true);
	const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
	const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
	const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
	const [showDifficultyDropdown, setShowDifficultyDropdown] = useState(false);
	const [showStatusDropdown, setShowStatusDropdown] = useState(false);
	const [showTopicDropdown, setShowTopicDropdown] = useState(false);
	const difficultyRef = useRef<HTMLDivElement>(null);
	const statusRef = useRef<HTMLDivElement>(null);
	const topicRef = useRef<HTMLDivElement>(null);

	const handleAuthClick = () => {
		setAuthModalState((prev) => ({ ...prev, isOpen: true, type: "login" }));
	};

	const { handleJoinPvP, joiningPvP } = useMatchmaking(handleAuthClick);
	// Close dropdowns when clicking outside
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (difficultyRef.current && !difficultyRef.current.contains(event.target as Node)) {
				setShowDifficultyDropdown(false);
			}
			if (statusRef.current && !statusRef.current.contains(event.target as Node)) {
				setShowStatusDropdown(false);
			}
			if (topicRef.current && !topicRef.current.contains(event.target as Node)) {
				setShowTopicDropdown(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleRandomProblem = async () => {
        try {
            const randomNumber = getRandomProblemNumber();
            const problemId = await getProblemIdByBeatcodeId(randomNumber);
            
            if (problemId) {
                router.push(`/problems/${problemId}`);
            } else {
                console.warn("Problem not found");
                // Optionally show a toast notification
            }
        } catch (err) {
            console.error("Error fetching random problem:", err);
        }
    };

	const difficultyOptions = ["All", "Easy", "Medium", "Hard"];
	const statusOptions = ["All", "Todo", "Solved", "Attempted"];
	const topicOptions = ["All", "Arrays", "Hash Table", "String", "Tree", "Dynamic Programming"];

	return (
		<div style={{ background: 'var(--surface)', color: 'var(--on-surface)', minHeight: '100vh' }}>
			{/* Fixed Header */}
			<header className='fixed top-0 w-full z-50 border-b' style={{ background: 'var(--surface)', borderColor: 'rgba(70, 69, 84, 0.15)' }}>
				<nav className='flex items-center justify-between px-8 py-4 w-full max-w-none'>
					{/* Left: Logo and Nav Links */}
					<div className='flex items-center gap-12'>
                        <Link href='/'>
                            <span className='text-xl font-black tracking-tighter' style={{ color: 'var(--on-surface)' }}>
                                BEATCODE
                            </span>
                        </Link>
						<div className='hidden md:flex items-center gap-8 text-sm font-medium'>
							<Link
								href='/problems'
								className='pb-1 border-b-2'
								style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }}
							>
								Problems
							</Link>
							<a href='#' style={{ color: 'var(--on-surface-variant)' }} className='hover:text-on-surface transition-colors'>
								Contests
							</a>
							<a href='#' style={{ color: 'var(--on-surface-variant)' }} className='hover:text-on-surface transition-colors'>
								Leaderboard
							</a>
						</div>
					</div>

					{/* Right: Search, Sign In, Profile */}
					<div className='flex items-center gap-4'>
						{/* <div className='relative group hidden lg:block'>
							<span className='material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm' style={{ color: 'var(--on-surface-variant)' }}>
								search
							</span>
							<input
								className='rounded-lg pl-10 pr-4 py-2 text-sm w-64 border focus:ring-1 focus:ring-offset-0'
								placeholder='Quick find ctrl+k'
								type='text'
								style={{ background: 'var(--surface-container-highest)', borderColor: 'rgba(70, 69, 84, 0.15)', color: 'var(--on-surface)' }}
							/>
						</div> */}
						{!user && (
                            <Link
                                href='/auth'
                                onClick={() => setAuthModalState((prev) => ({ ...prev, isOpen: true, type: "login" }))}
                            >
                                <button className='text-on-primary-container px-5 py-2 text-sm font-bold rounded-lg shadow-lg active:scale-95 transition-all' style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}>
                                    Sign In
                                </button>
                            </Link>
                        )}
						{user && (
							<>
								<button className='text-on-primary-container px-5 py-2 text-sm font-bold rounded-lg shadow-lg active:scale-95 transition-all' style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}>
									Profile
								</button>
							</>
						)}
					</div>
				</nav>
			</header>

			{/* Main Content */}
			<main className='pt-24 pb-20 px-4 md:px-8 lg:px-12 max-w-[1600px] mx-auto grid grid-cols-12 gap-8'>
				{/* Left Sidebar */}
				<aside className='hidden lg:flex col-span-2 flex-col gap-8 sticky top-24 self-start'>
					{/* Category Filter */}
					<div className='flex flex-col gap-2'>
						<p className='text-xs font-medium uppercase tracking-widest' style={{ color: 'var(--on-surface-variant)' }}>
							Category
						</p>
						<button className='flex items-center gap-3 p-3 rounded-lg text-sm font-semibold transition-all' style={{ background: 'var(--surface-container-high)', color: 'var(--primary)' }}>
							<span>Algorithms</span>
						</button>
					</div>

					{/* Daily Streak Card */}
					{/* <div className='rounded-xl p-6 border' style={{ background: 'var(--surface-container-low)', borderColor: 'rgba(70, 69, 84, 0.15)' }}>
						<h3 className='text-sm font-bold mb-4 flex items-center gap-2'>
							<span style={{ color: 'var(--on-surface)' }}>Daily Streak</span>
						</h3>
						<div className='flex items-end gap-1 mb-4'>
							<div className='h-8 w-1 rounded-full' style={{ background: 'var(--surface-container-highest)' }}></div>
							<div className='h-12 w-1 rounded-full' style={{ background: 'var(--surface-container-highest)' }}></div>
							<div className='h-10 w-1 rounded-full' style={{ background: 'var(--primary)' }}></div>
							<div className='h-16 w-1 rounded-full' style={{ background: 'var(--primary)' }}></div>
							<div className='h-14 w-1 rounded-full' style={{ background: 'var(--primary)' }}></div>
							<div className='h-4 w-1 rounded-full' style={{ background: 'var(--surface-container-highest)' }}></div>
							<div className='h-8 w-1 rounded-full' style={{ background: 'var(--surface-container-highest)' }}></div>
						</div>
						<p className='text-xs' style={{ color: 'var(--on-surface-variant)' }}>
							Current: 14 Days
						</p>
					</div> */}
				</aside>

				{/* Main Content Area */}
				<div className='col-span-12 lg:col-span-10 flex flex-col gap-10'>
					{/* Hero Section */}
					<section className='grid grid-cols-1 md:grid-cols-3 gap-6'>
						{/* Hero Image */}
						<div className='md:col-span-2 relative h-48 rounded-xl overflow-hidden group'>
						<Image
							className='absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
							alt='competitive coding arena'
							src='https://images.unsplash.com/photo-1517694712202-14dd9538aa97?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'
							fill
							/>
							<div className='absolute inset-0 flex flex-col justify-center px-10' style={{ background: 'linear-gradient(to right, var(--surface), transparent)' }}>
								<h2 className='text-3xl font-black tracking-tight mb-2' style={{ color: 'var(--on-surface)' }}>
									CLASH OF LOGIC
								</h2>
								<p className='text-sm mb-6 max-w-sm' style={{ color: 'var(--on-surface-variant)' }}>
									Competitive coding is better with rivals. Join a 1v1 battle arena now.
								</p>
								<div>
									<button 
										onClick={handleJoinPvP}
										disabled={joiningPvP}
										className='text-on-primary-container px-8 py-3 rounded-lg font-bold flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed' 
										style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}
									>
                                        <GiCrossedSwords size={20} />
										{joiningPvP ? "Finding opponent..." : "Join PvP"}
									</button>
								</div>
							</div>
						</div>

						{/* Stats Card */}
						<div className='p-8 rounded-xl flex flex-col justify-between border' style={{ background: 'var(--surface-container)', borderColor: 'rgba(70, 69, 84, 0.1)' }}>
							<div>
								<p className='text-xs font-bold uppercase tracking-widest mb-1' style={{ color: 'var(--tertiary)' }}>
									Solved Today
								</p>
								<h3 className='text-4xl font-black tracking-tighter' style={{ color: 'var(--on-surface)' }}>
									1,248
								</h3>
							</div>
							<div className='flex items-center gap-2 mt-4'>
								<span className='text-xs' style={{ color: 'var(--on-surface-variant)' }}>
									BEATCODE ON TOP!
								</span>
							</div>
						</div>
					</section>

					{/* Problems Section */}
					<section className='flex flex-col gap-6'>
						{/* Filters Bar */}
						<div className='flex flex-wrap items-center justify-between gap-4'>
							<div className='flex flex-wrap items-center gap-3'>
								{/* Difficulty Filter */}
								<div ref={difficultyRef} className='relative'>
									<button
										onClick={() => setShowDifficultyDropdown(!showDifficultyDropdown)}
										className='px-4 py-2 rounded-lg text-sm border flex items-center gap-3 transition-all cursor-pointer'
										style={{ background: 'var(--surface-container-low)', borderColor: 'rgba(70, 69, 84, 0.15)', color: 'var(--on-surface)' }}
									>
										<span style={{ color: 'var(--on-surface-variant)' }}>Difficulty:</span>
										<span style={{ color: 'var(--on-surface)', fontWeight: 'bold' }}>{selectedDifficulty || 'All'}</span>
										{/* <span className='material-symbols-outlined text-xs'>expand_more</span> */}
									</button>
									{showDifficultyDropdown && (
										<div className='absolute top-full left-0 mt-1 rounded-lg shadow-xl z-50 min-w-[150px] border' style={{ background: 'var(--surface-container-high)', borderColor: 'rgba(70, 69, 84, 0.15)' }}>
											{difficultyOptions.map((difficulty) => (
												<button
													key={difficulty}
													onClick={() => {
														setSelectedDifficulty(difficulty === 'All' ? null : difficulty);
														setShowDifficultyDropdown(false);
													}}
													className='block w-full text-left px-4 py-2 transition-all first:rounded-t-lg last:rounded-b-lg text-sm'
													style={{
														background: (difficulty === 'All' && selectedDifficulty === null) || selectedDifficulty === difficulty ? 'var(--surface-container-highest)' : 'transparent',
														color: (difficulty === 'All' && selectedDifficulty === null) || selectedDifficulty === difficulty ? 'var(--on-surface)' : 'var(--on-surface-variant)',
														fontWeight: (difficulty === 'All' && selectedDifficulty === null) || selectedDifficulty === difficulty ? 'bold' : 'normal'
													}}
												>
													{difficulty}
												</button>
											))}
										</div>
									)}
								</div>

								{/* Status Filter */}
								<div ref={statusRef} className='relative'>
									<button
										onClick={() => setShowStatusDropdown(!showStatusDropdown)}
										className='px-4 py-2 rounded-lg text-sm border flex items-center gap-3 transition-all cursor-pointer'
										style={{ background: 'var(--surface-container-low)', borderColor: 'rgba(70, 69, 84, 0.15)', color: 'var(--on-surface)' }}
									>
										<span style={{ color: 'var(--on-surface-variant)' }}>Status:</span>
										<span style={{ color: 'var(--on-surface)', fontWeight: 'bold' }}>{selectedStatus || 'All'}</span>
										{/* <span className='material-symbols-outlined text-xs'>expand_more</span> */}
									</button>
									{showStatusDropdown && (
										<div className='absolute top-full left-0 mt-1 rounded-lg shadow-xl z-50 min-w-[150px] border' style={{ background: 'var(--surface-container-high)', borderColor: 'rgba(70, 69, 84, 0.15)' }}>
											{statusOptions.map((status) => (
												<button
													key={status}
													onClick={() => {
														setSelectedStatus(status === 'All' ? null : status);
														setShowStatusDropdown(false);
													}}
													className='block w-full text-left px-4 py-2 transition-all first:rounded-t-lg last:rounded-b-lg text-sm'
													style={{
														background: (status === 'All' && selectedStatus === null) || selectedStatus === status ? 'var(--surface-container-highest)' : 'transparent',
														color: (status === 'All' && selectedStatus === null) || selectedStatus === status ? 'var(--on-surface)' : 'var(--on-surface-variant)',
														fontWeight: (status === 'All' && selectedStatus === null) || selectedStatus === status ? 'bold' : 'normal'
													}}
												>
													{status}
												</button>
											))}
										</div>
									)}
								</div>

								{/* Topic Filter */}
								<div ref={topicRef} className='relative'>
									<button
										onClick={() => setShowTopicDropdown(!showTopicDropdown)}
										className='px-4 py-2 rounded-lg text-sm border flex items-center gap-3 transition-all cursor-pointer'
										style={{ background: 'var(--surface-container-low)', borderColor: 'rgba(70, 69, 84, 0.15)', color: 'var(--on-surface)' }}
									>
										<span style={{ color: 'var(--on-surface-variant)' }}>Topic:</span>
										<span style={{ color: 'var(--on-surface)', fontWeight: 'bold' }}>{selectedTopic || 'All'}</span>
										{/* <span className='material-symbols-outlined text-xs'>expand_more</span> */}
									</button>
									{showTopicDropdown && (
										<div className='absolute top-full left-0 mt-1 rounded-lg shadow-xl z-50 min-w-[190px] border' style={{ background: 'var(--surface-container-high)', borderColor: 'rgba(70, 69, 84, 0.15)' }}>
											{topicOptions.map((topic) => (
												<button
													key={topic}
													onClick={() => {
														setSelectedTopic(topic === 'All' ? null : topic);
														setShowTopicDropdown(false);
													}}
													className='block w-full text-left px-4 py-2 transition-all first:rounded-t-lg last:rounded-b-lg text-sm'
													style={{
														background: (topic === 'All' && selectedTopic === null) || selectedTopic === topic ? 'var(--surface-container-highest)' : 'transparent',
														color: (topic === 'All' && selectedTopic === null) || selectedTopic === topic ? 'var(--on-surface)' : 'var(--on-surface-variant)',
														fontWeight: (topic === 'All' && selectedTopic === null) || selectedTopic === topic ? 'bold' : 'normal'
													}}
												>
													{topic}
												</button>
											))}
										</div>
									)}
								</div>
							</div>

							{/* Random Pick Button */}
							<>
								<button 
									onClick={handleRandomProblem} 
									className='text-on-primary-container px-5 py-2 text-sm font-bold rounded-lg shadow-lg active:scale-95 transition-all' 
									style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}
								>
									Pick A Random Problem
								</button>
							</>
						</div>

						{/* Problems Table */}
						<div className='rounded-xl overflow-hidden border' style={{ background: 'var(--surface-container)', borderColor: 'rgba(70, 69, 84, 0.15)' }}>
							{/* Loading State */}
							{loadingProblems && (
								<div className='p-8 text-center' style={{ color: 'var(--on-surface-variant)' }}>
									Loading problems...
								</div>
							)}

							{/* Table - Always render to execute hooks */}
							<div className='overflow-x-auto' style={{ display: loadingProblems ? 'none' : 'block' }}>
								<table className='w-full text-left border-collapse'>
									<thead style={{ background: 'var(--surface-container-low)', borderBottom: '1px solid rgba(70, 69, 84, 0.1)' }}>
										<tr>
											<th className='px-8 py-5 text-xs font-bold uppercase tracking-widest w-16 text-center' style={{ color: 'var(--on-surface-variant)' }}>
												Status
											</th>
											<th className='px-6 py-5 text-xs font-bold uppercase tracking-widest' style={{ color: 'var(--on-surface-variant)' }}>
												Title
											</th>
											<th className='px-6 py-5 text-xs font-bold uppercase tracking-widest w-32' style={{ color: 'var(--on-surface-variant)' }}>
												Difficulty
											</th>
											<th className='px-6 py-5 text-xs font-bold uppercase tracking-widest w-32' style={{ color: 'var(--on-surface-variant)' }}>
												Category
											</th>
											<th className='px-6 py-5 text-xs font-bold uppercase tracking-widest w-24' style={{ color: 'var(--on-surface-variant)' }}>
												Action
											</th>
										</tr>
									</thead>
									<ProblemsTable setLoadingProblems={setLoadingProblems} selectedDifficulty={selectedDifficulty} selectedStatus={selectedStatus} selectedTopic={selectedTopic} />
								</table>
							</div>

							{/* Pagination Footer */}
							{!loadingProblems && (
								<div className='px-8 py-4 border-t flex items-center justify-between' style={{ background: 'var(--surface-container-low)', borderColor: 'rgba(70, 69, 84, 0.1)' }}>
									<span className='text-xs' style={{ color: 'var(--on-surface-variant)' }}>
										Showing 1 to 3 of 2,492 problems
									</span>
									<div className='flex gap-2'>
										{/* <button className='p-2 rounded-lg transition-all' style={{ color: 'var(--on-surface-variant)' }}>
											<span className='material-symbols-outlined text-sm'>chevron_left</span>
										</button> */}
										<button className='px-3 py-1 rounded-lg text-xs font-bold' style={{ background: 'var(--primary)', color: 'var(--on-primary-container)' }}>
											1
										</button>
										<button className='px-3 py-1 rounded-lg text-xs font-medium' style={{ color: 'var(--on-surface-variant)' }}>
											2
										</button>
										<button className='px-3 py-1 rounded-lg text-xs font-medium' style={{ color: 'var(--on-surface-variant)' }}>
											3
										</button>
										<button className='p-2 rounded-lg transition-all' style={{ color: 'var(--on-surface-variant)' }}>
											<span className='material-symbols-outlined text-sm'> ... </span>
										</button>
									</div>
								</div>
							)}
						</div>
					</section>
				</div>
			</main>
		</div>
	);
}
