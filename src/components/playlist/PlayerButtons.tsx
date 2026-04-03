"use client";

import { Moon, SkipForward } from "lucide-react";
import { SleepTimerDrawer } from "~/components/playlist/SleepTimerDrawer";
import { MetalPlayButton } from "~/components/ui/MetalPlayButton";
import { cn } from "~/lib/utils";

export function PlayerButtons({
	sleepTimerIsActive,
	isPlaying,
	onPlayPause,
	onNext,
}: {
	sleepTimerIsActive: boolean;
	isPlaying: boolean;
	onPlayPause: () => void;
	onNext: () => void;
}) {
	return (
		<div className={cn("flex items-center justify-center gap-8 py-8")}>
			<SleepTimerDrawer>
				<button
					type="button"
					className={cn(
						"inline-flex h-12 w-12 items-center justify-center rounded-full transition-all duration-150 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50",
						sleepTimerIsActive ? "text-green-300" : "text-muted-foreground",
					)}
					style={{
						background: sleepTimerIsActive ? "#1a231a" : "#221f1b",
						boxShadow: sleepTimerIsActive
							? "0 0 12px rgba(74,222,128,0.25), 0 0 4px rgba(74,222,128,0.15), inset 0 0 8px rgba(74,222,128,0.08)"
							: "3px 3px 6px rgba(0,0,0,0.5), -2px -2px 5px rgba(255,255,255,0.025)",
					}}
					aria-label={
						sleepTimerIsActive
							? "Sleep timer active - click to modify"
							: "Set sleep timer"
					}
				>
					<Moon className="h-5 w-5" />
				</button>
			</SleepTimerDrawer>

			<MetalPlayButton isPlaying={isPlaying} onClick={onPlayPause} size="lg" />

			<button
				type="button"
				onClick={onNext}
				className="inline-flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-all duration-150 active:scale-95 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
				style={{
					background: "#221f1b",
					boxShadow:
						"3px 3px 6px rgba(0,0,0,0.5), -2px -2px 5px rgba(255,255,255,0.025)",
				}}
				aria-label="Next video"
			>
				<SkipForward className="h-5 w-5" />
			</button>
		</div>
	);
}
