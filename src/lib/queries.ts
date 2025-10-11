import { useQuery } from "@tanstack/react-query";
import type { YouTubeUserPlaylist } from "~/lib/youtube";

/**
 * Shared query for builtin playlists to avoid duplicate API calls
 */
export function useBuiltinPlaylists(enabled: boolean = true) {
  return useQuery({
    queryKey: ["builtinPlaylists"],
    queryFn: async () => {
      // Fetch from cached API route (server-side cached for 72 hours)
      const response = await fetch('/api/builtin-playlists');
      if (!response.ok) {
        throw new Error('Failed to fetch built-in playlists');
      }
      return response.json() as Promise<YouTubeUserPlaylist[]>;
    },
    enabled, // Only run query when enabled is true
    staleTime: 1000 * 60 * 60 * 24, // 24 hours - builtin playlists rarely change
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in cache longer
    refetchOnMount: false, // Don't refetch on component mount if data exists
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });
}