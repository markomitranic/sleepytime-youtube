"use client";

import { useEffect, useRef, useState } from "react";
import { BUILTIN_PLAYLISTS } from "~/lib/builtinPlaylists";
import Image from "next/image";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { PlaylistGrid } from "~/components/playlist/PlaylistGrid";
import { toast } from "sonner";

export default function HomePage() {
  const playlist = usePlaylist();

  const [labelText, setLabelText] = useState<string>("slowedReverb");
  const typingIndexRef = useRef<number>(0);
  const labelIndexRef = useRef<number>(0);
  const deletingRef = useRef<boolean>(false);
  const timerRef = useRef<number | null>(null);
  const labelsRef = useRef<string[]>([]);

  useEffect(() => {
    labelsRef.current = BUILTIN_PLAYLISTS.map((p) => p.shortLabel);
    if (labelsRef.current.length === 0) return;

    const TYPING_INTERVAL_MS = 60;
    const DELETING_INTERVAL_MS = 40;
    const HOLD_FULL_MS = 1500;
    const BETWEEN_WORDS_MS = 300;

    function schedule(nextInMs: number) {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(tick, nextInMs);
    }

    function tick() {
      const labels = labelsRef.current;
      const currentLabel: string = labels.length > 0 ? (labels[labelIndexRef.current % labels.length] ?? "") : "";
      const at = typingIndexRef.current;
      const deleting = deletingRef.current;

      if (!deleting) {
        // typing forward
        const next = currentLabel.slice(0, at + 1);
        setLabelText(next);
        typingIndexRef.current = at + 1;
        if (currentLabel.length > 0 && next.length === currentLabel.length) {
          // hold full word, then start deleting
          deletingRef.current = true;
          schedule(HOLD_FULL_MS);
        } else {
          schedule(TYPING_INTERVAL_MS);
        }
      } else {
        // deleting
        const next = currentLabel.slice(0, Math.max(0, at - 1));
        setLabelText(next);
        typingIndexRef.current = Math.max(0, at - 1);
        if (next.length === 0) {
          // move to next word and start typing
          deletingRef.current = false;
          labelIndexRef.current = labels.length > 0 ? (labelIndexRef.current + 1) % labels.length : 0;
          schedule(BETWEEN_WORDS_MS);
        } else {
          schedule(DELETING_INTERVAL_MS);
        }
      }
    }

    // init
    typingIndexRef.current = 0;
    labelIndexRef.current = 0;
    deletingRef.current = false;
    setLabelText("");
    schedule(200);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!playlist.error) return;
    const message = playlist.error;
    const technical = playlist.errorDetails ?? "";
    const payload = technical && technical !== message ? `${message}\n\nTechnical details:\n${technical}` : message;
    toast.error(message, {
      action: {
        label: "Copy error",
        onClick: () => {
          try {
            navigator.clipboard.writeText(payload);
          } catch {}
        },
      },
    });
  }, [playlist.error, playlist.errorDetails]);

  return (
    <main className="flex min-h-screen items-start justify-center px-[10px] py-6 pb-24">
      <div className="w-full max-w-[720px] space-y-6">
        <h1 className="text-3xl font-bold">Sleepytime-YouTube</h1>
        <div className="space-y-5">
          <p className="text-lg text-muted-foreground text-center">
            Having trouble sleeping? Bothersome having to keep hitting play and skipping ads? Add a sleep timer, auto-removal and darker mode to your playlists.
          </p>
          <div className="text-center">
            <a 
              href="#try-it-out"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("try-it-out");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
            >
              Try it out with some <span className="tabular-nums">{labelText}</span> →
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
      </div>
    </main>
  );
}


