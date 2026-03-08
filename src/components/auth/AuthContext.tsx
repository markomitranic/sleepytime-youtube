"use client";

import { signIn, signOut, useSession } from "next-auth/react";
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
	signIn: () => Promise<void>;
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

	const handleSignIn = useCallback(async () => {
		await signIn("google");
	}, []);

	const handleSignOut = useCallback(() => {
		signOut();
	}, []);

	const getTokenSilently = useCallback(async (): Promise<string | null> => {
		if (!session?.accessToken) return null;
		if (session.error === "RefreshTokenError") return null;
		return session.accessToken;
	}, [session]);

	return useMemo(
		() => ({
			isReady,
			isAuthenticated,
			accessToken,
			error,
			user,
			signIn: handleSignIn,
			signOut: handleSignOut,
			getTokenSilently,
		}),
		[
			isReady,
			isAuthenticated,
			accessToken,
			error,
			user,
			handleSignIn,
			handleSignOut,
			getTokenSilently,
		],
	);
}
