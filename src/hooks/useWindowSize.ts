/**
 * Artifact:             useWindowSize.ts
 * Description:          Custom hook that tracks browser window width and height,
 *                       updating state on resize events. SSR-safe with a 1200×800 default.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Must be called inside a React function component or custom hook.
 * Acceptable Input:     No parameters.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       Returns up-to-date viewport dimensions; updates on every resize event.
 * Return Values:        { width: number, height: number } — current viewport dimensions in
 *                       pixels; defaults to { width: 1200, height: 800 } in SSR context.
 *
 * Error/Exception Conditions:
 *                       None; window availability is guarded before every access.
 * Side Effects:         Registers a "resize" event listener on window on mount;
 *                       removes it on component unmount via useEffect cleanup.
 * Invariants:           width and height are always positive integers.
 * Known Faults:         None known.
 */

import { useEffect, useState } from "react";

export default function useWindowSize() {
	const [windowSize, setWindowSize] = useState({
		width: typeof window !== "undefined" ? window.innerWidth : 1200,
		height: typeof window !== "undefined" ? window.innerHeight : 800,
	});

	function changeWindowSize() {
		if (typeof window !== "undefined") {
			setWindowSize({ width: window.innerWidth, height: window.innerHeight });
		}
	}

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.addEventListener("resize", changeWindowSize);

			return () => {
				window.removeEventListener("resize", changeWindowSize);
			};
		}
	}, []);

	return windowSize;
}
