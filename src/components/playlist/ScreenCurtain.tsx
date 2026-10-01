"use client";

import { Pause, Play } from "lucide-react";
import {
	useSleepyFadeout,
	WakeShield,
} from "~/components/SleepyFadeoutContext";

/**
 * The video's curtain, driven by the app-wide idle fade.
 *
 * Faded: invisible and blocking, so a sleepy tap only wakes the UI.
 * Awake: a click-through play/pause icon over the embed's own button, so the
 * tap lands on the real embed. Phones skip it entirely: their embed already
 * reveals controls on the first tap instead of toggling playback.
 * @example <ScreenCurtain isPlaying={player.isPlaying} />
 */
export function ScreenCurtain({ isPlaying }: { isPlaying: boolean }) {
	const { isFadedOut } = useSleepyFadeout();
	const Icon = isPlaying ? Pause : Play;

	return (
		<div className="contents phone:hidden">
			{isFadedOut ? (
				<WakeShield />
			) : (
				<div
					aria-hidden
					className="pointer-events-none absolute top-1/2 left-1/2 z-30 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black text-white"
				>
					<Icon className="size-11" fill="currentColor" strokeWidth={0} />
				</div>
			)}
		</div>
	);
}
