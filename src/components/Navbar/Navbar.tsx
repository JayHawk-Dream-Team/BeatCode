/**
 * Artifact:             Navbar.tsx
 * Description:          Minimal navigation bar used exclusively on the /auth landing page —
 *                       shows the logo and a Sign In button that opens the auth modal.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        RecoilRoot must be present in the component tree.
 *                       /public/logo.png must exist as a static asset.
 * Acceptable Input:     No props.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       The auth modal is opened (isOpen: true) when Sign In is clicked.
 * Return Values:        React JSX of the navbar element.
 *
 * Error/Exception Conditions:
 *                       None.
 * Side Effects:         Sets authModalState.isOpen to true on Sign In button click;
 *                       the AuthModal itself is rendered by the parent auth page.
 * Invariants:           This component never renders the auth modal directly.
 * Known Faults:         None known.
 */

import { authModalState } from "@/atoms/authModalAtom";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import { useSetRecoilState } from "recoil";
type NavbarProps = {};

const Navbar: React.FC<NavbarProps> = () => {
	const setAuthModalState = useSetRecoilState(authModalState);
	const handleClick = () => {
		setAuthModalState((prev) => ({ ...prev, isOpen: true }));
	};
	return (
		<div className='flex items-center justify-between sm:px-12 px-2 md:px-24' style={{ background: 'var(--surface)', color: 'var(--on-surface)' }}>
			<Link href='/' className='flex items-center gap-3 h-20'>
				<Image src='/beatcode_logo.png' alt='BeatCode' height={64} width={64} />
				<span style={{ color: 'var(--on-surface)', fontWeight: 700, fontSize: '1.25rem', letterSpacing: '0.02em' }}>BeatCode</span>
			</Link>
			<div className='flex items-center'>
				<button
					className='px-2 py-1 sm:px-4 rounded-md text-sm font-medium transition-colors'
					onClick={handleClick}
					style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))', color: 'var(--on-primary-container)', border: 'none' }}
				>
					Sign In
				</button>
			</div>
		</div>
	);
};
export default Navbar;
