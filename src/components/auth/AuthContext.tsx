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
  // Backoff for silent token requests (in-memory only)
  const silentFailuresRef = useRef<number>(0);
  const silentBackoffUntilRef = useRef<number>(0);

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
      callback: (resp: any) => {
        if (resp.error) {
          setState((s) => ({ ...s, error: resp.error_description ?? "Authentication failed" }));
          return;
        }
        const token = resp.access_token as string | undefined;
        if (token) {
          console.log("[Auth] Sign-in successful");
          setState((s) => ({ ...s, isAuthenticated: true, accessToken: token }));
        }
      },
    });
  }, [state.isReady]);

  const signIn = useCallback(async () => {
    if (!tokenClientRef.current) return;
    setState((s) => ({ ...s, error: null }));
    // prompt: 'consent' forces consent screen for explicit sign-in
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
      } catch {}
      // reset backoff on sign out
      silentFailuresRef.current = 0;
      silentBackoffUntilRef.current = 0;
    }
  }, [state.accessToken]);

  // Restore token from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const token = localStorage.getItem(STORAGE_ACCESS_TOKEN);
      if (token) {
        console.log("[Auth] Restoring token from storage");
        setState((s) => ({ ...s, isAuthenticated: true, accessToken: token }));
      }
    } catch {}
  }, []);

  // Persist token to storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!state.isAuthenticated || !state.accessToken) {
      console.log("[Auth] Skipping persist - isAuthenticated:", state.isAuthenticated, "hasToken:", !!state.accessToken);
      return;
    }
    try {
      localStorage.setItem(STORAGE_ACCESS_TOKEN, state.accessToken);
      console.log("[Auth] ✅ Persisted token to storage:", state.accessToken.substring(0, 20) + '...');
      console.log("[Auth] Verifying - localStorage now has:", localStorage.getItem(STORAGE_ACCESS_TOKEN)?.substring(0, 20) + '...');
    } catch (e) {
      console.error("[Auth] Failed to persist token:", e);
    }
  }, [state.isAuthenticated, state.accessToken]);

  // Provide a helper to request token without prompting
  const getTokenSilently = useCallback(async (): Promise<string | null> => {
    if (!tokenClientRef.current) {
      console.log("[Auth] ❌ Token client not ready yet");
      return null;
    }
    
    const now = Date.now();
    // Respect backoff window
    if (silentBackoffUntilRef.current > now) {
      console.log("[Auth] In backoff window, not attempting refresh");
      return null;
    }
    
    console.log("[Auth] Attempting silent token refresh...");
    return await new Promise<string | null>((resolve) => {
      try {
        const original = tokenClientRef.current.callback;
        tokenClientRef.current.callback = (resp: any) => {
          try {
            console.log("[Auth] Silent refresh response:", { 
              hasAccessToken: Boolean(resp?.access_token),
              error: resp?.error,
              errorDescription: resp?.error_description,
              fullResponse: resp
            });
            
            if (resp?.access_token) {
              console.log("[Auth] ✅ Silent refresh succeeded - got new token:", resp.access_token.substring(0, 20) + '...');
              console.log("[Auth] Updating state with new token...");
              setState((s) => {
                console.log("[Auth] State update: was authenticated:", s.isAuthenticated, "had token:", !!s.accessToken);
                return { ...s, isAuthenticated: true, accessToken: resp.access_token as string };
              });
              // success resets backoff
              silentFailuresRef.current = 0;
              silentBackoffUntilRef.current = 0;
              resolve(resp.access_token as string);
            } else {
              // failure increments backoff
              silentFailuresRef.current = silentFailuresRef.current + 1;
              const delay = computeBackoffMs(silentFailuresRef.current);
              silentBackoffUntilRef.current = Date.now() + delay;
              console.log("[Auth] ❌ Silent refresh failed, clearing auth state:", {
                failures: silentFailuresRef.current,
                backoffMs: delay,
                error: resp?.error,
                errorDescription: resp?.error_description
              });
              // DON'T clear auth state on silent refresh failure - keep user logged in with expired token
              // The API key fallback will handle public playlists
              // setState((s) => ({ ...s, isAuthenticated: false, accessToken: undefined }));
              // try {
              //   localStorage.removeItem(STORAGE_ACCESS_TOKEN);
              // } catch {}
              resolve(null);
            }
          } finally {
            tokenClientRef.current.callback = original;
          }
        };
        // prompt: 'none' = never show UI, fail silently if session expired
        tokenClientRef.current.requestAccessToken({ prompt: 'none' });
      } catch (e) {
        // failure increments backoff
        silentFailuresRef.current = silentFailuresRef.current + 1;
        const delay = computeBackoffMs(silentFailuresRef.current);
        silentBackoffUntilRef.current = Date.now() + delay;
        console.log("[Auth] ❌ Silent refresh exception:", e, {
          failures: silentFailuresRef.current,
          backoffMs: delay
        });
        // DON'T log user out on exception - they're still logged in, just token needs refresh
        resolve(null);
      }
    });
  }, []);

  const value = useMemo(() => ({ ...state, signIn, signOut, getTokenSilently }), [state, signIn, signOut, getTokenSilently]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


