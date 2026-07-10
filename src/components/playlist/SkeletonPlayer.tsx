"use client";

import { ListVideo, Loader2 } from "lucide-react";

/**
 * Loading placeholder mirroring the player's unified layout: a big centered
 * video area with the remote strip beneath it. No scroll, no sidebar (the queue
 * now lives in a drawer).
 */
export function SkeletonPlayer() {
	return (
		<div className="flex h-full flex-col">
			<div className="flex min-h-0 flex-1 items-start justify-center px-2.5 pt-2.5 [container-type:size]">
				<div className="flex aspect-video w-[min(100%,177.78cqh)] items-center justify-center overflow-hidden rounded-xl border bg-muted/50">
					<div className="flex flex-col items-center gap-3 text-muted-foreground">
						<ListVideo className="h-8 w-8" />
						<div className="flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span className="text-sm">Loading playlist...</span>
						</div>
					</div>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-4 px-4 pt-3 pb-[calc(4rem+env(safe-area-inset-bottom))]">
				<div className="min-w-0 flex-1 space-y-2">
					<div className="h-5 w-2/3 rounded bg-muted/50" />
					<div className="h-4 w-1/3 rounded bg-muted/40" />
				</div>
				<div className="flex shrink-0 items-center gap-3">
					<div className="h-12 w-12 rounded-full bg-muted/40" />
					<div className="h-14 w-14 rounded-full bg-muted/40" />
					<div className="h-12 w-12 rounded-full bg-muted/40" />
					<div className="h-12 w-12 rounded-full bg-muted/40" />
				</div>
			</div>
		</div>
	);
}
