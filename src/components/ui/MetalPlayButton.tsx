"use client";

import { Pause, Play } from "lucide-react";
import { cn } from "~/lib/utils";

/**
 * Knurled metal knob — the deck's most prominent control.
 *
 * By default it's a play/pause transport (icon flips with `isPlaying`); pass
 * `icon` + `ariaLabel` to give it another job while keeping the physicality.
 * Either way the rim's phosphor dot-ring is always-on ghost texture; while
 * playing it wakes to a mid glow and the cap is backlit from within (a radial
 * phosphor lamp under the metal), like the play key on an old backlit radio.
 * Colors follow the --phosphor tokens, so the day/night theme switches free.
 * @example <MetalPlayButton isPlaying={isPlaying} onClick={toggle} size="sm" />
 * @example <MetalPlayButton isPlaying onClick={openQueue} icon={<ListVideo />} ariaLabel="Open queue" />
 */
export function MetalPlayButton({
	isPlaying,
	onClick,
	size = "lg",
	className,
	icon,
	ariaLabel,
}: {
	isPlaying: boolean;
	onClick: () => void;
	size?: "sm" | "lg";
	className?: string;
	icon?: React.ReactNode;
	ariaLabel?: string;
}) {
	const isLg = size === "lg";

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative shrink-0 rounded-full active:scale-95 transition-transform duration-100",
				isLg ? "h-20 w-20" : "h-9 w-9",
				className,
			)}
			aria-label={ariaLabel ?? (isPlaying ? "Pause" : "Play")}
			style={{
				background:
					"repeating-conic-gradient(from 0deg, rgba(255,255,255,0.13) 0deg 3deg, rgba(0,0,0,0.10) 3deg 6deg)",
				boxShadow: [
					"0 3px 10px rgba(0,0,0,0.5)",
					"0 1px 3px rgba(0,0,0,0.3)",
					"inset 0 1px 1px rgba(255,255,255,0.08)",
				].join(", "),
			}}
		>
			{/* Phosphor dot-ring: ghost texture at rest, mid glow while playing */}
			<span
				aria-hidden
				className="absolute inset-0 rounded-full pointer-events-none transition-opacity duration-500"
				style={{
					background:
						"repeating-conic-gradient(from 0deg, var(--phosphor) 0deg 3deg, transparent 3deg 6deg)",
					opacity: isPlaying ? 0.3 : 0.12,
					filter: isPlaying
						? "drop-shadow(0 0 4px var(--phosphor-glow))"
						: undefined,
				}}
			/>
			{/* Inner metallic face with concentric ribs */}
			<span
				className={cn(
					"absolute rounded-full",
					isLg ? "inset-[3px]" : "inset-[2px]",
				)}
				style={{
					background: [
						`repeating-radial-gradient(circle at 50% 50%, rgba(0,0,0,0.12) 0px, transparent 1px, transparent ${isLg ? "3px" : "2.5px"}, rgba(0,0,0,0.12) ${isLg ? "3px" : "2.5px"})`,
						"linear-gradient(155deg, #cdc3b8 0%, #a89888 30%, #8a7a6e 50%, #a09080 70%, #c0b6aa 100%)",
					].join(", "),
					boxShadow:
						"inset 0 2px 4px rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.25)",
				}}
			/>
			{/* Backlight: the dial lamp shining through the cap while playing */}
			<span
				aria-hidden
				className={cn(
					"absolute rounded-full pointer-events-none transition-opacity duration-500",
					isLg ? "inset-[3px]" : "inset-[2px]",
				)}
				style={{
					background:
						"radial-gradient(circle at 50% 45%, var(--phosphor) 0%, transparent 72%)",
					opacity: isPlaying ? 0.3 : 0,
				}}
			/>
			{/* Icon */}
			<span className="relative z-10 flex items-center justify-center w-full h-full text-[#2a1f18] drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]">
				{icon ??
					(isPlaying ? (
						<Pause
							className={isLg ? "h-7 w-7" : "h-3.5 w-3.5"}
							fill="currentColor"
							strokeWidth={0}
						/>
					) : (
						<Play
							className={cn(
								isLg ? "h-7 w-7" : "h-3.5 w-3.5",
								isLg ? "ml-1" : "ml-0.5",
							)}
							fill="currentColor"
							strokeWidth={0}
						/>
					))}
			</span>
		</button>
	);
}
