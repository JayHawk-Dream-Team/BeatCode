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
import { authModalState } from "@/atoms/authModalAtom";
import { useSetRecoilState } from "recoil";

type ResetPasswordProps = {};

const ResetPassword: React.FC<ResetPasswordProps> = () => {
	const [email, setEmail] = useState("");
	const [sendPasswordResetEmail, sending, error] = useSendPasswordResetEmail(auth);
	const setAuthModalState = useSetRecoilState(authModalState);

	const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const success = await sendPasswordResetEmail(email);
		if (success) {
			toast.success("Password reset email sent", { position: "top-center", autoClose: 3000, theme: "dark" });
			setAuthModalState((prev) => ({ ...prev, type: "login" }));
		}
	};

	const handleBackClick = () => {
		setAuthModalState((prev) => ({ ...prev, type: "login" }));
	};

	useEffect(() => {
		if (error) {
			toast.error(error.message, { position: "top-center", autoClose: 3000, theme: "dark" });
		}
	}, [error]);

	return (
		<form className='space-y-6 px-6 pb-4' onSubmit={handleReset}>
			<div className='flex items-center justify-between'>
				<h3 className='text-xl font-bold text-on-surface'>Reset Access</h3>
				<button
					type='button'
					className='text-xs font-bold uppercase tracking-widest text-primary hover:text-primary-container transition-colors cursor-pointer'
					onClick={handleBackClick}
				>
					← Back
				</button>
			</div>
			<p className='text-sm text-on-surface-variant'>
				Forgotten your protocol? Enter your identity below, and we&apos;ll send you a recovery link.
			</p>
			<div>
				<label htmlFor='email' className='text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1 block mb-2'>
					Identity
				</label>
				<input
					type='email'
					name='email'
					onChange={(e) => setEmail(e.target.value)}
					id='email'
					className='w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-on-surface placeholder:text-outline transition-all focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-high'
					placeholder='email@example.com'
				/>
			</div>

			<button
				type='submit'
				className='w-full py-3.5 rounded-lg text-on-primary-container font-bold text-sm tracking-wide uppercase shadow-lg active:scale-[0.98] transition-all duration-150 hover:brightness-110'
				style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}
			>
				{sending ? "Sending..." : "Send Reset Link"}
			</button>
		</form>
	);
};
export default ResetPassword;
