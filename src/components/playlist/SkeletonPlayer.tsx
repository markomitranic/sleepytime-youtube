"use client";

import { Loader2, ListVideo } from "lucide-react";
import { usePlaylist } from "~/components/playlist/PlaylistContext";

export function SkeletonPlayer() {
  const playlist = usePlaylist();
  const loading = playlist.loading;

  const totalItems = loading?.totalItems;
  const loaded = loading?.itemsLoaded ?? 0;
  const totalPages = loading?.totalPages;
  const loadedPages = loading?.pagesLoaded ?? 0;

  return (
    <div className="relative space-y-4 px-5">
      <div className="flex flex-col items-center gap-2 pt-2 pb-4">
        <h2 className="text-xl font-semibold text-center truncate w-full" title={playlist.snippet?.title ?? undefined}>
          {playlist.snippet?.title ?? "Loading playlist..."}
        </h2>
      </div>

      {/* Video area skeleton with icon and message */}
      <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted/50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <ListVideo className="h-8 w-8" />
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading playlist...</span>
          </div>
          <div className="text-xs">
            {typeof totalItems === "number" ? (
              <span>
                {loaded} out of {totalItems}
              </span>
            ) : (
              <span>
                Page {loadedPages + 1}
                {typeof totalPages === "number" ? ` of ${totalPages}` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Skeleton controls */}
      <div className="flex items-center justify-center gap-8 py-4">
        <div className="h-12 w-12 rounded-full border bg-muted/40" />
        <div className="h-14 w-14 rounded-full border bg-muted/40" />
        <div className="h-12 w-12 rounded-full border bg-muted/40" />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 pt-2">
        <div className="flex-1 h-px bg-border"></div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Playlist</h3>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      {/* Skeleton list items */}
      <ul className="grid grid-cols-1 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="flex items-start gap-3 rounded-md border p-3">
            <div className="h-16 w-28 rounded bg-muted/50" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted/50" />
              <div className="h-3 w-1/3 rounded bg-muted/40" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="h-6 w-6 rounded border bg-muted/40" />
              <div className="h-6 w-6 rounded border bg-muted/40" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}


