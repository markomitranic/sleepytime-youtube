"use client";

import { Loader2 } from "lucide-react";
import { useGlobalLoadingApi } from "~/components/GlobalLoadingContext";

export function GlobalLoadingIndicator() {
	const { isLoading } = useGlobalLoadingApi();

	return (
		<div
			className={`fixed top-3 left-3 z-50 transition-opacity duration-300 ${isLoading ? "opacity-100" : "opacity-0 pointer-events-none"}`}
		>
			<div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-md border border-border/50">
				<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
				<span className="text-xs text-muted-foreground">Saving…</span>
			</div>
		</div>
	);
}
