"use client";

import { useEffect, useRef, useState } from "react";
import { BUILTIN_PLAYLISTS } from "~/lib/builtinPlaylists";
import Image from "next/image";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { BuiltinPlaylistGrid } from "~/components/playlist/BuiltinPlaylistGrid";
import { useAuth } from "~/components/auth/useAuth";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import { Github, Linkedin, ExternalLink } from "lucide-react";

export default function HomePage() {
  const playlist = usePlaylist();
  const auth = useAuth();

  const [labelText, setLabelText] = useState<string>("slowedReverb");
  const [hasScrolled, setHasScrolled] = useState<boolean>(false);
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
    function handleScroll() {
      const scrollY = window.scrollY;
      setHasScrolled(scrollY > 10);
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
    <main className="min-h-screen">
      {/* Hero Section - Full width with responsive padding */}
      <div className="w-full max-w-[1600px] mx-auto px-0 md:px-[40px] pt-5">
        <Image
          src="/sleepytime-underwood.jpg"
          alt="Sleepytime Celestial Seasonings Bear - by Underwood"
          width={1200}
          height={600}
          className={`w-full h-auto rounded-md transition-opacity duration-300 ${hasScrolled ? 'opacity-60' : 'opacity-100'}`}
        />
      </div>

      {/* Content Section - Centered container */}
      <div className="flex justify-center px-[10px] py-6 pb-24">
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
            {/* Built-in playlists only */}
            <BuiltinPlaylistGrid hasScrolled={hasScrolled} />

            {/* CTA Section - Only show if not authenticated */}
            {!auth.isAuthenticated && (
              <div className="mt-12 p-8 rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 text-center space-y-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-bold">Ready to manage your playlists?</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto">
                    Sign in with your YouTube account to access, play, and manage your personal playlists. 
                    Reorder videos, remove unwanted content, and create the perfect sleep experience.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Access your YouTube playlists</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Reorder and manage videos</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span>Set sleep timers</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground/80 max-w-xl mx-auto">
                    <strong>Your privacy matters:</strong> We store nothing on our servers. All data remains in your browser. 
                    No tracking, no analytics, no data collection. Your information stays private.
                  </div>
                </div>

                <Button 
                  onClick={() => auth.signIn()}
                  size="lg"
                  className="px-8 py-3 text-base font-medium"
                >
                  Sign in with Google
                </Button>
              </div>
            )}

            {/* Footer with social links */}
            <div className="flex items-center justify-center gap-6 pt-8 mt-12 border-t">
              <a
                href="https://github.com/markomitranic/sleepytime-youtube"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="View on GitHub"
              >
                <Github className="h-5 w-5" />
                <span className="text-sm">GitHub</span>
              </a>
              
              <a
                href="https://www.linkedin.com/in/marko-mitranic/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="LinkedIn Profile"
              >
                <Linkedin className="h-5 w-5" />
                <span className="text-sm">LinkedIn</span>
              </a>
              
              <a
                href="https://medium.com/homullus"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Medium Blog"
              >
                <ExternalLink className="h-5 w-5" />
                <span className="text-sm">Medium</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


