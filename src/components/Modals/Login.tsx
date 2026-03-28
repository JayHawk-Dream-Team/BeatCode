/**
 * Artifact:             Login.tsx
 * Description:          Email/password login form rendered inside AuthModal — authenticates
 *                       via Firebase and redirects to the home page on success.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Firebase Auth must be initialized. RecoilRoot must be present.
 * Acceptable Input:     email — valid email format string; password — non-empty string.
 * Unacceptable Input:   Empty email or password field (caught before submission);
 *                       wrong credentials (rejected by Firebase with error toast).
 *
 * Postconditions:       On success, the user is authenticated and redirected to "/".
 * Return Values:        React JSX of the login form.
 *
 * Error/Exception Conditions:
 *                       Empty fields — browser alert before submission.
 *                       Firebase errors (wrong password, user not found) — toast error.
 *                       Firebase hook errors — surfaced via useEffect toast.
 * Side Effects:         Calls Firebase signInWithEmailAndPassword on form submit.
 *                       Calls router.push("/") on successful authentication.
 *                       Updates authModalState.type to switch between modal views.
 * Invariants:           inputs.email and inputs.password are always controlled string values.
 * Known Faults:         Uses browser alert() for empty-field validation, inconsistent with
 *                       the toast-based error handling used for Firebase errors.
 */

import { authModalState } from "@/atoms/authModalAtom";
import { auth } from "@/firebase/firebase";
import { useRouter } from "next/router";
import React, { useEffect, useState } from "react";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import { useSetRecoilState } from "recoil";
import { toast } from "react-toastify";
type LoginProps = {};

const Login: React.FC<LoginProps> = () => {
	const setAuthModalState = useSetRecoilState(authModalState);
	const handleClick = (type: "login" | "register" | "forgotPassword") => {
		setAuthModalState((prev) => ({ ...prev, type }));
	};
	const [inputs, setInputs] = useState({ email: "", password: "" });
	const [signInWithEmailAndPassword, user, loading, error] = useSignInWithEmailAndPassword(auth);
	const router = useRouter();
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	/**
	 * Artifact:             handleLogin
	 * Description:          Validates form inputs and submits email/password credentials
	 *                       to Firebase Auth, redirecting to home on success.
	 *
	 * Preconditions:        inputs.email and inputs.password must be non-empty strings.
	 * Acceptable Input:     e — React form submit event; reads email/password from state.
	 * Unacceptable Input:   Empty email or password (guarded by alert before Firebase call).
	 *
	 * Postconditions:       User is authenticated and router navigates to "/" on success.
	 * Return Values:        Promise<void>.
	 *
	 * Error/Exception Conditions:
	 *                       Empty fields — alert shown, function returns early.
	 *                       Firebase auth failure — toast error shown.
	 * Side Effects:         Calls Firebase signInWithEmailAndPassword. Calls router.push("/").
	 * Invariants:           e.preventDefault() always called to suppress form reload.
	 * Known Faults:         None known.
	 */
	const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!inputs.email || !inputs.password) return alert("Please fill all fields");
		try {
			const newUser = await signInWithEmailAndPassword(inputs.email, inputs.password);
			if (!newUser) return;
			router.push("/");
		} catch (error: any) {
			toast.error(error.message, { position: "top-center", autoClose: 3000, theme: "dark" });
		}
	};

	useEffect(() => {
		if (error) toast.error(error.message, { position: "top-center", autoClose: 3000, theme: "dark" });
	}, [error]);
	return (
		<form className='space-y-6 px-6 pb-4' onSubmit={handleLogin}>
			<h3 className='text-xl font-bold text-on-surface'>Welcome Back</h3>
			<div className='space-y-2'>
				<label htmlFor='email' className='text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1'>
					Identity
				</label>
				<input
					onChange={handleInputChange}
					type='email'
					name='email'
					id='email'
					className='w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-on-surface placeholder:text-outline transition-all focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-high'
					placeholder='email@example.com'
				/>
			</div>
			<div className='space-y-2'>
				<div className='flex justify-between items-center px-1'>
					<label htmlFor='password' className='text-xs font-bold uppercase tracking-widest text-on-surface-variant'>
						Protocol
					</label>
					<a className='text-xs font-bold uppercase tracking-widest text-primary hover:text-primary-container transition-colors cursor-pointer' onClick={() => handleClick("forgotPassword")}>
						Recover?
					</a>
				</div>
				<input
					onChange={handleInputChange}
					type='password'
					name='password'
					id='password'
					className='w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-on-surface placeholder:text-outline transition-all focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-high'
					placeholder='••••••••'
				/>
			</div>

			<button
				type='submit'
				className='w-full py-3.5 rounded-lg text-on-primary-container font-bold text-sm tracking-wide uppercase shadow-lg active:scale-[0.98] transition-all duration-150 hover:brightness-110'
				style={{ background: "linear-gradient(135deg, var(--primary), var(--primary-container))" }}
			>
				{loading ? "Loading..." : "Sign In"}
			</button>

			{/* External Authentication Divider */}
			<div className='relative my-8'>
				<div className='absolute inset-0 flex items-center'>
					<div className='w-full border-t' style={{ borderColor: "rgba(70, 69, 84, 0.15)" }}></div>
				</div>
			</div>

			{/* Social Authentication Buttons */}

			<div className='text-xs font-bold uppercase tracking-widest text-on-surface-variant text-center pt-2'>
				Not Registered?{" "}
				<a href='#' className='text-primary font-bold hover:underline cursor-pointer' onClick={() => handleClick("register")}>
					Create Account
				</a>
			</div>
		</form>
	);
};
export default Login;
