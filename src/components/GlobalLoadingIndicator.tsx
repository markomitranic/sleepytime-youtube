"use client";

import { Loader2 } from "lucide-react";
import { useGlobalLoadingApi } from "~/components/GlobalLoadingContext";

export function GlobalLoadingIndicator() {
	const { isLoading } = useGlobalLoadingApi();

	// Render nothing while idle. Keeping it mounted (even at opacity-0) left a
	// spinner rotating inside a backdrop-blur pill, which forces the browser to
	// re-blur that region every frame — constant GPU/compositor burn for an
	// invisible element. Mounting only while loading makes idle cost zero.
	if (!isLoading) return null;

	return (
		<div className="fixed top-3 left-3 z-50">
			<div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md border border-border/50">
				<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
				<span className="text-xs text-muted-foreground">Saving…</span>
			</div>
		</div>
	);
}
