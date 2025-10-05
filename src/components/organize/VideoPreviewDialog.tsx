"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { Check, X, ExternalLink } from "lucide-react";
import type { YouTubeSearchResult } from "~/lib/videoReplace";

type VideoPreviewDialogProps = {
  video: YouTubeSearchResult | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (videoId: string) => void;
};

export function VideoPreviewDialog({ video, isOpen, onClose, onAccept }: VideoPreviewDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!video) return null;

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await onAccept(video.videoId);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenInYouTube = () => {
    window.open(`https://www.youtube.com/watch?v=${video.videoId}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold line-clamp-2">
            {video.title}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            by {video.channelTitle}
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* YouTube Embed */}
          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
            <iframe
              className="absolute top-0 left-0 w-full h-full rounded-lg"
              src={`https://www.youtube.com/embed/${video.videoId}?autoplay=0&rel=0&modestbranding=1`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Video Details */}
          {video.description && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Description</h4>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {video.description}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInYouTube}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in YouTube
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Dismiss
              </Button>
              <Button
                onClick={handleAccept}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                {isLoading ? "Accepting..." : "Accept"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
