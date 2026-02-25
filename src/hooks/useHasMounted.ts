/**
 * Artifact:             useHasMounted.ts
 * Description:          Custom hook that returns true only after the component has mounted
 *                       on the client, preventing SSR/CSR hydration mismatches.
 *
 * Programmer:           Burak Örkmez (original); Carlos Mbendera (EECS 582 adaptation)
 * Date Created:         2023-03-18
 * Revisions:
 *   2026-02-24          Added prologue comments (Carlos Mbendera)
 *
 * Preconditions:        Must be called inside a React function component or custom hook
 *                       in accordance with the Rules of Hooks.
 * Acceptable Input:     No parameters.
 * Unacceptable Input:   N/A
 *
 * Postconditions:       Returns false on the initial render pass (SSR); returns true on
 *                       all subsequent renders after client mount.
 * Return Values:        boolean — false before client mount, true after.
 *
 * Error/Exception Conditions:
 *                       Throws a React error if called outside a function component.
 * Side Effects:         Sets internal hasMounted state to true after the first render
 *                       via a useEffect with an empty dependency array.
 * Invariants:           hasMounted transitions from false to true exactly once per
 *                       component instance lifetime and never reverts to false.
 * Known Faults:         None known.
 */

import { useEffect, useState } from "react";

function useHasMounted() {
	const [hasMounted, setHasMounted] = useState(false);

	useEffect(() => {
		setHasMounted(true);
	}, []);

	return hasMounted;
}

export default useHasMounted;
