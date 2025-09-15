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
  // Returns a fresh access token string if obtained, otherwise null
  getTokenSilently: () => Promise<string | null>;
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
  const STORAGE_ACCESS_TOKEN_AT = "auth.accessTokenAt";
  const TOKEN_REFRESH_WINDOW_MS = 50 * 60 * 1000; // proactively refresh after ~50 minutes
  // Backoff for silent token requests (in-memory only)
  const silentFailuresRef = useRef<number>(0);
  const silentBackoffUntilRef = useRef<number>(0);
  const tokenObtainedAtRef = useRef<number>(0);

  function computeBackoffMs(failures: number): number {
    // 0 -> 0s, 1 -> 5s, 2 -> 30s, 3 -> 120s, 4+ -> 600s
    const schedule = [0, 5000, 30000, 120000, 600000];
    const idx = Math.max(0, Math.min(failures, schedule.length - 1));
    const base = schedule[idx] ?? 0;
    const jitter = base * (0.8 + Math.random() * 0.4);
    return Math.round(jitter);
  }

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
        localStorage.removeItem(STORAGE_ACCESS_TOKEN_AT);
      } catch {}
      // reset backoff on sign out
      silentFailuresRef.current = 0;
      silentBackoffUntilRef.current = 0;
      tokenObtainedAtRef.current = 0;
    }
  }, [state.accessToken]);

  // Restore token from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const token = localStorage.getItem(STORAGE_ACCESS_TOKEN);
      const atRaw = localStorage.getItem(STORAGE_ACCESS_TOKEN_AT);
      const at = atRaw ? Number(atRaw) : 0;
      tokenObtainedAtRef.current = Number.isFinite(at) ? at : 0;
      if (token) setState((s) => ({ ...s, isAuthenticated: true, accessToken: token }));
    } catch {}
  }, []);

  // Persist token on first successful retrieval
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!state.isAuthenticated || !state.accessToken) return;
    try {
      localStorage.setItem(STORAGE_ACCESS_TOKEN, state.accessToken);
      const now = Date.now();
      tokenObtainedAtRef.current = now;
      localStorage.setItem(STORAGE_ACCESS_TOKEN_AT, String(now));
    } catch {}
  }, [state.isAuthenticated, state.accessToken]);

  // Provide a helper to request token without prompting; returns true if token obtained
  const getTokenSilently = useCallback(async (): Promise<string | null> => {
    if (!tokenClientRef.current) return null;
    const now = Date.now();
    const hasToken = Boolean(state.accessToken);
    const tokenAgeMs = now - (tokenObtainedAtRef.current || 0);
    const tokenIsFresh = hasToken && tokenAgeMs < TOKEN_REFRESH_WINDOW_MS;
    if (tokenIsFresh) return state.accessToken ?? null;
    // Respect backoff window
    if (silentBackoffUntilRef.current > now) {
      return null;
    }
    return await new Promise<string | null>((resolve) => {
      try {
        const original = tokenClientRef.current.callback;
        tokenClientRef.current.callback = (resp: any) => {
          try {
            if (resp?.access_token) {
              setState((s) => ({ ...s, isAuthenticated: true, accessToken: resp.access_token as string }));
              // success resets backoff
              silentFailuresRef.current = 0;
              silentBackoffUntilRef.current = 0;
              resolve(resp.access_token as string);
            } else {
              // failure increments backoff
              silentFailuresRef.current = silentFailuresRef.current + 1;
              const delay = computeBackoffMs(silentFailuresRef.current);
              silentBackoffUntilRef.current = Date.now() + delay;
              // Clear stale token so public API key paths work
              setState((s) => ({ ...s, isAuthenticated: false, accessToken: undefined }));
              try {
                localStorage.removeItem(STORAGE_ACCESS_TOKEN);
                localStorage.removeItem(STORAGE_ACCESS_TOKEN_AT);
              } catch {}
              resolve(null);
            }
          } finally {
            tokenClientRef.current.callback = original;
          }
        };
        tokenClientRef.current.requestAccessToken({ prompt: "" });
      } catch {
        // failure increments backoff
        silentFailuresRef.current = silentFailuresRef.current + 1;
        const delay = computeBackoffMs(silentFailuresRef.current);
        silentBackoffUntilRef.current = Date.now() + delay;
        // Clear stale token so public API key paths work
        setState((s) => ({ ...s, isAuthenticated: false, accessToken: undefined }));
        try {
          localStorage.removeItem(STORAGE_ACCESS_TOKEN);
          localStorage.removeItem(STORAGE_ACCESS_TOKEN_AT);
        } catch {}
        resolve(null);
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


