"use client";

import { useState } from "react";
import { Input } from "~/components/ui/input";
import { usePlaylist } from "~/components/playlist/PlaylistContext";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const playlist = usePlaylist();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!url) return;
    playlist.loadFromUrl(url);
  }

  // All playlist fetching and URL syncing handled in PlaylistContext

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

        {playlist.error && <p className="text-sm text-destructive">{playlist.error}</p>}

        {playlist.isLoading && <p>Loading playlist…</p>}

        {playlist.items && playlist.items.length > 0 && (
          <>
            {/* Video embed for the first playable item */}
            {(() => {
              const currentVideoId = playlist.currentVideoId;
              const current = currentVideoId ? playlist.items.find((i) => i.videoId === currentVideoId) : undefined;
              if (!currentVideoId) return null;
              const src = `https://www.youtube.com/embed/${currentVideoId}`;
              return (
                <div className="aspect-video w-full overflow-hidden rounded-md border bg-black">
                  <iframe
                    key={currentVideoId}
                    title={current?.title ?? "YouTube video"}
                    src={`${src}?playsinline=1&rel=0`}
                    className="h-full w-full"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              );
            })()}

            {/* Full list; highlight the current item */}
            <ul className="grid grid-cols-1 gap-4">
              {(() => {
                const currentVideoId = playlist.currentVideoId;
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


