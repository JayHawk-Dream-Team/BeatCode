/**
 * Return true after the component has mounted on the client.
 *
 * Prevents SSR/CSR hydration mismatches by deferring render of components that
 * depend on browser APIs (localStorage, window) until after mount. Pages using
 * this hook return null on the first render pass.
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
