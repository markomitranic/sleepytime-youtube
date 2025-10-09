"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Search, AlertCircle, Eye } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { getOriginalVideoTitle, searchYouTube, type YouTubeSearchResult } from "~/lib/videoReplace";
import { env } from "~/env";
import { useAuth } from "~/components/auth/useAuth";
import { VideoPreviewDialog } from "./VideoPreviewDialog";
import { ManualSearchDialog } from "./ManualSearchDialog";

type ReplaceVideoDrawerProps = {
  children: React.ReactNode;
  videoId: string | undefined;
  onReplaceVideo: (newVideoId: string) => Promise<void>;
};

type LoadingState = "idle" | "fetching-title" | "searching" | "replacing";

export function ReplaceVideoDrawer({ children, videoId, onReplaceVideo }: ReplaceVideoDrawerProps) {
  const auth = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [originalTitle, setOriginalTitle] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<YouTubeSearchResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isManualSearchOpen, setIsManualSearchOpen] = useState(false);

  // Reset state when drawer opens
  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      setLoadingState("idle");
      setOriginalTitle(null);
      setSearchResults([]);
      setError(null);
    }
  }, []);

  // Automatically start the search process when drawer opens
  useEffect(() => {
    if (!isOpen || !videoId) return;
    
    async function searchForAlternatives() {
      try {
        // Step 1: Try to get the original title from Wayback Machine
        setLoadingState("fetching-title");
        setError(null);
        
        const title = await getOriginalVideoTitle(videoId!);
        
        if (!title) {
          setError("Could not find the original video title in the Wayback Machine archive. The video may not have been archived or the archive may be incomplete.");
          setLoadingState("idle");
          return;
        }
        
        setOriginalTitle(title);
        
        // Step 2: Search YouTube for alternatives
        setLoadingState("searching");
        
        const results = await searchYouTube({
          query: title,
          apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
          accessToken: auth.accessToken,
          maxResults: 10,
          refreshToken: auth.getTokenSilently,
        });
        
        setSearchResults(results);
        setLoadingState("idle");
        
        if (results.length === 0) {
          setError(`Found the original title "${title}" but no alternative videos were found. Try searching manually with a different search term.`);
        }
      } catch (err) {
        console.error("Error searching for alternatives:", err);
        setError((err as Error)?.message ?? "An error occurred while searching for alternatives.");
        setLoadingState("idle");
      }
    }
    
    searchForAlternatives();
  }, [isOpen, videoId, auth.accessToken, auth.getTokenSilently]);

  const handleSelectVideo = useCallback(async (selectedVideoId: string) => {
    setLoadingState("replacing");
    setError(null);
    
    try {
      await onReplaceVideo(selectedVideoId);
      setIsOpen(false);
    } catch (err) {
      console.error("Error replacing video:", err);
      setError((err as Error)?.message ?? "Failed to replace video.");
      setLoadingState("idle");
    }
  }, [onReplaceVideo]);

  const handlePreviewVideo = useCallback((video: YouTubeSearchResult) => {
    setPreviewVideo(video);
    setIsPreviewOpen(true);
  }, []);

  const handlePreviewAccept = useCallback(async (videoId: string) => {
    setIsPreviewOpen(false);
    setPreviewVideo(null);
    await handleSelectVideo(videoId);
  }, [handleSelectVideo]);

  const handlePreviewClose = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewVideo(null);
  }, []);

  const handleManualSearch = useCallback(() => {
    setIsManualSearchOpen(true);
  }, []);

  const handleManualSearchClose = useCallback(() => {
    setIsManualSearchOpen(false);
  }, []);

  const handleManualSearchSelect = useCallback(async (videoId: string) => {
    setIsManualSearchOpen(false);
    await handleSelectVideo(videoId);
  }, [handleSelectVideo]);

  const isLoading = loadingState !== "idle";

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-2xl max-h-[80vh] flex flex-col">
          <DrawerHeader>
            <DrawerTitle>Search for Alternatives</DrawerTitle>
            <DrawerDescription>
              The original video was removed, but we&apos;ve attempted to find alternative versions.
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto px-4">
            {/* Loading state */}
            {loadingState === "fetching-title" && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Searching Wayback Machine for original title...</p>
              </div>
            )}
            
            {loadingState === "searching" && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Searching YouTube for: <span className="font-medium">{originalTitle}</span>
                </p>
              </div>
            )}
            
            {loadingState === "replacing" && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Replacing video...</p>
              </div>
            )}
            
            {/* Error state */}
            {error && loadingState === "idle" && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="size-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertCircle className="size-6 text-red-500" />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-md">{error}</p>
                {originalTitle && (
                  <button
                    onClick={handleManualSearch}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    Try it yourself →
                  </button>
                )}
              </div>
            )}
            
            {/* Results list */}
            {!isLoading && !error && searchResults.length > 0 && (
              <div className="space-y-3 pb-4">
                {originalTitle && (
                  <div className="pb-2 border-b">
                    <p className="text-sm text-muted-foreground">
                      Original title: <span className="font-medium text-foreground">{originalTitle}</span>
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <div
                      key={result.videoId}
                      className="w-full flex items-start gap-3 p-3 rounded-lg border hover:bg-secondary transition-colors"
                    >
                      {/* Thumbnail */}
                      {result.thumbnailUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={result.thumbnailUrl}
                          alt="thumbnail"
                          className="h-20 w-36 rounded object-cover flex-shrink-0"
                        />
                      )}
                      
                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium line-clamp-2">{result.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{result.channelTitle}</p>
                        {result.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {result.description}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewVideo(result)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSelectVideo(result.videoId)}
                          className="flex items-center gap-2"
                        >
                          Use This
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Empty state when not loading and no results */}
            {!isLoading && !error && searchResults.length === 0 && loadingState === "idle" && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to search for alternatives</p>
              </div>
            )}
          </div>
          
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline" disabled={isLoading}>
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
      
      {/* Video Preview Dialog */}
      <VideoPreviewDialog
        video={previewVideo}
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        onAccept={handlePreviewAccept}
      />
      
      {/* Manual Search Dialog */}
      <ManualSearchDialog
        isOpen={isManualSearchOpen}
        onClose={handleManualSearchClose}
        onSelectVideo={handleManualSearchSelect}
        initialQuery={originalTitle || ""}
      />
    </Drawer>
  );
}
