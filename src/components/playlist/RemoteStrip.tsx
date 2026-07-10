"use client";

import { ListVideo, SkipForward } from "lucide-react";
import { useEffect } from "react";
import { LikeButton } from "~/components/playlist/LikeButton";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";
import { MetalPlayButton } from "~/components/ui/MetalPlayButton";
import { NeomorphicIconButton } from "~/components/ui/NeomorphicIconButton";
import { cn } from "~/lib/utils";
import type { YouTubePlaylistItem } from "~/lib/youtube";

/**
 * The "remote control" strip below the video: title/channel on the left, the
 * like/play/next/queue buttons on the right.
 *
 * Owns the spacebar play/pause shortcut (moved here from the old PlayerControls)
 * and the sleepy fade tiers — buttons dim to 50% and the title text to 20% when
 * idle, so the controls stay findable in a dark room without lighting it up.
 * @example <RemoteStrip current={item} currentVideoId={id} isPlaying onPlayPause={fn} onNext={fn} onOpenQueue={fn} />
 */
export function RemoteStrip({
	current,
	currentVideoId,
	isPlaying,
	onPlayPause,
	onNext,
	onOpenQueue,
}: {
	current: YouTubePlaylistItem | undefined;
	currentVideoId: string | undefined;
	isPlaying: boolean;
	onPlayPause: () => void;
	onNext: () => void;
	onOpenQueue: () => void;
}) {
	const { isFadedOut } = useSleepyFadeout();

	// Spacebar for play/pause (lives with the strip now)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code !== "Space" && e.key !== " ") return;
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			)
				return;
			e.preventDefault();
			onPlayPause();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onPlayPause]);

	return (
		<div className="flex shrink-0 items-center gap-4 px-4 pt-3 pb-[calc(4rem+env(safe-area-inset-bottom))]">
			<div
				className={cn(
					"min-w-0 flex-1 transition-opacity duration-1000",
					isFadedOut && "opacity-20",
				)}
			>
				<h2 className="truncate text-lg font-semibold">
					{current?.title ?? ""}
				</h2>
				{current?.channelTitle && (
					<p className="truncate text-sm text-muted-foreground">
						{current.channelTitle}
					</p>
				)}
			</div>

			<div
				className={cn(
					"flex shrink-0 items-center gap-3 transition-opacity duration-1000",
					isFadedOut && "opacity-50",
				)}
			>
				<LikeButton videoId={currentVideoId ?? null} />
				<MetalPlayButton
					isPlaying={isPlaying}
					onClick={onPlayPause}
					size="lg"
				/>
				<NeomorphicIconButton ariaLabel="Next video" onClick={onNext}>
					<SkipForward className="h-5 w-5" />
				</NeomorphicIconButton>
				<NeomorphicIconButton ariaLabel="Open queue" onClick={onOpenQueue}>
					<ListVideo className="h-5 w-5" />
				</NeomorphicIconButton>
			</div>
		</div>
	);
}
