"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Input } from "~/components/ui/input";
import { env } from "~/env";
import { extractPlaylistIdFromUrl, fetchPlaylistItems } from "~/lib/youtube";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const playlistId = extractPlaylistIdFromUrl(url) ?? undefined;

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

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
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

        {data && data.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {data.map((item) => (
              <li key={item.id} className="flex gap-3 rounded-md border p-3">
                {item.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnailUrl} alt="thumbnail" className="h-16 w-28 rounded object-cover" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.title}</p>
                  {item.videoId && (
                    <p className="text-xs text-muted-foreground">Video ID: {item.videoId}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}


