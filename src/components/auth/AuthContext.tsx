"use client";

import { createContext, useContext, useMemo } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useCallback } from "react";

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

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  const value = useMemo(
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}