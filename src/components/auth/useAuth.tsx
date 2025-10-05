"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useCallback, useMemo } from "react";

export type AuthState = {
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

export type AuthActions = {
  signIn: () => Promise<void>;
  signOut: () => void;
  // Returns a fresh access token string if obtained, otherwise null
  getTokenSilently: () => Promise<string | null>;
};

/**
 * Custom hook that provides auth state and actions compatible with the old AuthContext
 * while using Auth.js under the hood
 */
export function useAuth(): AuthState & AuthActions {
  const { data: session, status } = useSession();

  const isReady = status !== "loading";
  const isAuthenticated = status === "authenticated" && Boolean(session?.accessToken);
  const accessToken = session?.accessToken;
  const error = session?.error === "RefreshTokenError" ? "Authentication expired" : null;
  const user = session?.user;

  const handleSignIn = useCallback(async () => {
    await signIn("google");
  }, []);

  const handleSignOut = useCallback(() => {
    signOut();
  }, []);

  const getTokenSilently = useCallback(async (): Promise<string | null> => {
    // With Auth.js, the session is automatically refreshed
    // We just need to check if we have a valid token
    if (!session?.accessToken) {
      console.log("[Auth] No access token available");
      return null;
    }

    if (session.error === "RefreshTokenError") {
      console.log("[Auth] Token refresh error detected");
      return null;
    }

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
    [isReady, isAuthenticated, accessToken, error, user, handleSignIn, handleSignOut, getTokenSilently]
  );
}


