"use client";

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Loader2, Search, Eye } from "lucide-react";
import { searchYouTube, type YouTubeSearchResult } from "~/lib/videoReplace";
import { useAuth } from "~/components/auth/useAuth";
import { env } from "~/env";
import { VideoPreviewDialog } from "./VideoPreviewDialog";

type ManualSearchDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (videoId: string) => void;
  initialQuery?: string;
};

export function ManualSearchDialog({ 
  isOpen, 
  onClose, 
  onSelectVideo, 
  initialQuery = "" 
}: ManualSearchDialogProps) {
  const auth = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewVideo, setPreviewVideo] = useState<YouTubeSearchResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setSearchResults([]);
      setError(null);
      if (initialQuery) {
        handleSearch();
      }
    }
  }, [isOpen, initialQuery]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const results = await searchYouTube({
        query: query.trim(),
        apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
        accessToken: auth.accessToken,
        maxResults: 10,
        refreshToken: auth.getTokenSilently,
      });

      setSearchResults(results);

      if (results.length === 0) {
        setError("No videos found for this search. Try different keywords.");
      }
    } catch (err) {
      console.error("Error searching YouTube:", err);
      setError((err as Error)?.message ?? "An error occurred while searching.");
    } finally {
      setIsSearching(false);
    }
  }, [query, auth.accessToken, auth.getTokenSilently]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePreviewVideo = useCallback((video: YouTubeSearchResult) => {
    setPreviewVideo(video);
    setIsPreviewOpen(true);
  }, []);

  const handlePreviewAccept = useCallback(async (videoId: string) => {
    setIsPreviewOpen(false);
    setPreviewVideo(null);
    onSelectVideo(videoId);
  }, [onSelectVideo]);

  const handlePreviewClose = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewVideo(null);
  }, []);

  const handleSelectVideo = useCallback((videoId: string) => {
    onSelectVideo(videoId);
  }, [onSelectVideo]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Search for Alternative Video</DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-4 px-1.5">
            {/* Search Input */}
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter search terms..."
                className="flex-1"
              />
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !query.trim()}
                className="flex items-center gap-2"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search
              </Button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Found {searchResults.length} video{searchResults.length !== 1 ? 's' : ''}
                </h3>
                
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

            {/* Empty State */}
            {!isSearching && searchResults.length === 0 && !error && query && (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Search className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Enter search terms to find videos</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <VideoPreviewDialog
        video={previewVideo}
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        onAccept={handlePreviewAccept}
      />
    </>
  );
}
