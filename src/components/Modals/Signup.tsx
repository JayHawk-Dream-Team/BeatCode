/**
 * Artifact:             Signup.tsx
 * Description:          User registration form rendered inside AuthModal — creates a Firebase
 *                       Auth account and a matching Firestore user document on success.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Firebase Auth and Firestore must be initialized. RecoilRoot present.
 * Acceptable Input:     email — valid email string; displayName — non-empty string;
 *                       password — string meeting Firebase's minimum password requirements.
 * Unacceptable Input:   Empty fields (caught by alert); weak password (rejected by Firebase);
 *                       already-registered email (rejected by Firebase with error toast).
 *
 * Postconditions:       New Firebase Auth account exists; Firestore "users/{uid}" document
 *                       created with empty liked/disliked/solved/starred problem arrays.
 * Return Values:        React JSX of the registration form.
 *
 * Error/Exception Conditions:
 *                       Empty fields — browser alert before submission.
 *                       Firebase errors (duplicate email, weak password) — toast error.
 *                       Firebase hook errors — surfaced via useEffect alert.
 * Side Effects:         Calls Firebase createUserWithEmailAndPassword on submit.
 *                       Writes a new document to Firestore "users" collection.
 *                       Shows / dismisses a loading toast around the async operation.
 *                       Calls router.push("/") on successful registration.
 * Invariants:           Firestore user document always contains all four array fields on creation.
 * Known Faults:         If Firestore setDoc fails after Auth creation, the user has a Firebase
 *                       Auth account but no Firestore document (orphaned account state).
 *                       Uses browser alert() inconsistently with the toast error pattern.
 */

import { authModalState } from "@/atoms/authModalAtom";
import { auth, firestore } from "@/firebase/firebase";
import { useEffect, useState } from "react";
import { useSetRecoilState } from "recoil";
import { useCreateUserWithEmailAndPassword } from "react-firebase-hooks/auth";
import { useRouter } from "next/router";
import { doc, setDoc } from "firebase/firestore";
import { toast } from "react-toastify";

type SignupProps = {};

const Signup: React.FC<SignupProps> = () => {
	const setAuthModalState = useSetRecoilState(authModalState);
	const handleClick = () => {
		setAuthModalState((prev) => ({ ...prev, type: "login" }));
	};
	const [inputs, setInputs] = useState({ email: "", displayName: "", password: "" });
	const router = useRouter();
	const [createUserWithEmailAndPassword, user, loading, error] = useCreateUserWithEmailAndPassword(auth);
	const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputs((prev) => ({ ...prev, [e.target.name]: e.target.value }));
	};

	/**
	 * Artifact:             handleRegister
	 * Description:          Creates a Firebase Auth account and initializes the Firestore
	 *                       user document with empty interaction arrays.
	 *
	 * Preconditions:        All three input fields must be non-empty; Firebase initialized.
	 * Acceptable Input:     e — React form submit event; reads inputs from state.
	 * Unacceptable Input:   Empty email, displayName, or password (guarded by alert).
	 *
	 * Postconditions:       Firebase Auth account and Firestore user document both created.
	 *                       User is redirected to "/" on success.
	 * Return Values:        Promise<void>.
	 *
	 * Error/Exception Conditions:
	 *                       Empty fields — alert shown, early return.
	 *                       Firebase errors — toast error shown.
	 *                       Firestore setDoc failure — error caught, toast shown; Auth account
	 *                       remains (orphaned if Firestore write fails after Auth creation).
	 * Side Effects:         Creates Firebase Auth user. Writes Firestore user document.
	 *                       Shows loading toast; dismisses it in finally block.
	 *                       Calls router.push("/") on success.
	 * Invariants:           e.preventDefault() always called. loadingToast always dismissed.
	 * Known Faults:         Orphaned account possible if setDoc throws after Auth creation.
	 */
	const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!inputs.email || !inputs.password || !inputs.displayName) return alert("Please fill all fields");
		try {
			toast.loading("Creating your account", { position: "top-center", toastId: "loadingToast" });
			const newUser = await createUserWithEmailAndPassword(inputs.email, inputs.password);
			if (!newUser) return;
			const userData = {
				uid: newUser.user.uid,
				email: newUser.user.email,
				displayName: inputs.displayName,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				likedProblems: [],
				dislikedProblems: [],
				solvedProblems: [],
				starredProblems: [],
			};
			await setDoc(doc(firestore, "users", newUser.user.uid), userData);
			router.push("/");
		} catch (error: any) {
			toast.error(error.message, { position: "top-center" });
		} finally {
			toast.dismiss("loadingToast");
		}
	};

	useEffect(() => {
		if (error) toast.error(error.message, { position: "top-center", autoClose: 3000, theme: "dark" });
	}, [error]);

	return (
		<form className='space-y-6 px-6 pb-4' onSubmit={handleRegister}>
			<h3 className='text-xl font-bold text-on-surface'>Join BeatCode</h3>
			<div>
				<label htmlFor='email' className='text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1 block mb-2'>
					Identity
				</label>
				<input
					onChange={handleChangeInput}
					type='email'
					name='email'
					id='email'
					className='w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-on-surface placeholder:text-outline transition-all focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-high'
					placeholder='email@example.com'
				/>
			</div>
			<div>
				<label htmlFor='displayName' className='text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1 block mb-2'>
					Display Name
				</label>
				<input
					onChange={handleChangeInput}
					type='text'
					name='displayName'
					id='displayName'
					className='w-full bg-surface-container-highest border-none rounded-lg py-3 px-4 text-on-surface placeholder:text-outline transition-all focus:ring-1 focus:ring-primary/40 focus:bg-surface-container-high'
					placeholder='Your name'
				/>
			</div>
			<div>
				<label htmlFor='password' className='text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1 block mb-2'>
					Protocol
				</label>
				<input
					onChange={handleChangeInput}
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
				{loading ? "Creating Account..." : "Create Account"}
			</button>

			<div className='text-xs font-bold uppercase tracking-widest text-on-surface-variant'>
				Already Have Account?{" "}
				<a href='#' className='text-primary font-bold hover:underline' onClick={handleClick}>
					Sign In
				</a>
			</div>
		</form>
	);
};
export default Signup;
