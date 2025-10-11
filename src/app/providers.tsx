"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PlaylistProvider } from "~/components/playlist/PlaylistContext";
import { SessionProvider } from "~/components/auth/SessionProvider";
import { AuthProvider } from "~/components/auth/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - increased from 1 minute
      gcTime: 1000 * 60 * 30, // 30 minutes - increased from 1 minute
      retry: 1, // Allow 1 retry for failed requests
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
    },
  },
});

// Allows the Chrome devtools extension to work
if (typeof window !== "undefined") {
  window.__TANSTACK_QUERY_CLIENT__ = queryClient;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AuthProvider>
          <PlaylistProvider>{children}</PlaylistProvider>
        </AuthProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}


