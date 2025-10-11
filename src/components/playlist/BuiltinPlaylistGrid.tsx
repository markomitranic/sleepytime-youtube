"use client";

import { Badge } from "~/components/ui/badge";
import { useBuiltinPlaylists } from "~/lib/queries";
import { useEffect, useRef, useState } from "react";

type BuiltinPlaylistGridProps = {
  hasScrolled?: boolean;
};

export function BuiltinPlaylistGrid({ hasScrolled = false }: BuiltinPlaylistGridProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  // Only load playlists when component is in viewport or user has scrolled
  useEffect(() => {
    if (hasScrolled) {
      setShouldLoad(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasScrolled]);

  const { data: builtinPlaylists, isLoading } = useBuiltinPlaylists(shouldLoad);

  // Only show built-in playlists if we should load them
  const builtinsToRender = shouldLoad ? (builtinPlaylists ?? []) : [];

  return (
    <div ref={ref} className="space-y-4">
      {/* Separator for built-in */}
      <div id="try-it-out" className="flex items-center gap-4 pt-4">
        <div className="flex-1 h-px bg-border"></div>
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Need some inspiration?</h3>
        <div className="flex-1 h-px bg-border"></div>
      </div>

      {/* Built-in playlists grid */}
      {shouldLoad ? (
        <ul className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-300 ${hasScrolled ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
          {isLoading ? (
            // Show loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="animate-pulse">
                <div className="aspect-video w-full rounded-md border bg-secondary/40">
                  <div className="h-full w-full bg-muted/50"></div>
                </div>
                <div className="mt-2 space-y-2">
                  <div className="h-4 bg-muted/50 rounded w-3/4"></div>
                  <div className="h-3 bg-muted/30 rounded w-1/2"></div>
                </div>
              </li>
            ))
          ) : (
            builtinsToRender.map((p) => (
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
            ))
          )}
        </ul>
      ) : (
        // Show placeholder when not loaded yet
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Scroll down to see built-in playlists</p>
        </div>
      )}
    </div>
  );
}
