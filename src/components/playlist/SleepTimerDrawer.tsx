"use client";

import { useCallback, useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

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
import { usePlaylist } from "~/components/playlist/PlaylistContext";

type SleepTimerDrawerProps = {
  children: React.ReactNode;
};

export function SleepTimerDrawer({ children }: SleepTimerDrawerProps) {
  const playlist = usePlaylist();
  const [tempMinutes, setTempMinutes] = useState(playlist.sleepTimer.durationMinutes);

  const handleAdjust = useCallback((adjustment: number) => {
    setTempMinutes(prev => Math.max(5, Math.min(180, prev + adjustment)));
  }, []);

  const handleConfirm = useCallback(() => {
    playlist.setSleepTimer(tempMinutes);
  }, [playlist, tempMinutes]);

  const handleDeactivate = useCallback(() => {
    playlist.deactivateSleepTimer();
  }, [playlist]);

  // Reset temp value when drawer opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      setTempMinutes(playlist.sleepTimer.durationMinutes);
    }
  }, [playlist.sleepTimer.durationMinutes]);

  return (
    <Drawer onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Sleep Timer</DrawerTitle>
            <DrawerDescription>
              Set how many minutes to play before automatically stopping.
            </DrawerDescription>
          </DrawerHeader>
          <div className="p-4 pb-0">
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={() => handleAdjust(-5)}
                disabled={tempMinutes <= 5}
              >
                <Minus />
                <span className="sr-only">Decrease</span>
              </Button>
              <div className="flex-1 text-center">
                <div className="text-7xl font-bold tracking-tighter">
                  {tempMinutes}
                </div>
                <div className="text-muted-foreground text-[0.70rem] uppercase">
                  minutes
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-full"
                onClick={() => handleAdjust(5)}
                disabled={tempMinutes >= 180}
              >
                <Plus />
                <span className="sr-only">Increase</span>
              </Button>
            </div>
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Timer will stop playback after {tempMinutes} minute{tempMinutes !== 1 ? 's' : ''}
              </p>
              {playlist.sleepTimer.isActive && (
                <p className="mt-1 text-xs text-green-600">
                  Current timer: {Math.ceil((playlist.sleepTimer.remainingSeconds || 0) / 60)} minutes remaining
                </p>
              )}
            </div>
          </div>
          <DrawerFooter>
            <Button onClick={handleConfirm}>
              {playlist.sleepTimer.isActive ? 'Update Timer' : 'Start Timer'}
            </Button>
            <div className="flex gap-2">
              {playlist.sleepTimer.isActive && (
                <Button variant="outline" onClick={handleDeactivate} className="flex-1">
                  Stop Timer
                </Button>
              )}
              <DrawerClose asChild>
                <Button variant="outline" className="flex-1">
                  Close
                </Button>
              </DrawerClose>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
