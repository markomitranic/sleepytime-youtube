"use client";

import { Library, X } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "~/lib/utils";
import type { YouTubePlaylistItem, YouTubeUserPlaylist } from "~/lib/youtube";

type MovePanelProps = {
	isOpen: boolean;
	playlists: YouTubeUserPlaylist[];
	activeItem: YouTubePlaylistItem | undefined;
	onSelect: (target: YouTubeUserPlaylist) => void;
	onClose: () => void;
};

export const MovePanel = forwardRef<HTMLDivElement, MovePanelProps>(
	function MovePanel(
		{ isOpen, playlists, activeItem, onSelect, onClose },
		ref,
	) {
		return (
			<div
				className={cn(
					"shrink-0 overflow-hidden transition-[width] duration-300 ease-out",
					isOpen ? "w-80" : "w-0",
				)}
			>
				<div
					ref={ref}
					className="w-80 h-full flex flex-col glass-panel rounded-xl overflow-hidden"
				>
					<div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium">Move to playlist</p>
							{activeItem && (
								<p className="text-xs text-muted-foreground truncate">
									{activeItem.title}
								</p>
							)}
						</div>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close"
							className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors shrink-0"
						>
							<X className="h-4 w-4" />
						</button>
					</div>

					<div className="flex-1 overflow-y-auto">
						{playlists.length === 0 ? (
							<div className="flex flex-col items-center justify-center gap-3 py-16 px-4 text-center text-muted-foreground">
								<Library className="h-8 w-8" />
								<p className="text-sm">No other playlists to move to</p>
							</div>
						) : (
							<ul className="flex flex-col">
								{playlists.map((p) => (
									<li key={p.id}>
										<button
											type="button"
											onClick={() => onSelect(p)}
											className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/60 transition-colors text-left"
										>
											<div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-muted">
												{p.thumbnailUrl ? (
													/* biome-ignore lint/performance/noImgElement: external URL */
													<img
														src={p.thumbnailUrl}
														alt=""
														className="w-full h-full object-cover"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<Library className="h-4 w-4 text-muted-foreground" />
													</div>
												)}
											</div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">
													{p.title}
												</p>
												{p.itemCount != null && (
													<p className="text-xs text-muted-foreground">
														{p.itemCount}{" "}
														{p.itemCount === 1 ? "video" : "videos"}
													</p>
												)}
											</div>
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		);
	},
);
