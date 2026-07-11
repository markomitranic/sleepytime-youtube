import { ListVideo, Loader2 } from "lucide-react";

/**
 * Loading placeholder mirroring the player's layout: dark video bay on top,
 * the deck silhouette below — unlit glass, blank keys, dead knob.
 */
export function SkeletonPlayer() {
	return (
		<div className="flex h-full flex-col">
			<div className="flex min-h-0 flex-1 items-start justify-center px-2.5 pt-2.5 [container-type:size]">
				<div className="flex aspect-video w-[min(100%,177.78cqh)] items-center justify-center overflow-hidden rounded-sm glass-panel bg-black">
					<div className="flex flex-col items-center gap-3 text-muted-foreground">
						<ListVideo className="h-8 w-8" />
						<div className="flex items-center gap-2">
							<Loader2 className="h-4 w-4 animate-spin" />
							<span className="text-sm">Loading playlist...</span>
						</div>
					</div>
				</div>
			</div>

			<div className="shrink-0 px-2.5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
				<div className="deck-chassis flex flex-wrap items-stretch gap-3 p-3.5 md:gap-4">
					<div className="deck-lcd flex min-w-0 flex-1 flex-col justify-between gap-2 px-3.5 py-2.5 max-md:basis-full">
						<div className="h-4 w-2/3 rounded-[1px] bg-(--phosphor-ghost)" />
						<div className="h-3 w-1/3 rounded-[1px] bg-(--phosphor-ghost)" />
						<div className="h-[9px] rounded-[1px] bg-(--phosphor-ghost)" />
					</div>
					<div className="flex shrink-0 items-center gap-3 md:gap-4 max-md:flex-1 max-md:justify-end">
						<div className="grid grid-cols-2 gap-2">
							{["pl", "like", "queue", "next"].map((k) => (
								<div key={k} className="deck-key min-h-11 min-w-28" />
							))}
						</div>
						<div className="h-20 w-20 rounded-full bg-[#141210] shadow-[inset_0_2px_6px_rgba(0,0,0,0.7)]" />
					</div>
				</div>
			</div>
		</div>
	);
}
