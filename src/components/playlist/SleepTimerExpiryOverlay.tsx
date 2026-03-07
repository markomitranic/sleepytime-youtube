"use client";

import { Moon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { usePlaylist } from "~/components/playlist/PlaylistContext";

export function SleepTimerExpiryOverlay({ currentVideoId }: { currentVideoId?: string }) {
  const playlist = usePlaylist();

  if (!playlist.sleepTimer.expired) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6">
      <div className="bg-card rounded-lg p-6 max-w-md w-full space-y-6 text-center border shadow-2xl">
        <div className="flex justify-center">
          <Moon className="h-16 w-16 text-blue-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Time for Bed</h2>
          <p className="text-muted-foreground">
            Your sleep timer has expired. Sweet dreams!
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              playlist.prolongSleepTimer(15);
              if (currentVideoId) playlist.setCurrentVideoId(currentVideoId);
            }}
            className="w-full"
          >
            Prolong for 15 Minutes
          </Button>
          <Button
            onClick={() => playlist.dismissSleepExpiry()}
            variant="outline"
            className="w-full"
          >
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  );
}
