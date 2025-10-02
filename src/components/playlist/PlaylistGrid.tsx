"use client";

import { useCallback } from "react";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Badge } from "~/components/ui/badge";
import { Lock, RefreshCw, Globe, Link as LinkIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserPlaylists, fetchPlaylistsByIds } from "~/lib/youtube";
import { BUILTIN_PLAYLIST_IDS, BUILTIN_PLAYLISTS } from "~/lib/builtinPlaylists";
import { env } from "~/env";
import { toast } from "sonner";

export function PlaylistGrid() {
  const auth = useAuth();
  const playlist = usePlaylist();

  const queryClient = useQueryClient();
  const { data: userPlaylists, error: userPlaylistsError } = useQuery({
    queryKey: ["userPlaylists", auth.accessToken],
    queryFn: async () => {
      try {
        return await fetchUserPlaylists({ accessToken: auth.accessToken!, refreshToken: auth.getTokenSilently });
      } catch (err: any) {
        // If authentication failed, prompt user to sign in again
        if (err.status === 401) {
          toast.error("Your session expired. Please sign in again.", {
            action: {
              label: "Sign In",
              onClick: () => auth.signIn(),
            },
          });
        }
        throw err;
      }
    },
    enabled: auth.isAuthenticated && Boolean(auth.accessToken),
    staleTime: 1000 * 60,
    retry: false, // Don't retry on auth errors
  });

  const { data: builtinPlaylists } = useQuery({
    queryKey: ["builtinPlaylists"],
    queryFn: async () => {
      // Always use public API key for built-ins; don't send Authorization header
      const apiResults = await fetchPlaylistsByIds({
        apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
        playlistIds: Array.from(BUILTIN_PLAYLIST_IDS),
      });
      const overrides = new Map(BUILTIN_PLAYLISTS.map((b) => [b.id, b] as const));
      return apiResults.map((p) => {
        const o = overrides.get(p.id);
        return {
          ...p,
          title: o?.title ?? p.title,
          thumbnailUrl: o?.thumbnail ?? p.thumbnailUrl,
          channelTitle: o?.channel ?? p.channelTitle,
        };
      });
    },
    staleTime: 1000 * 60 * 10,
  });

  // Always show built-in playlists, even if they also exist in the user's collection
  const builtinsToRender = builtinPlaylists ?? [];


  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["userPlaylists", auth.accessToken] });
    await queryClient.refetchQueries({ queryKey: ["userPlaylists", auth.accessToken], type: "active" });
  }, [queryClient, auth.accessToken]);

  return (
    <div className="space-y-4">
      {/* Divider */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-border"></div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Your Playlists</h3>
          {auth.isAuthenticated && (
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              aria-label="Refresh playlists"
              title="Refresh playlists"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      {/* Auth controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{auth.isAuthenticated ? "Only you can see these." : "Browse your playlists or continue as guest."}</p>
        {auth.isAuthenticated ? (
          <button
            type="button"
            onClick={() => auth.signOut()}
            className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={() => auth.signIn()}
            className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
          >
            Sign in with Google
          </button>
        )}
      </div>

      {/* User playlists grid (if authenticated) */}
      {auth.isAuthenticated ? (
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(userPlaylists ?? []).map((p) => (
            <li key={p.id}>
              <a
                href={`/player?list=${p.id}`}
                className="block w-full text-left group"
              >
                <div className="aspect-square w-full overflow-hidden rounded-md border bg-secondary/40 relative">
                  {p.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumbnailUrl} alt="thumbnail" className="h-full w-full object-cover scale-[1.34] origin-center group-hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No thumbnail</div>
                  )}
                  {p.privacyStatus && (
                    <div className="absolute top-2 right-2">
                      {p.privacyStatus === "private" && (
                        <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-5">
                          <Lock className="h-3.5 w-3.5" />
                          Private
                        </Badge>
                      )}
                      {p.privacyStatus === "public" && (
                        <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-5">
                          <Globe className="h-3.5 w-3.5" />
                          Public
                        </Badge>
                      )}
                      {p.privacyStatus === "unlisted" && (
                        <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-5">
                          <LinkIcon className="h-3.5 w-3.5" />
                          Unlisted
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium truncate" title={p.title}>{p.title}</p>
                  {typeof p.itemCount === "number" && (
                    <p className="text-xs text-muted-foreground">{p.itemCount} videos</p>
                  )}
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted-foreground">
          Sign in to see your playlist collection. Or paste a URL above to play as guest.
        </div>
      )}

      {/* Separator for built-in */}
      <div id="try-it-out" className="flex items-center gap-4 pt-4">
        <div className="flex-1 h-px bg-border"></div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Need some inspiration?</h3>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      {/* Built-in playlists grid */}
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {builtinsToRender.map((p) => (
          <li key={p.id}>
            <a
              href={`/player?list=${p.id}`}
              className="block w-full text-left group"
            >
              <div className="aspect-square w-full overflow-hidden rounded-md border bg-secondary/40 relative">
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnailUrl} alt="thumbnail" className="h-full w-full object-cover scale-[1.34] origin-center group-hover:opacity-90 transition-opacity" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">No thumbnail</div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant="outline" className="gap-1 px-2 py-0.5 h-5 bg-green-700/20 border border-green-600 text-green-300">
                    <span className="led-green"></span>
                    <span>Try me!</span>
                  </Badge>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium truncate" title={p.title}>{p.title}</p>
                {p.channelTitle && p.title && p.channelTitle.trim().toLowerCase() !== p.title.trim().toLowerCase() && (
                  <p className="text-xs text-muted-foreground truncate" title={p.channelTitle}>{p.channelTitle}</p>
                )}
                {typeof p.itemCount === "number" && (
                  <p className="text-xs text-muted-foreground">{p.itemCount} videos</p>
                )}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}


