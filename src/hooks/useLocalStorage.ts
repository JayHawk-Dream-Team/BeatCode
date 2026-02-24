/**
 * useState-compatible hook that persists its value to localStorage.
 *
 * Initializes from localStorage on mount (SSR-safe via window check). Falls back to
 * initialValue if the key is absent or if localStorage is unavailable. Syncs every
 * value update back to localStorage via useEffect. Used to persist editor font size
 * across sessions with the key "lcc-fontSize".
 */

import { useState, useEffect } from "react";

const useLocalStorage = (key: string, initialValue: string) => {
	const [value, setValue] = useState(() => {
		try {
			if (typeof window !== "undefined") {
				const item = window.localStorage.getItem(key);
				return item ? JSON.parse(item) : initialValue;
			} else {
				return initialValue;
			}
		} catch (error) {
			console.error(error);
			return initialValue;
		}
	});

	useEffect(() => {
		try {
			if (typeof window !== "undefined") {
				window.localStorage.setItem(key, JSON.stringify(value));
			}
		} catch (error) {
			console.error(error);
		}
	}, [key, value]);

	return [value, setValue];
};

export default useLocalStorage;
