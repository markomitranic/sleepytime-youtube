"use client";

import { usePlayer } from "~/components/playlist/PlayerContext";
import { formatDuration } from "~/lib/formatTime";
import type { YouTubePlaylistItem } from "~/lib/youtube";

type VideoThumbnailProps = {
	item: YouTubePlaylistItem;
};

export function VideoThumbnail({ item }: VideoThumbnailProps) {
	const { getSavedProgress } = usePlayer();
	const savedTime = item.videoId ? getSavedProgress(item.videoId) : null;
	const watchProgress =
		savedTime && item.durationSeconds
			? Math.min(savedTime / item.durationSeconds, 1)
			: 0;

	if (!item.thumbnailUrl) return null;

	return (
		<div className="relative h-16 w-28 rounded flex-shrink-0">
			{/* biome-ignore lint/performance/noImgElement: external URL */}
			<img
				src={item.thumbnailUrl}
				alt="thumbnail"
				className="h-full w-full rounded object-cover"
			/>
			{item.durationSeconds !== undefined && (
				<div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
					{formatDuration(item.durationSeconds)}
				</div>
			)}
			{watchProgress > 0 && (
				<div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/30 rounded-b">
					<div
						className="h-full bg-red-600 rounded-bl"
						style={{ width: `${watchProgress * 100}%` }}
					/>
				</div>
			)}
		</div>
	);
}
