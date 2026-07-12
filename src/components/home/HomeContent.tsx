"use client";

import { ExternalLink, Github, Linkedin, LogIn, Play } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { BUILTIN_PLAYLISTS } from "~/lib/builtinPlaylists";
import { useBuiltinPlaylists } from "~/lib/queries";
import { cn } from "~/lib/utils";

/**
 * Silk-screened section marker: a faint status lamp, a dot-matrix legend and
 * an engraved hairline seam — a panel label printed on the chassis.
 * @example <PanelLabel label="Programs" />
 */
function PanelLabel({ label }: { label: string }) {
	return (
		<div className="mx-auto flex w-full max-w-md items-center gap-3">
			<span className="deck-lamp shrink-0" aria-hidden />
			<span className="shrink-0 font-(family-name:--font-dot) text-[10px] uppercase tracking-[0.3em] text-[#9a8a70]">
				{label}
			</span>
			<span className="chassis-seam" aria-hidden />
		</div>
	);
}

/**
 * A faceted deck key cap used as a homepage CTA: presses on tap, carries an
 * engraved icon + all-caps legend, matching the player's transport keys.
 * @example <DeckKeyButton onClick={fn} icon={<Play />} label="Go to Player" />
 */
function DeckKeyButton({
	onClick,
	icon,
	label,
	ariaLabel,
}: {
	onClick: () => void;
	icon: React.ReactNode;
	label: string;
	ariaLabel?: string;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={ariaLabel ?? label}
			className="deck-key inline-flex items-center gap-2.5 px-9 py-4 text-xs font-semibold uppercase tracking-[0.25em] [&>svg]:h-4 [&>svg]:w-4"
		>
			<span className="shrink-0 drop-shadow-[0_1px_0_rgba(0,0,0,0.7)] [&>svg]:h-4 [&>svg]:w-4">
				{icon}
			</span>
			{label}
		</button>
	);
}

/**
 * One playlist as a recessed program slot: the thumbnail sunk behind a hard
 * bezel with a dot-matrix spine label in the deck's own type. A faint amber
 * lamp sits idle; the live tape gets a phosphor rim, a lit label and a
 * phosphor lamp — the same signal the LCD uses for "playing now".
 * @example <PlaylistCard playlist={p} isPlaying onSelect={load} />
 */
function PlaylistCard({
	playlist,
	isPlaying,
	onSelect,
}: {
	playlist: { id: string; title?: string; thumbnailUrl?: string | null };
	isPlaying: boolean;
	onSelect: (id: string) => void;
}) {
	const builtin = BUILTIN_PLAYLISTS.find((b) => b.id === playlist.id);
	const thumbnail = playlist.thumbnailUrl ?? builtin?.thumbnail;
	const title = playlist.title ?? builtin?.title ?? "Playlist";

	return (
		<button
			type="button"
			onClick={() => onSelect(playlist.id)}
			className={cn(
				"deck-slot group relative flex flex-col overflow-hidden rounded-[4px] p-1.5 text-left transition-transform duration-500 hover:scale-[1.015]",
				isPlaying && "deck-slot-live",
			)}
		>
			{/* Program window */}
			<div className="relative aspect-4/3 overflow-hidden rounded-[2px]">
				{thumbnail ? (
					<Image
						src={thumbnail}
						alt={title}
						fill
						className="object-cover brightness-[0.7] transition-[filter] duration-500 group-hover:brightness-[0.88]"
						sizes="(max-width: 640px) 45vw, 240px"
					/>
				) : (
					<div className="absolute inset-0 bg-secondary" />
				)}
				<div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/15" />
				{/* Status lamp: lit phosphor when live, dim amber when idle */}
				{isPlaying ? (
					<span
						aria-hidden
						className="lamp-breathe absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-(--phosphor) shadow-[0_0_8px_var(--phosphor-glow)]"
					/>
				) : (
					<span
						aria-hidden
						className="deck-lamp absolute top-2 right-2 opacity-45"
					/>
				)}
			</div>
			{/* Printed spine label */}
			<div className="px-1 pt-2 pb-0.5">
				<p
					className={cn(
						"truncate font-(family-name:--font-dot) text-[11px] uppercase leading-tight tracking-[0.06em]",
						isPlaying ? "phos-text" : "text-[#b3a288]/85",
					)}
				>
					{title}
				</p>
			</div>
		</button>
	);
}

