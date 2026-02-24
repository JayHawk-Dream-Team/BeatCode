/**
 * Track the current browser window dimensions, updating on resize.
 *
 * Defaults to 1200×800 when window is not available (SSR context).
 * Used by Workspace to size the confetti canvas to the full viewport on submission success.
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
