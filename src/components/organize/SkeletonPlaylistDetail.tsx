"use client";

import { Loader2, ListVideo } from "lucide-react";

type SkeletonPlaylistDetailProps = {
  loadingProgress?: {
    pagesLoaded: number;
    totalPages?: number;
    itemsLoaded: number;
    totalItems?: number;
  } | null;
  playlistTitle?: string;
};

export function SkeletonPlaylistDetail({ loadingProgress, playlistTitle }: SkeletonPlaylistDetailProps) {
  const loaded = loadingProgress?.itemsLoaded ?? 0;
  const totalItems = loadingProgress?.totalItems;
  const loadedPages = loadingProgress?.pagesLoaded ?? 0;
  const totalPages = loadingProgress?.totalPages;

  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton with loading progress */}
      <div className="space-y-4">
        <div className="flex items-start gap-6">
          {/* Large thumbnail skeleton */}
          <div className="w-48 h-27 rounded-lg bg-muted/50 flex-shrink-0 flex items-center justify-center">
            <ListVideo className="h-12 w-12 text-muted-foreground/40" />
          </div>

          {/* Metadata skeleton with loading indicator */}
          <div className="flex-1 space-y-3">
            {playlistTitle ? (
              <h1 className="text-2xl font-bold">{playlistTitle}</h1>
            ) : (
              <div className="h-8 w-2/3 rounded bg-muted/50" />
            )}
            
            <div className="h-4 w-full rounded bg-muted/40" />
            <div className="h-4 w-3/4 rounded bg-muted/40" />

            <div className="flex flex-col gap-2 pt-2">
              {/* Loading progress */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading playlist...</span>
              </div>
              
              <div className="text-xs text-muted-foreground">
                {typeof totalItems === "number" ? (
                  <span>
                    {loaded} of {totalItems} videos loaded
                  </span>
                ) : (
                  <span>
                    Page {loadedPages + 1}
                    {typeof totalPages === "number" ? ` of ${totalPages}` : ""}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {typeof totalItems === "number" && totalItems > 0 && (
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div 
                    className="h-full bg-primary/60 transition-all duration-300"
                    style={{ width: `${(loaded / totalItems) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between border-t border-b py-3">
        <div className="h-6 w-20 rounded bg-muted/50" />
        <div className="h-9 w-24 rounded bg-muted/40" />
      </div>

      {/* Video list skeleton */}
      <ul className="space-y-2">
        {Array.from({ length: Math.min(8, Math.max(3, loaded || 3)) }).map((_, i) => (
          <li key={i} className="flex items-start gap-3 rounded-md border py-3 pr-3">
            <div className="w-10 inline-flex items-center justify-center flex-shrink-0">
              <div className="h-5 w-5 rounded bg-muted/40" />
            </div>
            <div className="h-16 w-28 rounded bg-muted/50 flex-shrink-0 -ml-3" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-muted/50" />
              <div className="h-3 w-1/3 rounded bg-muted/40" />
            </div>
            <div className="h-8 w-8 rounded bg-muted/40 self-center flex-shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}

