/**
 * Artifact:             _app.tsx
 * Description:          Next.js application root — wraps every page with RecoilRoot for
 *                       global state management and ToastContainer for toast notifications.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *   2026-02-27          Disabled Recoil duplicate atom key check to suppress dev-mode
 *                       HMR warning for "authModalState" (Carlos Mbendera)
 *
 * Preconditions:        react-toastify CSS must be importable; all page components must
 *                       be valid React components receivable as the Component prop.
 * Acceptable Input:     Component and pageProps as supplied by the Next.js router.
 * Unacceptable Input:   N/A — inputs are always provided by the Next.js framework.
 *
 * Postconditions:       Every page component renders inside RecoilRoot and has access
 *                       to toast notification APIs via react-toastify.
 * Return Values:        React JSX tree wrapping the active page component.
 *
 * Error/Exception Conditions:
 *                       Unhandled exceptions inside Component propagate normally to the
 *                       browser and are not caught at this level.
 * Side Effects:         Mounts a global RecoilRoot state store and registers the
 *                       ToastContainer in the DOM for the lifetime of the application.
 * Invariants:           RecoilRoot and ToastContainer are always ancestors of every page.
 * Known Faults:         None known.
 */

import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Head from "next/head";
import { RecoilRoot, RecoilEnv } from "recoil";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Written by Carlos with help from Claude
// Suppress the duplicate atom key warning caused by Next.js hot module replacement
// re-evaluating the Recoil atom module on every page recompile in development.
RecoilEnv.RECOIL_DUPLICATE_ATOM_KEY_CHECKING_ENABLED = false;
export default function App({ Component, pageProps }: AppProps) {
	return (
		<RecoilRoot>
			<Head>
				<title>BeatCode</title>
				<meta name='viewport' content='width=device-width, initial-scale=1' />
				<link rel='icon' href='/favicon.png' />
				<meta
					name='description'
					content='BeatCode — a coding challenge platform with problems and video solutions'
				/>
			</Head>
			<ToastContainer />
			<Component {...pageProps} />
		</RecoilRoot>
	);
}
