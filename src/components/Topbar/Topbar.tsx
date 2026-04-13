/**
 * Artifact:             Topbar.tsx
 * Description:          Navigation bar shared across all pages — shows the logo and auth
 *                       controls always; adds prev/next problem navigation and a timer
 *                       when rendered in problem page mode.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Firebase Auth must be initialized. /public/logo-full.png and
 *                       /public/avatar.png must exist. On problem pages, router.query.pid
 *                       must be a valid key in the problems map.
 * Acceptable Input:     problemPage — optional boolean prop; true on /problems/[pid] pages.
 * Unacceptable Input:   Using Topbar in problem page mode without a valid pid in the router.
 *
 * Postconditions:       Navigation bar is rendered with correct auth state and context controls.
 * Return Values:        React JSX of the navigation bar element.
 *
 * Error/Exception Conditions:
 *                       handleProblemChange throws if problems[router.query.pid] is undefined
 *                       (no null guard — assumes pid is always valid on problem pages).
 * Side Effects:         Calls router.push() to navigate between problems.
 *                       Sets authModalState.isOpen to trigger the auth modal on Sign In click.
 * Invariants:           Navigation always wraps around: next after last goes to first,
 *                       and prev before first goes to last.
 * Known Faults:         "Premium" link points to an external personal buymeacoffee page,
 *                       a leftover artifact from the original tutorial codebase.
 */

import { auth } from "@/firebase/firebase";
import Link from "next/link";
import React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import Logout from "../Buttons/Logout";
import { useSetRecoilState, useRecoilState } from "recoil";
import { authModalState } from "@/atoms/authModalAtom";
import { audioMutedAtom } from "@/atoms/audioAtom";
import Image from "next/image";
import { FaChevronLeft, FaChevronRight, FaVolumeUp, FaVolumeMute } from "react-icons/fa";
import { BsList } from "react-icons/bs";
import Timer from "../Timer/Timer";
import { useRouter } from "next/router";
import { problems } from "@/utils/problems";
import { Problem } from "@/utils/types/problem";

type TopbarProps = {
	problemPage?: boolean;
};

