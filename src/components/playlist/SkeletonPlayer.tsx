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
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)]">
      {/* Left side: Video player and controls (2/3) */}
      <div className="flex-1 lg:w-2/3 flex flex-col gap-4">
        {/* Video area skeleton with icon and message */}
        <div className="aspect-video w-full overflow-hidden rounded-md border bg-muted/50 flex items-center justify-center flex-shrink-0">
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

        {/* Video title and controls */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="h-6 w-2/3 rounded bg-muted/50 mb-2" />
            <div className="h-4 w-1/3 rounded bg-muted/40" />
          </div>

          {/* Skeleton controls */}
          <div className="flex items-center justify-center gap-8 py-2">
            <div className="h-12 w-12 rounded-full border bg-muted/40" />
            <div className="h-14 w-14 rounded-full border bg-muted/40" />
            <div className="h-14 w-14 rounded-full border bg-muted/40" />
            <div className="h-12 w-12 rounded-full border bg-muted/40" />
          </div>
        </div>
      </div>

      {/* Right sidebar: Playlist (1/3) */}
      <div className="lg:w-1/3 flex flex-col border-l pl-4">
        {/* Playlist header */}
        <div className="flex items-center gap-2 pb-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {playlist.snippet?.title ?? "Loading..."}
          </h3>
        </div>

        {/* Skeleton list items */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <ul className="grid grid-cols-1 gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3 rounded-md border py-3 pr-3">
                <div className="w-8 h-16 rounded bg-muted/40 ml-1 flex-shrink-0" />
                <div className="h-16 w-28 rounded bg-muted/50 flex-shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-muted/50" />
                  <div className="h-3 w-1/3 rounded bg-muted/40" />
                </div>
                <div className="h-8 w-8 rounded bg-muted/40 flex-shrink-0 self-center" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}


