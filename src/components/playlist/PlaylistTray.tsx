"use client";

import { Globe, Library, Link as LinkIcon, Lock, Play } from "lucide-react";
import Image from "next/image";
import { useEffect } from "react";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Badge } from "~/components/ui/badge";
import { useBuiltinPlaylists, useUserPlaylists } from "~/lib/queries";
import { cn } from "~/lib/utils";

/**
 * The cassette tray: the playlist library slides out of the deck's top edge,
 * door-style, hovering over the bottom of the video window. Its lower lip
 * stays tucked behind the chassis so it reads as part of the machine.
 *
 * Render it inside a `relative` wrapper around the deck — it anchors to the
 * wrapper's top and matches the chassis width. Picking a playlist loads it in
 * place and shuts the door; so do Escape, the scrim, and the eject key.
 * @example <PlaylistTray open={open} onOpenChange={setOpen} />
 */
export function PlaylistTray({
	open,
	onOpenChange,
	className,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	className?: string;
}) {
	const auth = useAuth();
	const playlist = usePlaylist();
	const { data: userPlaylists } = useUserPlaylists();
	const { data: builtinPlaylists } = useBuiltinPlaylists(true);

	// Escape shuts the door
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onOpenChange(false);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onOpenChange]);

	const handleSelect = async (playlistId: string) => {
		onOpenChange(false);
		await playlist.loadByPlaylistId(playlistId);
	};

	const sortedUserPlaylists = [...(userPlaylists ?? [])].sort((a, b) =>
		a.title.localeCompare(b.title),
	);
	const sortedBuiltins = [...(builtinPlaylists ?? [])].sort((a, b) =>
		(a.title ?? "").localeCompare(b.title ?? ""),
	);

	return (
		<>
			{/* Invisible scrim: tapping off the tray closes it */}
			{open && (
				<button
					type="button"
					aria-label="Close playlists"
					className="fixed inset-0 z-10 cursor-default"
					onClick={() => onOpenChange(false)}
				/>
			)}
			<section
				aria-label="Playlists"
				inert={!open}
				className={cn(
					// Phones get the whole screen above the deck; md+ keeps the door modest
					"deck-tray absolute inset-x-2.5 bottom-[calc(100%-1.25rem)] z-20 flex max-h-[calc(100dvh-16rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] flex-col pb-3 transition-all duration-500 ease-out md:max-h-[42dvh]",
					!open && "pointer-events-none translate-y-6 opacity-0",
					className,
				)}
			>
				<p className="px-5 pt-2.5 pb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#8a7961]">
					Playlists
				</p>

				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-2">
					{/* User playlists */}
					{auth.isAuthenticated && sortedUserPlaylists.length > 0 && (
						<section className="mb-2">
							<h2 className="mb-2 px-3 font-(family-name:--font-dot) text-[10px] uppercase tracking-[0.2em] text-[rgba(228,211,188,0.4)] md:text-[11px]">
								Your Playlists
							</h2>
							<div className="space-y-1">
								{sortedUserPlaylists.map((p) => (
									<TrayRow
										key={p.id}
										title={p.title}
										thumbnailUrl={p.thumbnailUrl}
										subtitle={`${p.itemCount ?? 0} videos`}
										badge={<PrivacyBadge status={p.privacyStatus} />}
										isPlaying={playlist.playlistId === p.id}
										onClick={() => handleSelect(p.id)}
									/>
								))}
							</div>
						</section>
					)}

					{/* Separator */}
					<div className="flex items-center gap-4 py-3">
						<div className="h-px flex-1 bg-white/[0.06]" />
						<span className="font-(family-name:--font-dot) text-[10px] uppercase tracking-[0.2em] text-[rgba(228,211,188,0.4)] md:text-[11px]">
							Recommended
						</span>
						<div className="h-px flex-1 bg-white/[0.06]" />
					</div>

					{/* Built-in playlists */}
					<div className="space-y-1">
						{sortedBuiltins.map((p) => (
							<TrayRow
								key={p.id}
								title={p.title ?? "Playlist"}
								thumbnailUrl={p.thumbnailUrl}
								subtitle={p.itemCount ? `${p.itemCount} videos` : undefined}
								isPlaying={playlist.playlistId === p.id}
								onClick={() => handleSelect(p.id)}
							/>
						))}
					</div>
				</div>
			</section>
		</>
	);
}

/** One cassette in the bay: thumbnail label, title, count, playing lamp. */
function TrayRow({
	title,
	thumbnailUrl,
	subtitle,
	badge,
	isPlaying,
	onClick,
}: {
	title: string;
	thumbnailUrl?: string | null;
	subtitle?: string;
	badge?: React.ReactNode;
	isPlaying: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex w-full items-center gap-3 rounded-[3px] px-3 py-2 text-left transition-colors",
				isPlaying ? "bg-white/[0.06]" : "hover:bg-white/[0.04]",
			)}
		>
			<div className="h-11 w-11 shrink-0 overflow-hidden rounded-[2px] border border-black/60 bg-black/40">
				{thumbnailUrl ? (
					<Image
						src={thumbnailUrl}
						alt={title}
						className="h-full w-full object-cover"
						width={96}
						height={96}
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center">
						<Library className="h-5 w-5 text-muted-foreground" />
					</div>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium text-[#d8cbb4] md:text-base">
					{title}
				</p>
				<div className="mt-0.5 flex items-center gap-2">
					{subtitle && (
						<span className="text-xs text-[#8a7961] md:text-sm">
							{subtitle}
						</span>
					)}
					{badge}
					{isPlaying && (
						<Badge
							variant="outline"
							className="h-5 gap-1 border-(--phosphor) bg-transparent px-2 py-0.5 text-xs text-(--phosphor)"
						>
							<Play className="h-3 w-3" />
							Playing
						</Badge>
					)}
				</div>
			</div>
		</button>
	);
}

/** Privacy chip on user-owned playlists. */
function PrivacyBadge({ status }: { status?: string }) {
	if (status === "private")
		return (
			<Badge variant="secondary" className="h-5 gap-1 px-2 py-0.5 text-xs">
				<Lock className="h-3 w-3" />
				Private
			</Badge>
		);
	if (status === "public")
		return (
			<Badge variant="secondary" className="h-5 gap-1 px-2 py-0.5 text-xs">
				<Globe className="h-3 w-3" />
				Public
			</Badge>
		);
	if (status === "unlisted")
		return (
			<Badge variant="secondary" className="h-5 gap-1 px-2 py-0.5 text-xs">
				<LinkIcon className="h-3 w-3" />
				Unlisted
			</Badge>
		);
	return null;
}
