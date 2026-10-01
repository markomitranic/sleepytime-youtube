"use client";

import { Pause, Play } from "lucide-react";
import { useEffect } from "react";
import { cn } from "~/lib/utils";

const VISIBLE_MS = 3000;

/**
 * Mirrors the embed's center play button right after a wake tap.
 *
 * Purely visual: taps fall through to the embed, since mobile browsers only
 * start playback from a tap inside it. `shownFor` is the playback state at the
 * wake tap; the hint hides once playback flips away from it, or on timeout.
 * @example <ScreenPlayHint shownFor={true} isPlaying onHide={() => setShownFor(null)} />
 */
export function ScreenPlayHint({
	shownFor,
	isPlaying,
	onHide,
}: {
	shownFor: boolean | null;
	isPlaying: boolean;
	onHide: () => void;
}) {
	useEffect(() => {
		if (shownFor === null) return;
		const timer = setTimeout(onHide, VISIBLE_MS);
		return () => clearTimeout(timer);
	}, [shownFor, onHide]);

	const visible = shownFor === isPlaying;
	const Icon = shownFor ? Pause : Play;

	return (
		<div
			aria-hidden
			className={cn(
				"pointer-events-none absolute top-1/2 left-1/2 z-30 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white transition-opacity duration-200",
				visible ? "opacity-100" : "opacity-0",
			)}
		>
			<Icon className="size-7" fill="currentColor" strokeWidth={0} />
		</div>
	);
}
