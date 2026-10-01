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
 * tap lands on the real embed (mobile only starts playback from inside it).
 * @example <ScreenCurtain isPlaying={player.isPlaying} />
 */
export function ScreenCurtain({ isPlaying }: { isPlaying: boolean }) {
	const { isFadedOut } = useSleepyFadeout();
	if (isFadedOut) return <WakeShield />;

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