/**
 * The homepage content, host-agnostic: renders fullscreen on `/` ("page")
 * or as the player's menu channel inside the screen glass ("screen").
 *
 * Content is identical in both hosts; only the outer sizing and the
 * GO TO PLAYER button differ (the button makes no sense inside the player).
 * Surfaces playlist load errors as toasts wherever it's mounted. Built as the
 * deck's printed front panel: the hero mounted behind glass, copy engraved on
 * brushed-graphite plates, playlists sunk into recessed program slots, CTAs as
 * faceted deck keys — the same chassis as the player, with editorial air.
 * @example <HomeContent variant="page" onSelectPlaylist={fold} onGoToPlayer={fold} />
 */
export function HomeContent({
	variant,
	onSelectPlaylist,
	onGoToPlayer,
}: {
	variant: "page" | "screen";
	onSelectPlaylist: (playlistId: string) => void;
	onGoToPlayer?: () => void;
}) {
	const playlist = usePlaylist();
	const auth = useAuth();

	const { data: builtinPlaylists } = useBuiltinPlaylists(true);

	useEffect(() => {
		if (!playlist.error) return;
		const message = playlist.error;
		const technical = playlist.errorDetails ?? "";
		const payload =
			technical && technical !== message
				? `${message}\n\nTechnical details:\n${technical}`
				: message;
		toast.error(message, {
			action: {
				label: "Copy error",
				onClick: () => {
					try {
						navigator.clipboard.writeText(payload);
					} catch {}
				},
			},
		});
	}, [playlist.error, playlist.errorDetails]);

	const fallbackPlaylists = BUILTIN_PLAYLISTS.filter((b) => b.thumbnail).map(
		(b) => ({
			id: b.id,
			title: b.title ?? b.shortLabel,
			thumbnailUrl: b.thumbnail ?? null,
			itemCount: 0,
			privacyStatus: "public" as const,
		}),
	);

	const displayPlaylists =
		builtinPlaylists && builtinPlaylists.length > 0
			? builtinPlaylists
			: fallbackPlaylists;

	return (
		<main
			className={cn(
				variant === "page"
					? "min-h-screen pt-[env(safe-area-inset-top)]"
					: "min-h-full",
			)}
		>
			{/* Hero: the Underwood painting mounted behind glass in a graphite frame */}
			<div className="hero-glow mx-auto w-full max-w-5xl px-4 pt-6 md:pt-10">
				<figure className="hero-bezel">
					<div className="hero-well before:absolute before:inset-0 before:z-1 before:bg-black/15 before:content-['']">
						<Image
							src="/sleepytime-underwood.jpg"
							alt="Sleepytime Celestial Seasonings Bear — by Underwood"
							width={1200}
							height={600}
							className="block h-auto w-full brightness-[0.82] contrast-[1.06]"
							priority={variant === "page"}
						/>
					</div>
				</figure>
			</div>

			{/* Content */}
			<div className="flex flex-col items-center px-6 pb-32">
				<div className="w-full max-w-lg space-y-16 text-center md:space-y-20">
					{/* Title + tagline — wordmark beside a breathing power lamp */}
					<div className="mt-8 space-y-4">
						<div className="flex items-center justify-center gap-3">
							<span className="deck-lamp lamp-breathe shrink-0" aria-hidden />
							<h1 className="font-(family-name:--font-lora) text-4xl font-normal tracking-tight text-foreground/90 [text-shadow:0_0_34px_oklch(0.35_0.08_55/0.14)] md:text-5xl">
								Sleepytime
							</h1>
						</div>
						<p className="font-(family-name:--font-lora) text-lg text-muted-foreground/90 italic leading-relaxed md:text-xl">
							A better way to fall asleep to YouTube.
						</p>
					</div>

					{/* Hook — engraved on a brushed-graphite plate, serif drop cap */}
					<p className="hook-dropcap engraved-plate engraved-text p-6 text-left text-[0.95rem] leading-[1.85] text-muted-foreground/80 md:p-8">
						Pick a playlist. Set a sleep timer. The screen dims, videos play one
						by one and clear themselves from the list. Your device sleeps when
						you do — and tomorrow, you're right where you drifted off. Pin it to
						your homescreen for the full experience. No ads, no clutter, no
						bright lights in a dark room.
					</p>

					{/* The way in: folds the page into the player instead of navigating */}
					{onGoToPlayer && (
						<div>
							<DeckKeyButton
								onClick={onGoToPlayer}
								icon={<Play />}
								label="Go to Player"
							/>
						</div>
					)}

					{/* Curated playlists — the program shelf */}
					<div className="space-y-6">
						<PanelLabel label="Programs" />
						<p className="mx-auto max-w-md font-(family-name:--font-lora) text-base text-muted-foreground/80 italic leading-relaxed md:text-lg">
							This app was made for my wife, who recommends falling asleep with
							some "SkyrimPlus Homes" or "Baumgartner Restoration".
						</p>
						<div className="grid grid-cols-2 gap-4">
							{displayPlaylists.map((p) => (
								<PlaylistCard
									key={p.id}
									playlist={p}
									isPlaying={playlist.playlistId === p.id}
									onSelect={onSelectPlaylist}
								/>
							))}
						</div>
					</div>

					{/* Sign-in block — unauthenticated only */}
					{!auth.isAuthenticated && (
						<div className="space-y-6">
							<PanelLabel label="Account" />
							<div className="engraved-plate engraved-text space-y-5 p-8 md:p-10">
								<h2 className="font-(family-name:--font-lora) text-xl font-normal text-foreground/80 md:text-2xl">
									Make sleepytime your own.
								</h2>
								<p className="mx-auto max-w-sm text-sm text-muted-foreground/65 leading-relaxed">
									Sign in with Google to play your own YouTube playlists.
									Nothing stored, nothing tracked — all data stays in your
									browser.
								</p>
								<DeckKeyButton
									onClick={() => signIn("google")}
									icon={<LogIn />}
									label="Sign in with Google"
									ariaLabel="Sign in with Google"
								/>
							</div>
						</div>
					)}

					{/* Footer */}
					<div className="space-y-8">
						<PanelLabel label="About" />
						<div className="flex items-center justify-center gap-6">
							<a
								href="https://github.com/markomitranic/sleepytime-youtube"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-muted-foreground/50 transition-colors duration-500 hover:text-muted-foreground/80"
								aria-label="View on GitHub"
							>
								<Github className="h-4 w-4" />
								<span className="text-xs">GitHub</span>
							</a>

							<a
								href="https://www.linkedin.com/in/marko-mitranic/"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-muted-foreground/50 transition-colors duration-500 hover:text-muted-foreground/80"
								aria-label="LinkedIn Profile"
							>
								<Linkedin className="h-4 w-4" />
								<span className="text-xs">LinkedIn</span>
							</a>

							<a
								href="https://medium.com/homullus"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-muted-foreground/50 transition-colors duration-500 hover:text-muted-foreground/80"
								aria-label="Medium Blog"
							>
								<ExternalLink className="h-4 w-4" />
								<span className="text-xs">Medium</span>
							</a>
						</div>

						<div className="flex items-center justify-center gap-4">
							<Link
								href="/privacy"
								className="text-xs text-muted-foreground/40 transition-colors duration-500 hover:text-muted-foreground/60"
							>
								Privacy
							</Link>
							<span className="text-muted-foreground/20">&middot;</span>
							<Link
								href="/terms"
								className="text-xs text-muted-foreground/40 transition-colors duration-500 hover:text-muted-foreground/60"
							>
								Terms
							</Link>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
