"use client";

import { Pause, Play } from "lucide-react";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";

/**
 * Click-through play/pause icon covering the embed's own center button.
 *
 * Shown whenever the UI is awake. Taps pass straight through to the embed,
 * since mobile browsers only start playback from a tap inside it.
 * @example <ScreenPlayHint isPlaying />
 */
export function ScreenPlayHint({ isPlaying }: { isPlaying: boolean }) {
	const { isFadedOut } = useSleepyFadeout();
	if (isFadedOut) return null;

	const Icon = isPlaying ? Pause : Play;

	return (
		<div
			aria-hidden
			className="pointer-events-none absolute top-1/2 left-1/2 z-30 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black text-white"
		>
			<Icon className="size-11" fill="currentColor" strokeWidth={0} />
		</div>
	);
}
