"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { Input } from "~/components/ui/input";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Player } from "~/components/playlist/Player";

export default function HomePage() {
  const playlist = usePlaylist();
  const defaultValues = useMemo(() => ({ url: playlist.url ?? "" }), [playlist.url]);
  const { register, handleSubmit } = useForm<{ url: string }>({ defaultValues });

  const onSubmit = handleSubmit(({ url }) => {
    if (!url) return;
    playlist.loadFromUrl(url);
  });

  return (
    <main className="flex min-h-screen items-start justify-center px-[10px] py-6">
      <div className="w-full max-w-[720px] space-y-6">
        <h1 className="text-3xl font-bold">Enter YouTube Playlist URL</h1>
        {!playlist.playlistId && (
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              type="url"
              placeholder="https://www.youtube.com/playlist?list=..."
              className="h-12 text-lg"
              aria-label="YouTube playlist URL"
              {...register("url", { required: true })}
            />
            {/* Hidden submit so Enter works */}
            <button type="submit" className="sr-only">Load</button>
          </form>
        )}

        {playlist.error && <p className="text-sm text-destructive">{playlist.error}</p>}

        {playlist.isLoading && <p>Loading playlist…</p>}

        {playlist.items && playlist.items.length > 0 && <Player />}
      </div>
    </main>
  );
}


