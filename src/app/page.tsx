"use client";

import { ExternalLink, Github, Linkedin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Button } from "~/components/ui/button";
import { BUILTIN_PLAYLISTS } from "~/lib/builtinPlaylists";
import { useBuiltinPlaylists } from "~/lib/queries";

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
			className={`group relative aspect-4/3 rounded-lg overflow-hidden transition-transform duration-500 hover:scale-[1.02] ${
				isPlaying ? "ring-1 ring-foreground/20" : ""
			}`}
		>
			{thumbnail ? (
				<Image
					src={thumbnail}
					alt={title}
					fill
					className="object-cover brightness-[0.8]"
					sizes="(max-width: 640px) 45vw, 240px"
				/>
			) : (
				<div className="absolute inset-0 bg-secondary" />
			)}
			<div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
			<div className="absolute bottom-0 left-0 right-0 p-3">
				<p className="text-sm font-medium text-white/90 leading-tight">
					{title}
				</p>
			</div>
		</button>
	);
}

export default function HomePage() {
	const playlist = usePlaylist();
	const auth = useAuth();
	const router = useRouter();

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

	const handleSelect = async (playlistId: string) => {
		router.push("/player");
		await playlist.loadByPlaylistId(playlistId);
	};

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
		<main className="min-h-screen">
			{/* Hero: Vignetted Sleepytime painting with firelight glow */}
			<div className="hero-glow w-full max-w-5xl mx-auto pt-6 md:pt-10">
				<div className="vignette-mask overflow-hidden">
					<Image
						src="/sleepytime-underwood.jpg"
						alt="Sleepytime Celestial Seasonings Bear — by Underwood"
						width={1200}
						height={600}
						className="w-full h-auto brightness-[0.85] contrast-[1.05]"
						priority
					/>
				</div>
			</div>

			{/* Content */}
			<div className="flex flex-col items-center px-6 pb-32">
				<div className="w-full max-w-lg space-y-12 text-center">
					{/* Title + tagline */}
					<div className="space-y-3 mt-10">
						<h1 className="font-(family-name:--font-lora) text-3xl font-normal tracking-wide text-foreground/80">
							Sleepytime
						</h1>
						<p className="text-base text-muted-foreground leading-relaxed">
							A better way to fall asleep to YouTube.
						</p>
					</div>

					{/* Hook */}
					<p className="text-sm text-muted-foreground/70 leading-relaxed max-w-md mx-auto">
						Pick a playlist. Set a sleep timer. The screen dims, videos play one
						by one and clear themselves from the list. Your device sleeps when
						you do — and tomorrow, you're right where you drifted off. Pin it to
						your homescreen for the full experience. No ads, no clutter, no
						bright lights in a dark room.
					</p>

					{/* Curated playlist grid */}
					<div className="space-y-4">
						<p className="text-sm text-muted-foreground/70 leading-relaxed max-w-md mx-auto">
							This app was made for my wife, who recommends falling asleep with
							some "SkyrimPlus Homes" or "Antonio Off-grid".
						</p>
						<div className="grid grid-cols-2 gap-3">
							{displayPlaylists.map((p) => (
								<PlaylistCard
									key={p.id}
									playlist={p}
									isPlaying={playlist.playlistId === p.id}
									onSelect={handleSelect}
								/>
							))}
						</div>
					</div>

					{/* Sign-in block — unauthenticated only */}
					{!auth.isAuthenticated && (
						<div className="space-y-5 pt-4">
							<h2 className="font-(family-name:--font-lora) text-lg font-normal text-foreground/70">
								Make sleepytime your own.
							</h2>
							<p className="text-sm text-muted-foreground/60 leading-relaxed max-w-sm mx-auto">
								Sign in with Google to play your own YouTube playlists. Nothing
								stored, nothing tracked — all data stays in your browser.
							</p>
							<Button
								onClick={() => signIn("google")}
								variant="outline"
								className="px-8 py-3 text-sm font-normal tracking-wide border-foreground/15 text-foreground/60 hover:text-foreground/80 hover:border-foreground/25 hover:shadow-[0_0_20px_oklch(0.35_0.06_55/0.15)] transition-all duration-500"
							>
								Sign in with Google
							</Button>
						</div>
					)}

					{/* Footer */}
					<div className="flex items-center justify-center gap-6 pt-8">
						<a
							href="https://github.com/markomitranic/sleepytime-youtube"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors duration-500"
							aria-label="View on GitHub"
						>
							<Github className="h-4 w-4" />
							<span className="text-xs">GitHub</span>
						</a>

						<a
							href="https://www.linkedin.com/in/marko-mitranic/"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors duration-500"
							aria-label="LinkedIn Profile"
						>
							<Linkedin className="h-4 w-4" />
							<span className="text-xs">LinkedIn</span>
						</a>

						<a
							href="https://medium.com/homullus"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground/80 transition-colors duration-500"
							aria-label="Medium Blog"
						>
							<ExternalLink className="h-4 w-4" />
							<span className="text-xs">Medium</span>
						</a>
					</div>
				</div>
			</div>
		</main>
	);
}
