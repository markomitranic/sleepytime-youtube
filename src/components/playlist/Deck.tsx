"use client";

import { ListVideo, SkipForward, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { AccountDrawer } from "~/components/auth/AccountDrawer";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlayer } from "~/components/playlist/PlayerContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { SleepTimerDrawer } from "~/components/playlist/SleepTimerDrawer";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";
import { MetalPlayButton } from "~/components/ui/MetalPlayButton";
import { SegmentBar, SevenSegmentTime } from "~/components/ui/SegmentDisplay";
import { useRateVideo, useVideoRating } from "~/lib/queries";
import { cn } from "~/lib/utils";
import type { YouTubePlaylistItem } from "~/lib/youtube";

/**
 * The deck: one hi-fi faceplate below the video holding everything.
 *
 * LCD window on the left carries all text in the phosphor color — title,
 * channel, seven-segment elapsed/remaining and a segment progress bar — plus
 * the SLEEP / HOME / ACCOUNT words printed on the glass. The right side is
 * hardware: a 2x2 key grid (Playlists, Like, Queue, Next) and the knurled
 * play knob. Replaces both the old RemoteStrip and the bottom nav on this
 * screen. Owns the spacebar shortcut and the sleepy fade (the whole
 * faceplate dims to 20% when idle).
 * @example <Deck current={item} currentVideoId={id} isPlaying onPlayPause={fn} onNext={fn} onOpenQueue={fn} onOpenPlaylists={fn} />
 */
export function Deck({
	current,
	currentVideoId,
	isPlaying,
	onPlayPause,
	onNext,
	onOpenQueue,
	onOpenPlaylists,
}: {
	current: YouTubePlaylistItem | undefined;
	currentVideoId: string | undefined;
	isPlaying: boolean;
	onPlayPause: () => void;
	onNext: () => void;
	onOpenQueue: () => void;
	onOpenPlaylists: () => void;
}) {
	const { isFadedOut } = useSleepyFadeout();
	const player = usePlayer();
	const progress =
		player.duration > 0 ? player.currentTime / player.duration : 0;
	const remaining = Math.max(0, player.duration - player.currentTime);

	// Spacebar for play/pause (lives with the deck)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code !== "Space" && e.key !== " ") return;
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				// Space must still activate whatever control is focused
				target.closest("button, a, [role='button']")
			)
				return;
			e.preventDefault();
			onPlayPause();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onPlayPause]);

	return (
		<div className="shrink-0 px-2.5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
			<div
				className={cn(
					"deck-chassis flex flex-wrap items-stretch gap-3 p-3.5 transition-opacity duration-1000 md:gap-4",
					isFadedOut && "opacity-20",
				)}
			>
				{/* The LCD window: all text lives in the glass */}
				<div className="deck-lcd flex min-w-0 flex-1 flex-col justify-between gap-2 px-3.5 py-2.5 max-md:basis-full">
					<h2 className="phos-text truncate font-(family-name:--font-dot) text-base uppercase tracking-[0.05em]">
						{current?.title ?? ""}
					</h2>
					<div className="flex items-center justify-between gap-3">
						<p className="min-w-0 truncate font-(family-name:--font-dot) text-[11px] uppercase tracking-[0.16em] text-(--phosphor) opacity-50">
							{current?.channelTitle ?? ""}
						</p>
						<GlassIndicators />
					</div>
					<div className="flex items-center gap-3.5">
						<SevenSegmentTime seconds={player.currentTime} />
						<SegmentBar progress={progress} className="min-w-15 flex-1" />
						{player.duration > 0 && (
							<SevenSegmentTime
								seconds={remaining}
								negative
								className="max-md:hidden"
							/>
						)}
					</div>
				</div>

				{/* The hardware: 2x2 key grid + play knob */}
				<div className="flex shrink-0 items-center gap-3 md:gap-4 max-md:flex-1 max-md:justify-end">
					<div className="grid grid-cols-2 gap-2">
						<DeckKey
							label="Playlists"
							ariaLabel="Open playlists"
							onClick={onOpenPlaylists}
							icon={<EjectIcon />}
						/>
						<LikeKey videoId={currentVideoId ?? null} />
						<DeckKey
							label="Queue"
							ariaLabel="Open queue"
							onClick={onOpenQueue}
							icon={<ListVideo />}
						/>
						<DeckKey
							label="Next"
							ariaLabel="Next video"
							onClick={onNext}
							icon={<SkipForward />}
						/>
					</div>
					<MetalPlayButton isPlaying={isPlaying} onClick={onPlayPause} />
				</div>
			</div>
		</div>
	);
}

