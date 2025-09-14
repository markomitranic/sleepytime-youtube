"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { env } from "~/env";

export type AuthState = {
  isReady: boolean;
  isAuthenticated: boolean;
  accessToken?: string;
  error?: string | null;
};

export type AuthActions = {
  signIn: () => Promise<void>;
  signOut: () => void;
  getTokenSilently: () => Promise<boolean>;
};

const AuthContext = createContext<(AuthState & AuthActions) | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isReady: false,
    isAuthenticated: false,
    accessToken: undefined,
    error: null,
  });

  const tokenClientRef = useRef<any>(null);
  const STORAGE_ACCESS_TOKEN = "auth.accessToken";

  // Load Google Identity Services script
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      setState((s) => ({ ...s, isReady: true }));
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>("script#gsi-client");
    if (existing) {
      setState((s) => ({ ...s, isReady: true }));
      return;
    }

    const script = document.createElement("script");
    script.id = "gsi-client";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setState((s) => ({ ...s, isReady: true }));
    document.head.appendChild(script);
  }, []);

  // Initialize token client once ready
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!state.isReady) return;
    if (!env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return;
    if (tokenClientRef.current) return;

    // @ts-expect-error - gsi attaches to window
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) return;

    tokenClientRef.current = google.accounts.oauth2.initTokenClient({
      client_id: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.readonly",
      prompt: "consent",
      callback: (resp: any) => {
        if (resp.error) {
          setState((s) => ({ ...s, error: resp.error_description ?? "Authentication failed" }));
          return;
        }
        const token = resp.access_token as string | undefined;
        if (token) {
          setState((s) => ({ ...s, isAuthenticated: true, accessToken: token }));
        }
      },
    });
  }, [state.isReady]);

  const signIn = useCallback(async () => {
    if (!tokenClientRef.current) return;
    setState((s) => ({ ...s, error: null }));
    tokenClientRef.current.requestAccessToken({ prompt: "consent" });
  }, []);

  const signOut = useCallback(() => {
    try {
      // @ts-expect-error - gsi attaches to window
      const google = (window as any).google;
      if (google?.accounts?.oauth2 && state.accessToken) {
        google.accounts.oauth2.revoke(state.accessToken, () => {
          // cleared
        });
      }
    } finally {
      setState({ isReady: true, isAuthenticated: false, accessToken: undefined, error: null });
      try {
        localStorage.removeItem(STORAGE_ACCESS_TOKEN);
      } catch {}
    }
  }, [state.accessToken]);

  // Restore token from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const token = localStorage.getItem(STORAGE_ACCESS_TOKEN);
      if (token) setState((s) => ({ ...s, isAuthenticated: true, accessToken: token }));
    } catch {}
  }, []);

  // Persist token on first successful retrieval
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!state.isAuthenticated || !state.accessToken) return;
    try {
      localStorage.setItem(STORAGE_ACCESS_TOKEN, state.accessToken);
    } catch {}
  }, [state.isAuthenticated, state.accessToken]);

  // Provide a helper to request token without prompting; returns true if token obtained
  const getTokenSilently = useCallback(async (): Promise<boolean> => {
    if (!tokenClientRef.current) return false;
    const hasValid = Boolean(state.accessToken);
    if (hasValid) return true;
    return await new Promise<boolean>((resolve) => {
      try {
        const original = tokenClientRef.current.callback;
        tokenClientRef.current.callback = (resp: any) => {
          try {
            if (resp?.access_token) {
              setState((s) => ({ ...s, isAuthenticated: true, accessToken: resp.access_token as string }));
              resolve(true);
            } else {
              resolve(false);
            }
          } finally {
            tokenClientRef.current.callback = original;
          }
        };
        tokenClientRef.current.requestAccessToken({ prompt: "" });
      } catch {
        resolve(false);
      }
    });
  }, [state.accessToken]);

  const value = useMemo(() => ({ ...state, signIn, signOut, getTokenSilently }), [state, signIn, signOut, getTokenSilently]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


