"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { PlaylistProvider } from "~/components/playlist/PlaylistContext";
import { AuthProvider } from "~/components/auth/AuthContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlaylistProvider>{children}</PlaylistProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}


