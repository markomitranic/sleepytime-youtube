"use client";

import { usePlaylist } from "~/components/playlist/PlaylistContext";

export function Player() {
  const playlist = usePlaylist();

  const currentVideoId = playlist.currentVideoId;
  if (!currentVideoId) return null;
  const current = playlist.items.find((i) => i.videoId === currentVideoId);
  const src = `https://www.youtube.com/embed/${currentVideoId}`;

  return (
    <div className="space-y-4">
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

      <ul className="grid grid-cols-1 gap-4">
        {playlist.items.map((item) => {
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
                {item.videoId && <p className="text-xs text-muted-foreground">Video ID: {item.videoId}</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}


