"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { usePlayer } from "~/components/playlist/PlayerContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";
import { MetalPlayButton } from "~/components/ui/MetalPlayButton";
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
	const videoMeta = currentVideo ?? playlist.currentVideoMeta;

	if (!playlist.currentVideoId || !videoMeta) return null;

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
				"fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-3 right-3 z-50 max-w-3xl mx-auto rounded-lg bg-[#1e1816] overflow-hidden transition-opacity duration-1000",
				isFadedOut && "opacity-0",
			)}
		>
			<div className="flex items-center gap-3 h-16 px-3 max-w-3xl mx-auto">
				<button
					type="button"
					onClick={handleNavigate}
					className="shrink-0 hover:opacity-80 transition-opacity"
				>
					{videoMeta.thumbnailUrl ? (
						<Image
							src={videoMeta.thumbnailUrl}
							alt={videoMeta.title ?? ""}
							className="h-12 w-12 rounded object-cover"
							width={48}
							height={48}
						/>
					) : (
						<div className="h-12 w-12 rounded bg-muted" />
					)}
				</button>

				<button
					type="button"
					onClick={handleNavigate}
					className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
				>
					<p className="text-sm font-medium truncate">{videoMeta.title}</p>
					{videoMeta.channelTitle && (
						<p className="text-xs text-muted-foreground truncate">
							{videoMeta.channelTitle}
						</p>
					)}
				</button>

				<MetalPlayButton
					isPlaying={player.isPlaying}
					onClick={handlePlayPause}
					size="sm"
				/>
			</div>

			<div className="mx-[10px] h-[3px] bg-muted/50 rounded-full overflow-hidden">
				<div
					className="h-full bg-white rounded-full transition-all duration-100"
					style={{ width: `${progress}%` }}
				/>
			</div>
		</div>
	);
}
