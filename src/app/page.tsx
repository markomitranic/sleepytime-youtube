"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Input } from "~/components/ui/input";
import { env } from "~/env";
import { extractPlaylistIdFromUrl, fetchPlaylistItems, fetchPlaylistSnippet } from "~/lib/youtube";
import { usePlaylist } from "~/components/playlist/PlaylistContext";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const playlistId = extractPlaylistIdFromUrl(url) ?? undefined;
  const playlist = usePlaylist();

  // Prefill from `?list=` if present
  useEffect(() => {
    const list = searchParams.get("list");
    if (!list) return;
    if (playlistId === list) return;
    setUrl(`https://www.youtube.com/playlist?list=${list}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!playlistId) return;
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("list", playlistId);
    // Reset selected video when loading a new playlist
    params.delete("v");
    router.replace(`/?${params.toString()}`);
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["playlistItems", playlistId],
    enabled: Boolean(playlistId) && Boolean(env.NEXT_PUBLIC_YOUTUBE_API_KEY),
    queryFn: async () => {
      let nextPageToken: string | undefined = undefined;
      const aggregated: Awaited<ReturnType<typeof fetchPlaylistItems>>["items"] = [];
      do {
        const res = await fetchPlaylistItems({
          apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY!,
          playlistId: playlistId!,
          pageToken: nextPageToken,
        });
        aggregated.push(...res.items);
        nextPageToken = res.nextPageToken;
      } while (nextPageToken);
      return aggregated;
    },
  });

  const { data: snippet } = useQuery({
    queryKey: ["playlistSnippet", playlistId],
    enabled: Boolean(playlistId) && Boolean(env.NEXT_PUBLIC_YOUTUBE_API_KEY),
    queryFn: async () =>
      fetchPlaylistSnippet({
        apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY!,
        playlistId: playlistId!,
      }),
  });

  useEffect(() => {
    if (!playlistId || !url || !data) return;
    const v = typeof window !== "undefined" ? new URL(window.location.href).searchParams.get("v") ?? undefined : undefined;
    playlist.loadPlaylist({ url, playlistId, snippet: snippet ?? null, items: data, currentVideoId: v });
  }, [playlistId, url, data, snippet]);

  // URL syncing moved to PlaylistContext

  return (
    <main className="flex min-h-screen items-start justify-center px-[10px] py-6">
      <div className="w-full max-w-[720px] space-y-6">
        <h1 className="text-3xl font-bold">Enter YouTube Playlist URL</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="url"
            placeholder="https://www.youtube.com/playlist?list=..."
            className="h-12 text-lg"
            aria-label="YouTube playlist URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
          {/* Hidden submit so Enter works */}
          <button type="submit" className="sr-only">Load</button>
        </form>

        {playlistId === undefined && url.length > 0 && (
          <p className="text-sm text-muted-foreground">Invalid playlist URL. It must include a "list" parameter.</p>
        )}

        {isLoading && <p>Loading playlist…</p>}
        {isError && <p className="text-destructive">{(error as Error)?.message ?? "Failed to load playlist."}</p>}

        {playlist.items && playlist.items.length > 0 && (
          <>
            {/* Video embed for the first playable item */}
            {(() => {
              const currentVideoId = playlist.currentVideoId ?? playlist.items.find((i) => Boolean(i.videoId))?.videoId;
              const current = playlist.items.find((i) => i.videoId === currentVideoId);
              if (!currentVideoId) return null;
              const src = `https://www.youtube.com/embed/${currentVideoId}`;
              return (
                <div className="aspect-video w-full overflow-hidden rounded-md border bg-black">
                  <iframe
                    key={currentVideoId}
                    title={current?.title ?? "YouTube video"}
                    src={`${src}?rel=0`}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              );
            })()}

            {/* Full list; highlight the current item */}
            <ul className="grid grid-cols-1 gap-4">
              {(() => {
                const currentVideoId = playlist.currentVideoId ?? playlist.items.find((i) => Boolean(i.videoId))?.videoId;
                return playlist.items.map((item) => {
                  const isCurrent = Boolean(currentVideoId && item.videoId === currentVideoId);
                  return (
                    <li
                      key={item.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-secondary ${
                        isCurrent ? "bg-secondary/60" : ""
                      }`}
                      onClick={() => item.videoId && playlist.setCurrentVideoId(item.videoId)}
                    >
                      {item.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnailUrl} alt="thumbnail" className="h-16 w-28 rounded object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`truncate font-medium ${isCurrent ? "opacity-80" : ""}`}>{item.title}</p>
                          {isCurrent && (
                            <span className="ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                              <span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]" />
                              Playing
                            </span>
                          )}
                        </div>
                        {item.videoId && (
                          <p className="text-xs text-muted-foreground">Video ID: {item.videoId}</p>
                        )}
                      </div>
                    </li>
                  );
                });
              })()}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}


