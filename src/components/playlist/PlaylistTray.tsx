"use client";

import { Globe, Library, Link as LinkIcon, Lock, Play } from "lucide-react";
import Image from "next/image";
import { useAuth } from "~/components/auth/AuthContext";
import { DeckTray } from "~/components/playlist/DeckTray";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Badge } from "~/components/ui/badge";
import { useBuiltinPlaylists, useUserPlaylists } from "~/lib/queries";
import { cn } from "~/lib/utils";

/**
 * The cassette bay: the playlist library inside a DeckTray door.
 * Picking a playlist loads it in place and shuts the door; so do Escape,
 * the scrim, and the eject key.
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
		<DeckTray
			open={open}
			onOpenChange={onOpenChange}
			label="Playlists"
			className={className}
		>
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
		</DeckTray>
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
