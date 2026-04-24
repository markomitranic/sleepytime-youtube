"use client";

import { useEffect, useState } from "react";

/**
 * Returns `true` when `query` matches, `false` when it doesn't, and `null`
 * until the first client render (to avoid SSR/hydration mismatches).
 */
export function useMediaQuery(query: string): boolean | null {
	const [matches, setMatches] = useState<boolean | null>(null);

	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const mql = window.matchMedia(query);
		const update = () => setMatches(mql.matches);
		update();
		mql.addEventListener("change", update);
		return () => mql.removeEventListener("change", update);
	}, [query]);

	return matches;
}