/**
 * SLEEP / HOME / ACCOUNT — words printed on the LCD glass, hi-fi indicator
 * style: ghost when off, lit amber when live. Small visuals, oversized tap
 * targets. SLEEP opens the timer sheet (lit while armed), HOME leads back to
 * the homepage, ACCOUNT opens the account sheet (lit when signed in).
 */
function GlassIndicators() {
	const playlist = usePlaylist();
	const auth = useAuth();
	const timerOn = playlist.sleepTimer.isActive;
	const indClass = "deck-ind -my-2 px-2 py-2 font-(family-name:--font-dot)";

	return (
		<div className="relative z-10 flex shrink-0 items-center">
			<SleepTimerDrawer>
				<button
					type="button"
					aria-label={
						timerOn ? "Sleep timer armed. Tap to change." : "Set sleep timer"
					}
					className={cn(indClass, timerOn && "deck-ind-lit")}
				>
					Sleep
				</button>
			</SleepTimerDrawer>
			<Link href="/" aria-label="Home" className={indClass}>
				Home
			</Link>
			{auth.isAuthenticated ? (
				<AccountDrawer>
					<button
						type="button"
						aria-label="Account"
						className={cn(indClass, "deck-ind-lit")}
					>
						Account
					</button>
				</AccountDrawer>
			) : (
				<button
					type="button"
					onClick={() => signIn("google")}
					aria-label="Sign in with Google"
					className={indClass}
				>
					Account
				</button>
			)}
		</div>
	);
}

/**
 * One faceted transport key: icon + engraved all-caps legend, landscape.
 * Renders a Link when `href` is given, a button otherwise. `active` lights
 * the cap amber (a status lamp on the hardware).
 * @example <DeckKey label="Next" ariaLabel="Next video" onClick={next} icon={<SkipForward />} />
 */
function DeckKey({
	icon,
	label,
	ariaLabel,
	onClick,
	href,
	active = false,
	disabled = false,
}: {
	icon: React.ReactNode;
	label: string;
	ariaLabel: string;
	onClick?: () => void;
	href?: string;
	active?: boolean;
	disabled?: boolean;
}) {
	const content = (
		<>
			<span
				className={cn(
					"shrink-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.7)] [&>svg]:h-4 [&>svg]:w-4",
					active && "text-(--lamp)",
				)}
			>
				{icon}
			</span>
			<span
				className={cn(
					"text-[9.5px] font-semibold uppercase tracking-[0.2em] text-[#8a7961]",
					active && "text-(--lamp)",
				)}
			>
				{label}
			</span>
		</>
	);
	const className = cn(
		"deck-key flex min-h-11 min-w-28 items-center gap-2 px-3 text-left",
		disabled && "opacity-40",
	);

	if (href) {
		return (
			<Link href={href} aria-label={ariaLabel} className={className}>
				{content}
			</Link>
		);
	}
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			aria-label={ariaLabel}
			aria-pressed={active || undefined}
			className={className}
		>
			{content}
		</button>
	);
}

/**
 * Like toggle as a deck key. Machines don't remove keys, so it renders
 * disabled (dimmed) when signed out or with no video, and lights amber
 * while the current video is liked.
 */
function LikeKey({ videoId }: { videoId: string | null }) {
	const auth = useAuth();
	const { data: rating } = useVideoRating(videoId);
	const rateVideoMutation = useRateVideo();

	const available = auth.isAuthenticated && Boolean(videoId);
	const isLiked = rating === "like";

	const handleClick = async () => {
		if (!videoId) return;
		try {
			await rateVideoMutation.mutateAsync({
				videoId,
				rating: isLiked ? "none" : "like",
			});
		} catch (e) {
			toast.error((e as Error)?.message ?? "Failed to update rating.");
		}
	};

	return (
		<DeckKey
			label="Like"
			ariaLabel={isLiked ? "Unlike video" : "Like video"}
			onClick={handleClick}
			active={isLiked}
			disabled={!available}
			icon={<ThumbsUp className={cn(isLiked && "fill-current")} />}
		/>
	);
}

/** Eject glyph (lucide has none): triangle over a line, stroke-styled to match. */
function EjectIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M12 5l7 9H5l7-9z" />
			<path d="M5 19h14" />
		</svg>
	);
}
