"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Player } from "~/components/playlist/Player";
import { SkeletonPlayer } from "~/components/playlist/SkeletonPlayer";

function PlayerPageContent() {
  const playlist = usePlaylist();
  const router = useRouter();
  const searchParams = useSearchParams();
  const listParam = searchParams.get("list");

  // Only redirect if there's no list parameter AND no playlist loaded
  // The PlaylistContext will handle loading from the URL parameter
  useEffect(() => {
    if (!listParam && !playlist.playlistId && !playlist.isLoading) {
      router.push("/");
    }
  }, [listParam, playlist.playlistId, playlist.isLoading, router]);

  // Show loading state if loading or if we have a list param but no playlist yet
  if (playlist.isLoading || (listParam && !playlist.playlistId)) {
    return (
      <main className="flex min-h-screen items-start justify-center px-[10px] py-6 pb-24">
        <div className="w-full max-w-[720px] space-y-6">
          <SkeletonPlayer />
        </div>
      </main>
    );
  }

  // Show player if we have items
  if (playlist.playlistId && playlist.items && playlist.items.length > 0) {
    return (
      <main className="flex min-h-screen items-start justify-center px-[10px] py-6 pb-24">
        <div className="w-full max-w-[720px] space-y-6">
          <Player />
        </div>
      </main>
    );
  }

  // Fallback - will redirect via useEffect
  return null;
}

export default function PlayerPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-start justify-center px-[10px] py-6 pb-24">
        <div className="w-full max-w-[720px] space-y-6">
          <SkeletonPlayer />
        </div>
      </main>
    }>
      <PlayerPageContent />
    </Suspense>
  );
}

