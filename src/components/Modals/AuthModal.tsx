/**
 * Artifact:             AuthModal.tsx
 * Description:          Modal container that renders Login, Signup, or ResetPassword based
 *                       on authModalState.type, with a semi-transparent backdrop overlay.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        RecoilRoot must be present. authModalState.isOpen must be true
 *                       for the modal to be rendered (controlled by parent components).
 * Acceptable Input:     No props; reads authModalState.type from Recoil.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       The appropriate auth form view is displayed based on type.
 *                       Closing (backdrop click or Escape) resets type to "login".
 * Return Values:        React JSX of the backdrop overlay and centered modal card.
 *
 * Error/Exception Conditions:
 *                       Errors inside Login, Signup, or ResetPassword propagate upward.
 * Side Effects:         Registers and removes a keydown listener for Escape on mount.
 *                       Clicking the backdrop calls closeModal to update Recoil state.
 * Invariants:           authModal.type is always "login" after the modal is closed.
 * Known Faults:         None known.
 */

import { authModalState } from "@/atoms/authModalAtom";
import React, { useEffect } from "react";
import { IoClose } from "react-icons/io5";
import Login from "./Login";
import ResetPassword from "./ResetPassword";
import Signup from "./Signup";
import { useRecoilValue, useSetRecoilState } from "recoil";

type AuthModalProps = {};

const AuthModal: React.FC<AuthModalProps> = () => {
	const authModal = useRecoilValue(authModalState);
	const closeModal = useCloseModal();
	return (
		<>
			<div
				className='absolute top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-60'
				onClick={closeModal}
			></div>
			<div className='w-full sm:w-[450px]  absolute top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]  flex justify-center items-center'>
				<div className='relative w-full h-full mx-auto flex items-center justify-center'>
					<div className='bg-white rounded-lg shadow relative w-full bg-gradient-to-b from-brand-orange to-slate-900 mx-6'>
						<div className='flex justify-end p-2'>
							<button
								type='button'
								className='bg-transparent  rounded-lg text-sm p-1.5 ml-auto inline-flex items-center hover:bg-gray-800 hover:text-white text-white'
								onClick={closeModal}
							>
								<IoClose className='h-5 w-5' />
							</button>
						</div>
						{authModal.type === "login" ? <Login /> : authModal.type === "register" ? <Signup /> : <ResetPassword />}
					</div>
				</div>
			</div>
		</>
	);
};
export default AuthModal;

/**
 * Artifact:             useCloseModal
 * Description:          Custom hook returning a close handler that resets authModalState
 *                       and attaches an Escape keydown listener for keyboard dismissal.
 *
 * Preconditions:        RecoilRoot must be present; authModalState atom must be registered.
 * Acceptable Input:     No parameters.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       closeModal is stable across renders; Escape listener is registered.
 * Return Values:        closeModal — () => void function that sets isOpen: false, type: "login".
 *
 * Error/Exception Conditions:
 *                       None.
 * Side Effects:         Registers a keydown listener on window on mount; removes it on unmount.
 *                       Calling the returned closeModal updates Recoil authModalState.
 * Invariants:           The Escape listener is attached exactly once per modal mount.
 * Known Faults:         None known.
 */
function useCloseModal() {
	const setAuthModal = useSetRecoilState(authModalState);

	const closeModal = () => {
		setAuthModal((prev) => ({ ...prev, isOpen: false, type: "login" }));
	};

	useEffect(() => {
		const handleEsc = (e: KeyboardEvent) => {
			if (e.key === "Escape") closeModal();
		};
		window.addEventListener("keydown", handleEsc);
		return () => window.removeEventListener("keydown", handleEsc);
	}, []);

	return closeModal;
}
