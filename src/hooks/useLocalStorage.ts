/**
 * Artifact:             useLocalStorage.ts
 * Description:          useState-compatible hook that reads from and writes to localStorage,
 *                       with SSR safety and a fallback to an initial value when unavailable.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Must be called inside a React function component or custom hook.
 * Acceptable Input:     key — non-empty string localStorage key (e.g. "lcc-fontSize");
 *                       initialValue — string fallback used when key is absent or unavailable.
 * Unacceptable Input:   null or undefined key; non-string initialValue (type is constrained).
 *
 * Postconditions:       localStorage[key] always reflects the current value after any update.
 * Return Values:        [value: string, setValue: Dispatch<SetStateAction<string>>]
 *                       — same interface as useState; value is the current persisted string.
 *
 * Error/Exception Conditions:
 *                       localStorage.getItem / setItem errors (e.g. storage quota exceeded,
 *                       private browsing restrictions) are caught and logged to console.error;
 *                       the hook falls back to initialValue on read errors.
 * Side Effects:         Reads from localStorage during initialization; writes to localStorage
 *                       on every value change via useEffect.
 * Invariants:           value is always a string; JSON.parse / JSON.stringify maintain
 *                       a lossless round-trip for string values.
 * Known Faults:         None known.
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
