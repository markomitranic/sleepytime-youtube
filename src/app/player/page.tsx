"use client";

import { Player } from "~/components/playlist/Player";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { SkeletonPlayer } from "~/components/playlist/SkeletonPlayer";

export default function PlayerPage() {
	const playlist = usePlaylist();

	if (playlist.isLoading) {
		return (
			<main className="h-screen flex items-center justify-center pt-[env(safe-area-inset-top)]">
				<div className="w-full max-w-350 px-2.5">
					<SkeletonPlayer />
				</div>
			</main>
		);
	}

	return (
		<main className="h-screen flex items-center justify-center pt-[env(safe-area-inset-top)]">
			<div className="w-full max-w-350 px-2.5">
				<Player />
			</div>
		</main>
	);
}
