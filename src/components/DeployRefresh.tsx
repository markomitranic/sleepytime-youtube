"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { usePlayer } from "~/components/playlist/PlayerContext";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const RELOAD_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * Hard-reloads the app when a new deployment goes live.
 *
 * A React Query polls /api/version (the live deploy's build id) and compares
 * it to the id baked into this bundle. The global QueryClient disables all
 * auto-refetch, so this query opts back in: it polls every few minutes and
 * refetches on window-focus + reconnect, so a reopened or reconnected client
 * notices a new deploy promptly. Never reloads mid-playback — a running video
 * defers the reload to the next pause so a nighttime deploy can't cut off the
 * lullaby. A cooldown stopper prevents reload loops if the edge briefly keeps
 * serving the old bundle. No-op in dev, where the build id is always "dev".
 * @example <DeployRefresh />
 */
export function DeployRefresh() {
	const player = usePlayer();
	const current = process.env.NEXT_PUBLIC_BUILD_ID;
	const enabled = !!current && current !== "dev";

	const { data: liveVersion } = useQuery({
		queryKey: ["deploy-version"],
		queryFn: async () => {
			const res = await fetch("/api/version", { cache: "no-store" });
			const { version } = (await res.json()) as { version?: string };
			return version ?? null;
		},
		enabled,
		staleTime: 0,
		refetchInterval: CHECK_INTERVAL_MS,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		refetchOnMount: true,
	});

	const stale = enabled && !!liveVersion && liveVersion !== current;

	// Reload once stale — immediately if idle, otherwise when playback stops.
	useEffect(() => {
		if (stale && !player.isPlaying) reload();
	}, [stale, player.isPlaying]);

	return null;
}

/** Reload at most once per cooldown window, in case the edge still serves the old bundle. */
function reload() {
	const last = Number(sessionStorage.getItem("deploy-reload-at") ?? 0);
	if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
	sessionStorage.setItem("deploy-reload-at", String(Date.now()));
	window.location.reload();
}
