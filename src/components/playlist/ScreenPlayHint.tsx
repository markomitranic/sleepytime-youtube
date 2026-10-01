"use client";

import { Pause, Play } from "lucide-react";
import { useEffect } from "react";
import { useEmbedTap } from "~/lib/useEmbedTap";
import { cn } from "~/lib/utils";

const VISIBLE_MS = 3000;

/**
 * Click-through play/pause icon over the embed's own button, shown after a wake tap.
 *
 * Gives the wake tap visible feedback; the next tap falls through to the embed
 * and hides it, so it never contradicts the embed's own state.
 * @example <ScreenPlayHint open={shown} onHide={hide} isPlaying />
 */
export function ScreenPlayHint({
	open,
	onHide,
	isPlaying,
}: {
	open: boolean;
	onHide: () => void;
	isPlaying: boolean;
}) {
	useEffect(() => {
		if (!open) return;
		const timer = setTimeout(onHide, VISIBLE_MS);
		return () => clearTimeout(timer);
	}, [open, onHide]);

	useEmbedTap(onHide, open);

	const Icon = isPlaying ? Pause : Play;

	return (
		<div
			aria-hidden
			className={cn(
				"pointer-events-none absolute top-1/2 left-1/2 z-30 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/70 text-white transition-opacity duration-200",
				open ? "opacity-100" : "opacity-0",
			)}
		>
			<Icon className="size-11" fill="currentColor" strokeWidth={0} />
		</div>
	);
}
