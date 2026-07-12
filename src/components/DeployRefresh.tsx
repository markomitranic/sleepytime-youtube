"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "~/components/playlist/PlayerContext";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const RELOAD_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * Hard-reloads the app when a new deployment goes live.
 *
 * Polls /api/version every few minutes (and whenever the app returns to the
 * foreground) and compares it against the build id baked into this bundle.
 * Never reloads mid-playback — if a video is playing, the reload waits for
 * the next pause so a nighttime deploy can't interrupt the lullaby. A
 * cooldown stopper prevents reload loops if the edge briefly keeps serving
 * the old bundle. No-op in dev, where the build id is always "dev".
 * @example <DeployRefresh />
 */
export function DeployRefresh() {
	const player = usePlayer();
	const staleRef = useRef(false);
	const isPlayingRef = useRef(player.isPlaying);
	isPlayingRef.current = player.isPlaying;

	// Playback just stopped with a reload pending — take the chance
	useEffect(() => {
		if (!player.isPlaying && staleRef.current) reload();
	}, [player.isPlaying]);

	useEffect(() => {
		const current = process.env.NEXT_PUBLIC_BUILD_ID;
		if (!current || current === "dev") return;

		const check = async () => {
			try {
				const res = await fetch("/api/version", { cache: "no-store" });
				const { version } = (await res.json()) as { version?: string };
				if (version && version !== current) staleRef.current = true;
			} catch {
				// Offline or flaky network — try again next round
			}
			if (staleRef.current && !isPlayingRef.current) reload();
		};

		// Re-check whenever the app comes back to the foreground. Background
		// tabs throttle the interval, so a reopen is the realistic trigger:
		// visibilitychange (tab switch), focus (window regains focus), and
		// pageshow (bfcache restore — the common mobile-PWA reopen, where the
		// old bundle keeps running and no fresh load happens).
		const onForeground = () => {
			if (document.visibilityState === "visible") void check();
		};

		const interval = setInterval(check, CHECK_INTERVAL_MS);
		document.addEventListener("visibilitychange", onForeground);
		window.addEventListener("focus", onForeground);
		window.addEventListener("pageshow", onForeground);
		return () => {
			clearInterval(interval);
			document.removeEventListener("visibilitychange", onForeground);
			window.removeEventListener("focus", onForeground);
			window.removeEventListener("pageshow", onForeground);
		};
	}, []);

	return null;
}

/** Reload at most once per cooldown window, in case the edge still serves the old bundle. */
function reload() {
	const last = Number(sessionStorage.getItem("deploy-reload-at") ?? 0);
	if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
	sessionStorage.setItem("deploy-reload-at", String(Date.now()));
	window.location.reload();
}
