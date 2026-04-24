"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "~/components/auth/AuthContext";
import { PlaylistManager } from "~/components/playlist-manager/PlaylistManager";

export default function PlaylistsManagePage() {
	const auth = useAuth();
	const router = useRouter();

	useEffect(() => {
		if (auth.isReady && !auth.isAuthenticated) {
			router.replace("/");
		}
	}, [auth.isReady, auth.isAuthenticated, router]);

	if (!auth.isReady || !auth.isAuthenticated) {
		return (
			<div className="flex items-center justify-center h-[60vh]">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<main className="h-[calc(100vh-6rem)] pt-[env(safe-area-inset-top)] pb-24 flex flex-col">
			<div className="w-full max-w-6xl mx-auto px-4 pt-6 flex flex-col flex-1 min-h-0">
				<h1 className="text-2xl font-bold mb-4">Manage Playlists</h1>
				<PlaylistManager />
			</div>
		</main>
	);
}
