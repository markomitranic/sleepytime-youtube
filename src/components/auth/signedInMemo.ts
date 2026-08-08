const KEY = "sleepytime-signed-in";

/**
 * Records whether a Google session exists, so a later cold boot can route
 * without waiting on the network.
 * @example rememberSignedIn(true);
 */
export function rememberSignedIn(signedIn: boolean) {
	try {
		if (signedIn) localStorage.setItem(KEY, "1");
		else localStorage.removeItem(KEY);
	} catch {}
}

/**
 * Last known sign-in state, readable synchronously before first paint.
 * Optimistic by design: it can be stale (revoked token, expired refresh), so
 * it may only drive routing, never access.
 * @example wasSignedIn(); // true
 */
export function wasSignedIn(): boolean {
	try {
		return localStorage.getItem(KEY) === "1";
	} catch {
		return false;
	}
}
