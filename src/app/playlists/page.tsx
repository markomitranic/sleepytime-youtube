"use client";

import { useQuery } from "@tanstack/react-query";
import { Globe, Library, Link as LinkIcon, Lock, Play } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Badge } from "~/components/ui/badge";
import { useBuiltinPlaylists } from "~/lib/queries";
import { fetchUserPlaylists } from "~/lib/youtube";

function PlaylistRow({
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
			className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
				isPlaying
					? "bg-accent border border-accent-foreground/20"
					: "hover:bg-secondary/50"
			}`}
		>
			<div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-muted">
				{thumbnailUrl ? (
					<Image
						src={thumbnailUrl}
						alt={title}
						className="w-full h-full object-cover"
						width={96}
						height={96}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center">
						<Library className="h-5 w-5 text-muted-foreground" />
					</div>
				)}
			</div>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium truncate">{title}</p>
				<div className="flex items-center gap-2 mt-0.5">
					{subtitle && (
						<span className="text-xs text-muted-foreground">{subtitle}</span>
					)}
					{badge}
					{isPlaying && (
						<Badge
							variant="outline"
							className="gap-1 px-2 py-0.5 h-5 text-xs bg-green-700/20 border-green-600 text-green-300"
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

function PrivacyBadge({ status }: { status?: string }) {
	if (status === "private")
		return (
			<Badge variant="secondary" className="gap-1 px-2 py-0.5 h-5 text-xs">
				<Lock className="h-3 w-3" />
				Private
			</Badge>
		);
	if (status === "public")
		return (
			<Badge variant="secondary" className="gap-1 px-2 py-0.5 h-5 text-xs">
				<Globe className="h-3 w-3" />
				Public
			</Badge>
		);
	if (status === "unlisted")
		return (
			<Badge variant="secondary" className="gap-1 px-2 py-0.5 h-5 text-xs">
				<LinkIcon className="h-3 w-3" />
				Unlisted
			</Badge>
		);
	return null;
}

export default function PlaylistsPage() {
	const auth = useAuth();
	const router = useRouter();
	const playlist = usePlaylist();

	const { data: userPlaylists } = useQuery({
		queryKey: ["userPlaylists", auth.accessToken],
		queryFn: async () => {
			if (!auth.isAuthenticated || !auth.accessToken) return [];
			try {
				return await fetchUserPlaylists({
					accessToken: auth.accessToken,
					refreshToken: auth.getTokenSilently,
				});
			} catch {
				return [];
			}
		},
		enabled: Boolean(auth.isAuthenticated && auth.accessToken),
		staleTime: 1000 * 60,
	});

	const { data: builtinPlaylists } = useBuiltinPlaylists(true);

	const handleSelect = async (playlistId: string) => {
		router.push("/player");
		await playlist.loadByPlaylistId(playlistId);
	};

	const sortedUserPlaylists = [...(userPlaylists ?? [])].sort((a, b) =>
		a.title.localeCompare(b.title),
	);

	const sortedBuiltins = [...(builtinPlaylists ?? [])].sort((a, b) =>
		(a.title ?? "").localeCompare(b.title ?? ""),
	);

	return (
		<main className="min-h-screen pb-24 pt-[env(safe-area-inset-top)]">
			<div className="w-full max-w-2xl mx-auto px-4 pt-6">
				<h1 className="text-2xl font-bold mb-6">Playlists</h1>

				{/* User playlists */}
				{auth.isAuthenticated && sortedUserPlaylists.length > 0 && (
					<section className="mb-2">
						<h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-3">
							Your Playlists
						</h2>
						<div className="space-y-1">
							{sortedUserPlaylists.map((p) => (
								<PlaylistRow
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
				<div className="flex items-center gap-4 py-4">
					<div className="flex-1 h-px bg-border" />
					<span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
						Recommended
					</span>
					<div className="flex-1 h-px bg-border" />
				</div>

				{/* Built-in playlists */}
				<section>
					<div className="space-y-1">
						{sortedBuiltins.map((p) => (
							<PlaylistRow
								key={p.id}
								title={p.title ?? "Playlist"}
								thumbnailUrl={p.thumbnailUrl}
								subtitle={p.itemCount ? `${p.itemCount} videos` : undefined}
								isPlaying={playlist.playlistId === p.id}
								onClick={() => handleSelect(p.id)}
							/>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
