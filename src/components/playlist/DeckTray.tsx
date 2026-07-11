"use client";

import { useEffect } from "react";
import { cn } from "~/lib/utils";

/**
 * The tray door shell: slides out of the deck's top edge, hovering over the
 * bottom of the video window, its lower lip tucked behind the chassis so it
 * reads as part of the machine. Playlists and Account both open this door.
 *
 * Render it inside a `relative` wrapper around the deck — it anchors to the
 * wrapper's top and matches the chassis width. Escape and the invisible
 * scrim shut it; content scrolls inside; the lip label names the bay.
 * @example <DeckTray open={open} onOpenChange={setOpen} label="Playlists">…</DeckTray>
 */
export function DeckTray({
	open,
	onOpenChange,
	label,
	className,
	children,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	label: string;
	className?: string;
	children: React.ReactNode;
}) {
	// Escape shuts the door
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onOpenChange(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onOpenChange]);

	return (
		<>
			{/* Invisible scrim: tapping off the tray closes it */}
			{open && (
				<button
					type="button"
					aria-label={`Close ${label.toLowerCase()}`}
					className="fixed inset-0 z-10 cursor-default"
					onClick={() => onOpenChange(false)}
				/>
			)}
			<section
				aria-label={label}
				inert={!open}
				className={cn(
					// Phones get the whole screen above the deck; md+ keeps the door modest
					"deck-tray absolute inset-x-2.5 bottom-[calc(100%-1.25rem)] z-20 flex max-h-[calc(100dvh-16rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col pb-3 transition-all duration-500 ease-out md:max-h-[42dvh]",
					!open && "pointer-events-none translate-y-6 opacity-0",
					className,
				)}
			>
				<p className="px-5 pt-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8a7961]">
					{label}
				</p>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-2">
					{children}
				</div>
			</section>
		</>
	);
}
