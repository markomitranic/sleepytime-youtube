"use client";

import { usePlaylist } from "~/components/playlist/PlaylistContext";

export function AuroraBackground() {
  const playlist = usePlaylist();
  
  // Don't show aurora if darker is true
  if (playlist.darker) {
    return null;
  }
  
  return <div className="aurora-background" aria-hidden="true" />;
}
