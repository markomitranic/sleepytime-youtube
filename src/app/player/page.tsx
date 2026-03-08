"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Player } from "~/components/playlist/Player";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { SkeletonPlayer } from "~/components/playlist/SkeletonPlayer";

function PlayerPageContent() {
	const playlist = usePlaylist();
	const searchParams = useSearchParams();
	const listParam = searchParams.get("list");

	// Show loading state while playlist is loading
	if (playlist.isLoading || (listParam && !playlist.playlistId)) {
		return (
			<main className="h-screen flex items-center justify-center">
				<div className="w-full max-w-350 px-2.5">
					<SkeletonPlayer />
				</div>
			</main>
		);
	}

	// Always show player (it handles its own empty state)
	return (
		<main className="h-screen flex items-center justify-center">
			<div className="w-full max-w-350 px-2.5">
				<Player />
			</div>
		</main>
	);
}

export default function PlayerPage() {
	return (
		<Suspense
			fallback={
				<main className="h-screen flex items-center justify-center">
					<div className="w-full max-w-350 px-2.5">
						<SkeletonPlayer />
					</div>
				</main>
			}
		>
			<PlayerPageContent />
		</Suspense>
	);
}
