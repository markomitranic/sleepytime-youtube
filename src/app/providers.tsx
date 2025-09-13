"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { PlaylistProvider } from "~/components/playlist/PlaylistContext";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <PlaylistProvider>{children}</PlaylistProvider>
    </QueryClientProvider>
  );
}


