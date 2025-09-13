"use client";

import { useCallback } from "react";
import { Code, List, X, Moon } from "lucide-react";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export function DevToolbar() {
  const playlist = usePlaylist();

  const handleSetTestPlaylist = useCallback(async () => {
    await playlist.loadByPlaylistId("PLPX6lu9kG1JXEdTsF1GSWzZ8qQA_3aUMs");
  }, [playlist]);

  const handleClear = useCallback(() => {
    playlist.clear();
  }, [playlist]);

  const handleSleep = useCallback(() => {
    playlist.triggerSleep(); // Immediately trigger sleep action
  }, [playlist]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            aria-label="Development tools"
          >
            <Code className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" side="top" className="w-32">
          <DropdownMenuItem onClick={handleSetTestPlaylist} className="gap-2">
            <List className="h-4 w-4" />
            List
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleClear} className="gap-2">
            <X className="h-4 w-4" />
            Clear
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={handleSleep} className="gap-2">
            <Moon className="h-4 w-4" />
            Sleep
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
