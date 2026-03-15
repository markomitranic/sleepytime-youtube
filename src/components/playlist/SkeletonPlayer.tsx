"use client";

import { ListVideo, Loader2 } from "lucide-react";

export function SkeletonPlayer() {
	return (
		<div className="flex flex-col lg:flex-row gap-2 h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)]">
			{/* Left: Video + controls */}
			<div className="flex flex-col lg:w-2/3 shrink-0 lg:shrink lg:min-h-0">
				{/* Video area skeleton */}
				<div className="shrink-0 aspect-video max-h-[50vh] lg:max-h-none w-full overflow-hidden rounded-md border bg-muted/50 flex items-center justify-center">
					<div className="flex flex-col items-center gap-3 text-muted-foreground">
						<ListVideo className="h-8 w-8" />
						<div className="flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span className="text-sm">Loading playlist...</span>
						</div>
					</div>
				</div>

				{/* Video title and controls */}
				<div className="flex flex-col gap-4 mt-2">
					<div>
						<div className="h-6 w-2/3 rounded bg-muted/50 mb-2" />
						<div className="h-4 w-1/3 rounded bg-muted/40" />
					</div>

					{/* Skeleton controls */}
					<div className="flex items-center justify-center gap-8 py-2">
						<div className="h-12 w-12 rounded-full border bg-muted/40" />
						<div className="h-14 w-14 rounded-full border bg-muted/40" />
						<div className="h-14 w-14 rounded-full border bg-muted/40" />
						<div className="h-12 w-12 rounded-full border bg-muted/40" />
					</div>
				</div>
			</div>

			{/* Right sidebar: Playlist */}
			<div className="flex-1 overflow-y-auto min-h-0 lg:w-1/3 lg:flex-none">
				<div className="pr-2 -mr-2 pt-2">
					<ul className="grid grid-cols-1 gap-1">
						{Array.from({ length: 10 }).map((x, i) => (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: Nothing else we have lol
								key={`${x}-${i}`}
								className="flex items-start gap-3 rounded-md border py-3 pr-3"
							>
								<div className="w-8 h-16 rounded bg-muted/40 ml-1 shrink-0" />
								<div className="h-16 w-28 rounded bg-muted/50 shrink-0" />
								<div className="min-w-0 flex-1 space-y-2">
									<div className="h-4 w-3/4 rounded bg-muted/50" />
									<div className="h-3 w-1/3 rounded bg-muted/40" />
								</div>
								<div className="h-8 w-8 rounded bg-muted/40 shrink-0 self-center" />
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}
