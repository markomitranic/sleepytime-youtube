"use client";

import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "~/lib/utils";

const VISIBLE_MS = 3000;

/**
 * Stand-in for the embed's center play button, shown right after a wake tap.
 *
 * The embed hides its chrome, so a wake tap would otherwise give no feedback.
 * Each toggle restarts the countdown; it then fades and hands taps back.
 * @example <ScreenPlayToggle open={shown} onOpenChange={setShown} isPlaying onPlayPause={toggle} />
 */
export function ScreenPlayToggle({
	open,
	onOpenChange,
	isPlaying,
	onPlayPause,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isPlaying: boolean;
	onPlayPause: () => void;
}) {
	const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const scheduleHide = useCallback(() => {
		clearTimeout(hideTimerRef.current);
		hideTimerRef.current = setTimeout(() => onOpenChange(false), VISIBLE_MS);
	}, [onOpenChange]);

	useEffect(() => {
		if (open) scheduleHide();
		return () => clearTimeout(hideTimerRef.current);
	}, [open, scheduleHide]);

	const Icon = isPlaying ? Pause : Play;

	return (
		<button
			type="button"
			tabIndex={open ? 0 : -1}
			aria-hidden={!open}
			aria-label={isPlaying ? "Pause" : "Play"}
			onClick={() => {
				onPlayPause();
				scheduleHide();
			}}
			className={cn(
				"absolute top-1/2 left-1/2 z-30 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white transition-opacity duration-200",
				open ? "opacity-100" : "pointer-events-none opacity-0",
			)}
		>
			<Icon className="size-7" fill="currentColor" strokeWidth={0} />
		</button>
	);
}
