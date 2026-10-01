"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Prompts a reload when a new deployment goes live.
 *
 * Polls /api/version every few minutes and whenever the app is reopened or
 * reconnects, comparing it to the build id baked into this bundle. A stale
 * bundle gets a persistent, dismissible toast that re-appears on each check.
 * No-op in dev, where the build id is always "dev".
 * @example <DeployRefresh />
 */
export function DeployRefresh() {
	const current = process.env.NEXT_PUBLIC_BUILD_ID;
	const enabled = !!current && current !== "dev";

	const { data: liveVersion, dataUpdatedAt } = useQuery({
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

	useEffect(() => {
		if (!stale || !dataUpdatedAt) return;
		toast("New version of the app is out", {
			id: "deploy-refresh",
			duration: Number.POSITIVE_INFINITY,
			action: { label: "Reload", onClick: () => window.location.reload() },
		});
	}, [stale, dataUpdatedAt]);

	return null;
}
