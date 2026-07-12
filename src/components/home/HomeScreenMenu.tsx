"use client";

import { useEffect, useRef, useState } from "react";
import { HomeContent } from "~/components/home/HomeContent";
import { usePlaylist } from "~/components/playlist/PlaylistContext";

/** The homepage lays out against this virtual width, then zooms to fit the glass. */
const VIRTUAL_WIDTH = 640;

/**
 * The player's menu channel: the live homepage rendered inside the screen
 * glass whenever no tape is loaded. Scrollable and fully interactive —
 * tapping a playlist card loads it right here, no navigation.
 *
 * Content is laid out at a 640px virtual viewport and scaled down with CSS
 * `zoom` (real reflow, crisp text) to fit whatever size the screen is.
 * Carries its own aurora so the TV shows the full homepage scene.
 * @example {!currentVideoId && <HomeScreenMenu />}
 */
export function HomeScreenMenu() {
	const playlist = usePlaylist();
	const hostRef = useRef<HTMLDivElement>(null);
	const [zoom, setZoom] = useState(1);

	useEffect(() => {
		const host = hostRef.current;
		if (!host) return;
		const observer = new ResizeObserver(([entry]) => {
			const width = entry?.contentRect.width ?? 0;
			if (width > 0) setZoom(Math.min(1, width / VIRTUAL_WIDTH));
		});
		observer.observe(host);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={hostRef} className="absolute inset-0 z-10 overflow-hidden">
			<div className="aurora-background absolute" aria-hidden="true" />
			<div
				className="absolute inset-0 overflow-y-auto overscroll-contain"
				style={{ zoom }}
			>
				<HomeContent
					variant="screen"
					onSelectPlaylist={(id) => void playlist.loadByPlaylistId(id)}
				/>
			</div>
		</div>
	);
}
