/**
 * Artifact:             Logout.tsx
 * Description:          Sign-out button rendered in the Topbar for authenticated users —
 *                       calls Firebase signOut and lets react-firebase-hooks propagate the
 *                       auth state change to all listening components.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Firebase Auth must be initialized. The user should currently be
 *                       signed in (component is only rendered when user is authenticated).
 * Acceptable Input:     No props.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       Firebase session is terminated; useAuthState throughout the app
 *                       receives null, causing auth-gated UI to update on next render.
 * Return Values:        React JSX of the logout button element.
 *
 * Error/Exception Conditions:
 *                       Firebase signOut errors are available in the `error` variable
 *                       from useSignOut but are not currently handled or displayed to the user.
 * Side Effects:         Calls Firebase signOut on button click, invalidating the user session.
 * Invariants:           None.
 * Known Faults:         Sign-out errors are silently ignored with no user feedback.
 */

import { auth } from "@/firebase/firebase";
import React from "react";
import { useSignOut } from "react-firebase-hooks/auth";
import { FiLogOut } from "react-icons/fi";

const Logout: React.FC = () => {
	const [signOut, loading, error] = useSignOut(auth);

	const handleLogout = () => {
		signOut();
	};
	return (
		<button className='bg-dark-fill-3 py-1.5 px-3 cursor-pointer rounded text-brand-orange' onClick={handleLogout}>
			<FiLogOut />
		</button>
	);
};
export default Logout;
