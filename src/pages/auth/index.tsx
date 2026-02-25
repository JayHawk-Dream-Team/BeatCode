/**
 * Artifact:             pages/auth/index.tsx
 * Description:          Authentication landing page at /auth — displays a hero image and
 *                       Navbar. Redirects authenticated users to home; renders AuthModal
 *                       when authModalState.isOpen is true.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Firebase Auth must be initialized. RecoilRoot must be present.
 *                       /public/hero.png must exist as a static asset.
 * Acceptable Input:     N/A — no props; auth state is read from Firebase via useAuthState.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       Authenticated users are immediately redirected to "/".
 *                       Unauthenticated users see the landing page with auth controls.
 * Return Values:        React JSX tree or null (while Firebase auth is loading or redirecting).
 *
 * Error/Exception Conditions:
 *                       Firebase auth hook errors are available in the `error` variable
 *                       from useAuthState but are not currently handled or displayed.
 * Side Effects:         Calls router.push("/") when a logged-in user visits this page.
 * Invariants:           AuthModal is only mounted when authModal.isOpen is true.
 * Known Faults:         None known.
 */

import { authModalState } from "@/atoms/authModalAtom";
import AuthModal from "@/components/Modals/AuthModal";
import Navbar from "@/components/Navbar/Navbar";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebase/firebase";
import { useRecoilValue } from "recoil";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";
type AuthPageProps = {};

const AuthPage: React.FC<AuthPageProps> = () => {
	const authModal = useRecoilValue(authModalState);
	const [user, loading, error] = useAuthState(auth);
	const [pageLoading, setPageLoading] = useState(true);
	const router = useRouter();

	useEffect(() => {
		if (user) router.push("/");
		if (!loading && !user) setPageLoading(false);
	}, [user, router, loading]);

	if (pageLoading) return null;

	return (
		<div className='bg-gradient-to-b from-gray-600 to-black h-screen relative'>
			<div className='max-w-7xl mx-auto'>
				<Navbar />
				<div className='flex items-center justify-center h-[calc(100vh-5rem)] pointer-events-none select-none'>
					<Image src='/hero.png' alt='Hero img' width={700} height={700} />
				</div>
				{authModal.isOpen && <AuthModal />}
			</div>
		</div>
	);
};
export default AuthPage;
