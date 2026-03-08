"use client";

import { Moon, SkipForward } from "lucide-react";
import { useEffect } from "react";
import { SleepTimerDrawer } from "~/components/playlist/SleepTimerDrawer";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";
import { MetalPlayButton } from "~/components/ui/MetalPlayButton";
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
				"flex-1 flex flex-col gap-4 transition-opacity duration-1000",
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

			<div className="flex items-center justify-center gap-8 py-2">
				<SleepTimerDrawer>
					<button
						type="button"
						className={`hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full transition focus-visible:ring-[3px] ${
							sleepTimerIsActive
								? "text-white border-2 border-white"
								: "text-muted-foreground"
						}`}
						aria-label={
							sleepTimerIsActive
								? "Sleep timer active - click to modify"
								: "Set sleep timer"
						}
					>
						<Moon className="h-5 w-5" />
					</button>
				</SleepTimerDrawer>

				<MetalPlayButton
					isPlaying={isPlaying}
					onClick={onPlayPause}
					size="lg"
				/>

				<button
					type="button"
					onClick={onNext}
					className="hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full border text-muted-foreground transition focus-visible:ring-[3px] hover:text-foreground"
					aria-label="Next video"
				>
					<SkipForward className="h-5 w-5" />
				</button>
			</div>
		</div>
	);
}
