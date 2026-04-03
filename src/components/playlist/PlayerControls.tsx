"use client";

import { useEffect } from "react";
import { PlayerButtons } from "~/components/playlist/PlayerButtons";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";
import { cn } from "~/lib/utils";
import type { YouTubePlaylistItem } from "~/lib/youtube";

export function PlayerControls({
	currentVideo,
	isPlaying,
	sleepTimerIsActive,
	onPlayPause,
	onNext,
}: {
	currentVideo: YouTubePlaylistItem | undefined;
	isPlaying: boolean;
	sleepTimerIsActive: boolean;
	onPlayPause: () => void;
	onNext: () => void;
}) {
	const { isFadedOut } = useSleepyFadeout();

	// Spacebar for play/pause
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
		<div
			className={cn(
				"flex-1 flex flex-col gap-4 pt-2 pb-4 lg:pt-0 transition-opacity duration-1000",
				isFadedOut && "opacity-25",
			)}
		>
			<div>
				<h2 className="text-xl font-semibold">{currentVideo?.title ?? ""}</h2>
				{currentVideo?.channelTitle && (
					<p className="text-sm text-muted-foreground">
						{currentVideo.channelTitle}
					</p>
				)}
			</div>

			<PlayerButtons
				sleepTimerIsActive={sleepTimerIsActive}
				isPlaying={isPlaying}
				onPlayPause={onPlayPause}
				onNext={onNext}
			/>
		</div>
	);
}
