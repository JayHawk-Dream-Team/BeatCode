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
import { useSetRecoilState } from "recoil";
import { authModalState } from "@/atoms/authModalAtom";
import Image from "next/image";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
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
	const router = useRouter();

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
		<nav className='relative flex h-[50px] w-full shrink-0 items-center px-5 bg-dark-layer-1 text-dark-gray-7'>
			<div className={`flex w-full items-center justify-between ${!problemPage ? "max-w-[1200px] mx-auto" : ""}`}>
				<Link href='/' className='h-[22px] flex-1'>
					<Image src='/logo-full.png' alt='Logo' height={100} width={100} />
				</Link>

				{problemPage && (
					<div className='flex items-center gap-4 flex-1 justify-center'>
						<div
							className='flex items-center justify-center rounded bg-dark-fill-3 hover:bg-dark-fill-2 h-8 w-8 cursor-pointer'
							onClick={() => handleProblemChange(false)}
						>
							<FaChevronLeft />
						</div>
						<Link
							href='/'
							className='flex items-center gap-2 font-medium max-w-[170px] text-dark-gray-8 cursor-pointer'
						>
							<div>
								<BsList />
							</div>
							<p>Problem List</p>
						</Link>
						<div
							className='flex items-center justify-center rounded bg-dark-fill-3 hover:bg-dark-fill-2 h-8 w-8 cursor-pointer'
							onClick={() => handleProblemChange(true)}
						>
							<FaChevronRight />
						</div>
					</div>
				)}

				<div className='flex items-center space-x-4 flex-1 justify-end'>
					<div>
						<a
							href='https://www.buymeacoffee.com/burakorkmezz'
							target='_blank'
							rel='noreferrer'
							className='bg-dark-fill-3 py-1.5 px-3 cursor-pointer rounded text-brand-orange hover:bg-dark-fill-2'
						>
							Premium
						</a>
					</div>
					{!user && (
						<Link
							href='/auth'
							onClick={() => setAuthModalState((prev) => ({ ...prev, isOpen: true, type: "login" }))}
						>
							<button className='bg-dark-fill-3 py-1 px-2 cursor-pointer rounded '>Sign In</button>
						</Link>
					)}
					{user && problemPage && <Timer />}
					{user && (
						<div className='cursor-pointer group relative'>
							<Image src='/avatar.png' alt='Avatar' width={30} height={30} className='rounded-full' />
							<div
								className='absolute top-10 left-2/4 -translate-x-2/4  mx-auto bg-dark-layer-1 text-brand-orange p-2 rounded shadow-lg 
								z-40 group-hover:scale-100 scale-0 
								transition-all duration-300 ease-in-out'
							>
								<p className='text-sm'>{user.email}</p>
							</div>
						</div>
					)}
					{user && <Logout />}
				</div>
			</div>
		</nav>
	);
};
export default Topbar;
