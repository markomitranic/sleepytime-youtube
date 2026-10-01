"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const CHECK_EVENTS = ["visibilitychange", "focus", "pageshow", "online"];

/**
 * Prompts a reload when a new deployment goes live.
 *
 * Checks /api/version every few minutes and on every return to the app: tab
 * or app switch, focus, back-forward restore, reconnect. iOS home-screen apps
 * resume without firing all of these, so all are watched. A stale bundle gets
 * a persistent, dismissible toast that re-appears on each check.
 * No-op in dev, where the build id is always "dev".
 * @example <DeployRefresh />
 */
export function DeployRefresh() {
	const current = process.env.NEXT_PUBLIC_BUILD_ID;
	const enabled = !!current && current !== "dev";

	const {
		data: liveVersion,
		dataUpdatedAt,
		refetch,
	} = useQuery({
		queryKey: ["deploy-version"],
		queryFn: async () => {
			const res = await fetch("/api/version", { cache: "no-store" });
			const { version } = (await res.json()) as { version?: string };
			return version ?? null;
		},
		enabled,
		staleTime: 0,
		refetchInterval: CHECK_INTERVAL_MS,
		refetchOnMount: true,
	});

	useEffect(() => {
		if (!enabled) return;

		const check = () => {
			if (document.visibilityState === "visible") refetch();
		};

		for (const event of CHECK_EVENTS) window.addEventListener(event, check);
		return () => {
			for (const event of CHECK_EVENTS)
				window.removeEventListener(event, check);
		};
	}, [enabled, refetch]);

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
