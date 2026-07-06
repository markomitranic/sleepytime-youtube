"use client";

import { signOut, useSession } from "next-auth/react";
import { useCallback, useMemo } from "react";

type AuthState = {
	isReady: boolean;
	isAuthenticated: boolean;
	accessToken?: string;
	error?: string | null;
	user?: {
		name?: string | null;
		email?: string | null;
		image?: string | null;
	};
};

type AuthActions = {
	signOut: () => void;
	getTokenSilently: () => Promise<string | null>;
};

export type AuthContextType = AuthState & AuthActions;

export function useAuth(): AuthContextType {
	const { data: session, status } = useSession();

	const isReady = status !== "loading";
	const isAuthenticated =
		status === "authenticated" && Boolean(session?.accessToken);
	const accessToken = session?.accessToken;
	const error =
		session?.error === "RefreshTokenError" ? "Authentication expired" : null;
	const user = session?.user;

	const handleSignOut = useCallback(() => {
		signOut();
	}, []);

	const getTokenSilently = useCallback(async (): Promise<string | null> => {
		if (!session?.accessToken) return null;
		if (session.error === "RefreshTokenError") return null;

		// Force server-side refresh by calling refresh-session endpoint
		// This triggers the JWT callback to refresh expired tokens
		try {
			const res = await fetch("/api/refresh-session");
			if (!res.ok) return null;

			const { accessToken, error } = (await res.json()) as {
				accessToken?: string;
				error?: string | null;
			};

			// If refresh failed server-side, return null to signal logout
			if (error === "RefreshTokenError" || !accessToken) return null;

			return accessToken;
		} catch {
			// Network error, fallback to current token
			return session.accessToken;
		}
	}, [session]);

	return useMemo(
		() => ({
			isReady,
			isAuthenticated,
			accessToken,
			error,
			user,
			signOut: handleSignOut,
			getTokenSilently,
		}),
		[
			isReady,
			isAuthenticated,
			accessToken,
			error,
			user,
			handleSignOut,
			getTokenSilently,
		],
	);
}
