"use client";

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Player } from "~/components/playlist/Player";
import { PlaylistGrid } from "~/components/playlist/PlaylistGrid";

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
        {!playlist.playlistId && <h1 className="text-3xl font-bold">Sleepytime-YouTube</h1>}
        {!playlist.playlistId && (
          <div className="space-y-4">
            <p className="text-lg text-muted-foreground text-center">
              Having trouble sleeping? Bothersome having to keep hitting play and skipping ads? Add a sleep timer, auto-removal and darker mode to your playlists.
            </p>
            <form onSubmit={onSubmit} className="flex w-full items-center gap-3">
              <Input
                type="url"
                placeholder="https://www.youtube.com/playlist?list=..."
                className="h-12 text-lg flex-1"
                aria-label="YouTube playlist URL"
                {...register("url", { required: true })}
              />
              <Button type="submit" className="h-12 px-6">
                Load Playlist
              </Button>
            </form>
            <div className="text-center">
              <a 
                href="/?list=PLPX6lu9kG1JXEdTsF1GSWzZ8qQA_3aUMs" 
                className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
              >
                Try it out with some slowedReverb →
              </a>
            </div>
            <div className="mt-5">
              <Image
                src="/sleepytime-underwood.jpg"
                alt="Sleepytime Celestial Seasonings Bear - by Underwood"
                width={1200}
                height={600}
                className="rounded-md w-full h-auto opacity-40 hover:opacity-100 transition-opacity duration-300"
              />
            </div>
            {/* Divider + Grid */}
            <PlaylistGrid />
          </div>
        )}

        {playlist.error && <p className="text-sm text-destructive">{playlist.error}</p>}

        {playlist.isLoading && <p>Loading playlist…</p>}

        {playlist.items && playlist.items.length > 0 && <Player />}
      </div>
    </main>
  );
}