const Topbar: React.FC<TopbarProps> = ({ problemPage }) => {
	const [user] = useAuthState(auth);
	const setAuthModalState = useSetRecoilState(authModalState);
	const [muted, setMuted] = useRecoilState(audioMutedAtom);
	const router = useRouter();
	const { matchId } = router.query;

	/**
	 * Artifact:             handleProblemChange
	 * Description:          Navigates to the next or previous problem by order number,
	 *                       wrapping around at both ends of the problem list.
	 *
	 * Preconditions:        router.query.pid must be a valid key in the problems map.
	 *                       problems map must have contiguous order values starting at 1.
	 * Acceptable Input:     isForward — boolean; true navigates forward, false navigates back.
	 * Unacceptable Input:   N/A — called only by button click with a hardcoded boolean.
	 *
	 * Postconditions:       Router navigates to /problems/{nextProblemKey}.
	 * Return Values:        void.
	 *
	 * Error/Exception Conditions:
	 *                       Throws if problems[router.query.pid] is undefined (no null guard).
	 * Side Effects:         Calls router.push() to navigate to the adjacent problem page.
	 * Invariants:           Wrap-around always lands on the first or last problem respectively.
	 * Known Faults:         No null check on problems[router.query.pid]; crashes on invalid pid.
	 */
	const handleProblemChange = (isForward: boolean) => {
		const { order } = problems[router.query.pid as string] as Problem;
		const direction = isForward ? 1 : -1;
		const nextProblemOrder = order + direction;
		const nextProblemKey = Object.keys(problems).find((key) => problems[key].order === nextProblemOrder);

		if (isForward && !nextProblemKey) {
			const firstProblemKey = Object.keys(problems).find((key) => problems[key].order === 1);
			router.push(`/problems/${firstProblemKey}`);
		} else if (!isForward && !nextProblemKey) {
			const lastProblemKey = Object.keys(problems).find(
				(key) => problems[key].order === Object.keys(problems).length
			);
			router.push(`/problems/${lastProblemKey}`);
		} else {
			router.push(`/problems/${nextProblemKey}`);
		}
	};

	return (
		<nav className='relative flex h-[50px] w-full shrink-0 items-center px-5' style={{ background: 'var(--surface)', color: 'var(--on-surface)' }}>
			<div className={`flex w-full items-center justify-between ${!problemPage ? "max-w-[1200px] mx-auto" : ""}`}>
				{/* Written by Carlos with help from Claude */}
				<div className='flex items-center gap-6 flex-1'>
					<Link href='/' className='flex items-center gap-2'>
						{/* <Image src='/jayhawk-logo.svg' alt='BeatCode' height={36} width={36} /> */}
						<span className='text-xl font-black tracking-tighter' style={{ color: 'var(--on-surface)' }}>
                                BEATCODE
                        </span>
					</Link>
				</div>

				{problemPage && (
					<div className='flex items-center gap-4 flex-1 justify-center'>
						<div
							className='flex items-center justify-center rounded h-8 w-8 cursor-pointer'
							onClick={() => handleProblemChange(false)}
							style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
						>
							<FaChevronLeft />
						</div>
						<Link
							href='/problems'
							className='flex items-center gap-2 font-medium max-w-[170px] cursor-pointer'
							style={{ color: 'var(--on-surface-variant)' }}
						>
							<div>
								<BsList />
							</div>
							<p>Problem List</p>
						</Link>
						<div
							className='flex items-center justify-center rounded h-8 w-8 cursor-pointer'
							onClick={() => handleProblemChange(true)}
							style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
						>
							<FaChevronRight />
						</div>
					</div>
				)}

				<div className='flex items-center space-x-4 flex-1 justify-end'>
					<button
						onClick={() => setMuted((m) => !m)}
						title={muted ? "Unmute music" : "Mute music"}
						className='flex items-center justify-center rounded h-8 w-8 cursor-pointer'
						style={{ background: 'var(--surface-container)', color: 'var(--on-surface-variant)' }}
					>
						{muted ? <FaVolumeMute size={16} /> : <FaVolumeUp size={16} />}
					</button>
					{problemPage && matchId && (
						<div style={{ background: 'var(--error)', color: 'var(--on-surface)', padding: '0.25rem 0.75rem', borderRadius: '0.375rem', marginRight: '0.5rem', fontSize: '0.875rem' }}>In Match</div>
					)}
					{!problemPage && (
						<Link href='/problems' className='font-medium' style={{ color: 'var(--on-surface-variant)' }}>
							Problems
						</Link>
					)}
					{!problemPage && (
						<Link href='/tournaments' className='font-medium' style={{ color: 'var(--on-surface-variant)' }}>
							Tournaments
						</Link>
					)}
					{!user && (
						<Link
							href='/auth'
							onClick={() => setAuthModalState((prev) => ({ ...prev, isOpen: true, type: "login" }))}
						>
							<button className='py-1 px-2 cursor-pointer rounded' style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', color: 'var(--on-primary-container)' }}>Sign In</button>
						</Link>
					)}
					{user && problemPage && <Timer />}
					{user && (
						<Link href='/profile'>
                            <div className='cursor-pointer group relative'>
                                <Image src='/avatar.png' alt='Avatar' width={30} height={30} className='rounded-full' />
                                <div
                                    className='absolute top-10 left-2/4 -translate-x-2/4 mx-auto p-2 rounded shadow-lg z-40'
                                    style={{ background: 'var(--surface-container)', color: 'var(--secondary)', transform: 'scale(0)', transition: 'transform 200ms ease-in-out' }}
                                >
                                    <p className='text-sm' style={{ color: 'var(--on-surface)' }}>{user.email}</p>
                                </div>
                            </div>
                        </Link>
					)}
					{user && <Logout />}
				</div>
			</div>
		</nav>
	);
};
export default Topbar;
