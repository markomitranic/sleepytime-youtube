"use client";

import { Pause, Play } from "lucide-react";
import { cn } from "~/lib/utils";

export function MetalPlayButton({
	isPlaying,
	onClick,
	size = "lg",
	className,
}: {
	isPlaying: boolean;
	onClick: () => void;
	size?: "sm" | "lg";
	className?: string;
}) {
	const isLg = size === "lg";

	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative shrink-0 rounded-full active:scale-95 transition-transform duration-100",
				isLg ? "h-14 w-14" : "h-9 w-9",
				className,
			)}
			aria-label={isPlaying ? "Pause" : "Play"}
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
			{/* Icon */}
			<span className="relative z-10 flex items-center justify-center w-full h-full text-[#2a1f18] drop-shadow-[0_1px_0_rgba(255,255,255,0.2)]">
				{isPlaying ? (
					<Pause
						className={isLg ? "h-6 w-6" : "h-3.5 w-3.5"}
						fill="currentColor"
						strokeWidth={0}
					/>
				) : (
					<Play
						className={cn(
							isLg ? "h-6 w-6" : "h-3.5 w-3.5",
							isLg ? "ml-1" : "ml-0.5",
						)}
						fill="currentColor"
						strokeWidth={0}
					/>
				)}
			</span>
		</button>
	);
}
