"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { usePlayer } from "~/components/playlist/PlayerContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";
import { cn } from "~/lib/utils";

export function StickyPlayerBar() {
	const playlist = usePlaylist();
	const player = usePlayer();
	const pathname = usePathname();
	const router = useRouter();
	const { isFadedOut } = useSleepyFadeout();

	const currentVideo = playlist.items.find(
		(item) => item.videoId === playlist.currentVideoId,
	);

	if (!currentVideo || !currentVideo.videoId) return null;

	const progress =
		player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0;

	const handleNavigate = () => {
		if (pathname === "/player") {
			window.scrollTo({ top: 0, behavior: "smooth" });
		} else {
			router.push("/player");
		}
	};

	const handlePlayPause = () => {
		if (!player.playerInstance) return;
		if (player.isPlaying) {
			player.playerInstance.pauseVideo();
		} else {
			player.playerInstance.playVideo();
		}
	};

	return (
		<div
			className={cn(
				"fixed bottom-16 left-0 right-0 z-50 bg-linear-to-b from-background/70 to-background/90 transition-opacity duration-1000",
				isFadedOut && "opacity-0",
			)}
		>
			<div className="flex items-center gap-3 h-14 px-3 max-w-3xl mx-auto">
				<button
					type="button"
					onClick={handleNavigate}
					className="shrink-0 hover:opacity-80 transition-opacity"
				>
					{currentVideo.thumbnailUrl ? (
						<Image
							src={currentVideo.thumbnailUrl}
							alt={currentVideo.title}
							className="h-10 w-18 rounded object-cover"
							width={72}
							height={40}
						/>
					) : (
						<div className="h-10 w-18 rounded bg-muted" />
					)}
				</button>

				<button
					type="button"
					onClick={handleNavigate}
					className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
				>
					<p className="text-sm font-medium truncate">{currentVideo.title}</p>
					<div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
						<div
							className="h-full bg-white transition-all duration-100"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</button>

				<button
					type="button"
					onClick={handlePlayPause}
					className="h-9 w-9 rounded-full bg-white text-black flex items-center justify-center shrink-0 hover:bg-white/90 transition-colors"
					aria-label={player.isPlaying ? "Pause" : "Play"}
				>
					{player.isPlaying ? (
						<Pause className="h-4 w-4" />
					) : (
						<Play className="h-4 w-4 ml-0.5" />
					)}
				</button>
			</div>
		</div>
	);
}
