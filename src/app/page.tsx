"use client";

import { ExternalLink, Github, Linkedin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Button } from "~/components/ui/button";

export default function HomePage() {
	const playlist = usePlaylist();
	const auth = useAuth();
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

	return (
		<main className="min-h-screen">
			{/* Hero Section */}
			<div className="w-full max-w-400 mx-auto px-0 md:px-10 pt-5">
				<Image
					src="/sleepytime-underwood.jpg"
					alt="Sleepytime Celestial Seasonings Bear - by Underwood"
					width={1200}
					height={600}
					className="w-full h-auto rounded-md"
				/>
			</div>

			{/* Content Section */}
			<div className="flex justify-center px-2.5 py-6 pb-24">
				<div className="w-full max-w-180 space-y-6">
					<h1 className="text-3xl font-bold">Sleepytime-YouTube</h1>
					<div className="space-y-5">
						<p className="text-lg text-muted-foreground text-center">
							Having trouble sleeping? Bothersome having to keep hitting play
							and skipping ads? Add a sleep timer and auto-removal to your
							playlists.
						</p>

						<div className="text-center">
							<Link
								href="/playlists"
								className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
							>
								Browse playlists to get started →
							</Link>
						</div>

						{/* CTA Section - Only show if not authenticated */}
						{!auth.isAuthenticated && (
							<div className="mt-12 p-8 rounded-lg border bg-linear-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 text-center space-y-6">
								<div className="space-y-3">
									<h2 className="text-2xl font-bold">
										Ready to manage your playlists?
									</h2>
									<p className="text-muted-foreground max-w-2xl mx-auto">
										Sign in with your YouTube account to access, play, and
										manage your personal playlists. Reorder videos, remove
										unwanted content, and create the perfect sleep experience.
									</p>
								</div>

								<div className="space-y-4">
									<div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 rounded-full bg-green-500" />
											<span>Access your YouTube playlists</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 rounded-full bg-green-500" />
											<span>Reorder and manage videos</span>
										</div>
										<div className="flex items-center gap-2">
											<div className="w-2 h-2 rounded-full bg-green-500" />
											<span>Set sleep timers</span>
										</div>
									</div>

									<div className="text-xs text-muted-foreground/80 max-w-xl mx-auto">
										<strong>Your privacy matters:</strong> We store nothing on
										our servers. All data remains in your browser. No tracking,
										no analytics, no data collection. Your information stays
										private.
									</div>
								</div>

								<Button
									onClick={() => signIn("google")}
									size="lg"
									className="px-8 py-3 text-base font-medium"
								>
									Sign in with Google
								</Button>
							</div>
						)}

						{/* Footer */}
						<div className="flex items-center justify-center gap-6 pt-8 mt-12 border-t">
							<a
								href="https://github.com/markomitranic/sleepytime-youtube"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
								aria-label="View on GitHub"
							>
								<Github className="h-5 w-5" />
								<span className="text-sm">GitHub</span>
							</a>

							<a
								href="https://www.linkedin.com/in/marko-mitranic/"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
								aria-label="LinkedIn Profile"
							>
								<Linkedin className="h-5 w-5" />
								<span className="text-sm">LinkedIn</span>
							</a>

							<a
								href="https://medium.com/homullus"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
								aria-label="Medium Blog"
							>
								<ExternalLink className="h-5 w-5" />
								<span className="text-sm">Medium</span>
							</a>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}
