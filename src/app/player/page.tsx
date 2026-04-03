"use client";

import { Player } from "~/components/playlist/Player";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { SkeletonPlayer } from "~/components/playlist/SkeletonPlayer";

export default function PlayerPage() {
	const playlist = usePlaylist();

	if (playlist.isLoading) {
		return (
			<main className="h-dvh flex lg:items-center justify-center pt-[env(safe-area-inset-top)] overflow-hidden">
				<div className="w-full max-w-350 h-full">
					<SkeletonPlayer />
				</div>
			</main>
		);
	}

	return (
		<main className="h-dvh flex lg:items-center justify-center pt-[env(safe-area-inset-top)] overflow-hidden">
			<div className="w-full max-w-350 h-full">
				<Player />
			</div>
		</main>
	);
}
