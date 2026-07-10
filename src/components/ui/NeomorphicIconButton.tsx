"use client";

import { cn } from "~/lib/utils";

/**
 * Round neomorphic icon button shared by the player's like/next/queue controls.
 *
 * Renders the dark inset "carved" look when inactive, and a green glow when
 * `isActive` is set (used by the like toggle). Extracted so the background/
 * boxShadow literals live in one place instead of being copy-pasted per button.
 * @example <NeomorphicIconButton ariaLabel="Next video" onClick={next}><SkipForward /></NeomorphicIconButton>
 */
export function NeomorphicIconButton({
	children,
	isActive = false,
	onClick,
	ariaLabel,
	ariaPressed,
	className,
}: {
	children: React.ReactNode;
	isActive?: boolean;
	onClick: () => void;
	ariaLabel: string;
	ariaPressed?: boolean;
	className?: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"relative inline-flex h-12 w-12 items-center justify-center rounded-full transition-all duration-150 active:scale-95 focus-visible:ring-[3px] focus-visible:ring-ring/50",
				isActive
					? "text-green-300"
					: "text-muted-foreground hover:text-foreground",
				className,
			)}
			style={{
				background: isActive ? "#1a231a" : "#221f1b",
				boxShadow: isActive
					? "0 0 12px rgba(74,222,128,0.25), 0 0 4px rgba(74,222,128,0.15), inset 0 0 8px rgba(74,222,128,0.08)"
					: "3px 3px 6px rgba(0,0,0,0.5), -2px -2px 5px rgba(255,255,255,0.025)",
			}}
			aria-pressed={ariaPressed}
			aria-label={ariaLabel}
		>
			{children}
		</button>
	);
}
