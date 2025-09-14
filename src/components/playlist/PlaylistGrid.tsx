"use client";

import { useCallback } from "react";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Badge } from "~/components/ui/badge";
import { Lock, RefreshCw, Globe, Link as LinkIcon } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchUserPlaylists, fetchPlaylistsByIds } from "~/lib/youtube";
import { BUILTIN_PLAYLIST_IDS } from "~/lib/builtinPlaylists";
import { env } from "~/env";

export function PlaylistGrid() {
  const auth = useAuth();
  const playlist = usePlaylist();

  const queryClient = useQueryClient();
  const { data: userPlaylists } = useQuery({
    queryKey: ["userPlaylists", auth.accessToken],
    queryFn: async () => {
      if (!auth.isAuthenticated || !auth.accessToken) return [];
      return await fetchUserPlaylists({ accessToken: auth.accessToken });
    },
    enabled: Boolean(auth.isAuthenticated && auth.accessToken),
    staleTime: 1000 * 60, // 1 minute is fine
  });

  const { data: builtinPlaylists } = useQuery({
    queryKey: ["builtinPlaylists", auth.accessToken],
    queryFn: async () => {
      // Allow accessToken for private metadata if applicable, but not required
      return await fetchPlaylistsByIds({
        apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
        accessToken: auth.accessToken,
        playlistIds: Array.from(BUILTIN_PLAYLIST_IDS),
      });
    },
    staleTime: 1000 * 60 * 10, // fetch infrequently
  });

  const handleSelect = useCallback(
    async (playlistId: string) => {
      await playlist.loadByPlaylistId(playlistId);
    },
    [playlist],
  );

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["userPlaylists"] });
  }, [queryClient]);

  return (
    <div className="space-y-4">
      {/* Divider */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-border"></div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Playlists</h3>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      {/* Auth controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Browse your playlists or continue as guest.</p>
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

      {auth.isAuthenticated && (
        <div className="flex items-center justify-end -mt-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
            aria-label="Refresh playlists"
            title="Refresh playlists"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* User playlists grid (if authenticated) */}
      {auth.isAuthenticated ? (
        <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {(userPlaylists ?? []).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="w-full text-left group"
                onClick={() => handleSelect(p.id)}
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
              </button>
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
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Try it out!</h3>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      {/* Built-in playlists grid */}
      <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {(builtinPlaylists ?? []).map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="w-full text-left group"
              onClick={() => handleSelect(p.id)}
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
                {typeof p.itemCount === "number" && (
                  <p className="text-xs text-muted-foreground">{p.itemCount} videos</p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}


