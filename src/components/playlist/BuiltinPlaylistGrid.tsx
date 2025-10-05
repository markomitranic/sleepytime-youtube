"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "~/components/ui/badge";
import { fetchPlaylistsByIds } from "~/lib/youtube";
import { BUILTIN_PLAYLIST_IDS, BUILTIN_PLAYLISTS } from "~/lib/builtinPlaylists";
import { env } from "~/env";

type BuiltinPlaylistGridProps = {
  hasScrolled?: boolean;
};

export function BuiltinPlaylistGrid({ hasScrolled = false }: BuiltinPlaylistGridProps) {
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

  // Always show built-in playlists
  const builtinsToRender = builtinPlaylists ?? [];

  return (
    <div className="space-y-4">
      {/* Separator for built-in */}
      <div id="try-it-out" className="flex items-center gap-4 pt-4">
        <div className="flex-1 h-px bg-border"></div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Need some inspiration?</h3>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      {/* Built-in playlists grid */}
      <ul className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-300 ${hasScrolled ? 'opacity-100' : 'opacity-80 hover:opacity-100'}`}>
        {builtinsToRender.map((p) => (
          <li key={p.id}>
            <a
              href={`/player?list=${p.id}`}
              className="block w-full text-left group"
            >
              <div className="aspect-video w-full overflow-hidden rounded-md border bg-secondary/40 relative">
                {p.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.thumbnailUrl} alt="thumbnail" className="h-full w-full object-cover scale-110 origin-center group-hover:opacity-90 transition-opacity" />
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
