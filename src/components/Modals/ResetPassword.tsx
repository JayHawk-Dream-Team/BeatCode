/**
 * Artifact:             ResetPassword.tsx
 * Description:          Password reset form rendered inside AuthModal — sends a Firebase
 *                       password reset email and confirms success via toast notification.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Firebase Auth must be initialized. Email/Password sign-in provider
 *                       must be enabled in the Firebase project.
 * Acceptable Input:     email — string in valid email format registered with Firebase Auth.
 * Unacceptable Input:   Empty email string; email not registered in Firebase (yields error).
 *
 * Postconditions:       Firebase dispatches a password reset email to the provided address.
 * Return Values:        React JSX of the reset password form.
 *
 * Error/Exception Conditions:
 *                       Firebase errors (invalid email, user not found) — surfaced via alert().
 * Side Effects:         Calls Firebase sendPasswordResetEmail on form submit.
 *                       Shows a success toast on confirmation from Firebase.
 * Invariants:           No redirect or modal state change occurs after submission; the user
 *                       must close the modal manually after the reset email is sent.
 * Known Faults:         Firebase does not distinguish "email not found" from success (by design
 *                       for security), so the user may not know if the address is unregistered.
 *                       Errors surfaced via alert() rather than toast (inconsistent UX).
 */

import { auth } from "@/firebase/firebase";
import React, { useState, useEffect } from "react";
import { useSendPasswordResetEmail } from "react-firebase-hooks/auth";
import { toast } from "react-toastify";
type ResetPasswordProps = {};

const ResetPassword: React.FC<ResetPasswordProps> = () => {
	const [email, setEmail] = useState("");
	const [sendPasswordResetEmail, sending, error] = useSendPasswordResetEmail(auth);
	const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const success = await sendPasswordResetEmail(email);
		if (success) {
			toast.success("Password reset email sent", { position: "top-center", autoClose: 3000, theme: "dark" });
		}
	};

	useEffect(() => {
		if (error) {
			alert(error.message);
		}
	}, [error]);
	return (
		<form className='space-y-6 px-6 lg:px-8 pb-4 sm:pb-6 xl:pb-8' onSubmit={handleReset}>
			<h3 className='text-xl font-medium  text-white'>Reset Password</h3>
			<p className='text-sm text-white '>
				Forgotten your password? Enter your e-mail address below, and we&apos;ll send you an e-mail allowing you
				to reset it.
			</p>
			<div>
				<label htmlFor='email' className='text-sm font-medium block mb-2 text-gray-300'>
					Your email
				</label>
				<input
					type='email'
					name='email'
					onChange={(e) => setEmail(e.target.value)}
					id='email'
					className='border-2 outline-none sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 bg-gray-600 border-gray-500 placeholder-gray-400 text-white'
					placeholder='name@company.com'
				/>
			</div>

			<button
				type='submit'
				className={`w-full text-white  focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center 
                bg-brand-orange hover:bg-brand-orange-s `}
			>
				Reset Password
			</button>
		</form>
	);
};
export default ResetPassword;
