"use client";

import { Player } from "~/components/playlist/Player";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { SkeletonPlayer } from "~/components/playlist/SkeletonPlayer";

export default function PlayerPage() {
	const playlist = usePlaylist();

	if (playlist.isLoading) {
		return (
			<main className="h-dvh flex lg:items-center justify-center pt-[env(safe-area-inset-top)] overflow-hidden">
				<div className="h-full max-h-[1024px] w-full max-w-[1366px]">
					<SkeletonPlayer />
				</div>
			</main>
		);
	}

	return (
		<main className="h-dvh flex lg:items-center justify-center pt-[env(safe-area-inset-top)] overflow-hidden">
			{/* Cap = 12.9" iPad Pro landscape (1366x1024 logical px): fills that screen, never grows past it */}
			<div className="h-full max-h-[1024px] w-full max-w-[1366px]">
				<Player />
			</div>
		</main>
	);
}
