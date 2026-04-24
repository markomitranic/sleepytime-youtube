"use client";

import { ChevronDown, Library } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import type { YouTubeUserPlaylist } from "~/lib/youtube";

type PlaylistSelectProps = {
	playlists: YouTubeUserPlaylist[];
	selectedId: string | undefined;
	onSelect: (id: string) => void;
};

export function PlaylistSelect({
	playlists,
	selectedId,
	onSelect,
}: PlaylistSelectProps) {
	const selected = playlists.find((p) => p.id === selectedId);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary/50 transition-colors text-left"
				>
					<div className="w-12 h-12 rounded overflow-hidden shrink-0 bg-muted">
						{selected?.thumbnailUrl ? (
							/* biome-ignore lint/performance/noImgElement: external URL */
							<img
								src={selected.thumbnailUrl}
								alt=""
								className="w-full h-full object-cover"
							/>
						) : (
							<div className="w-full h-full flex items-center justify-center">
								<Library className="h-5 w-5 text-muted-foreground" />
							</div>
						)}
					</div>
					<div className="flex-1 min-w-0">
						<p className="text-sm font-medium truncate">
							{selected?.title ?? "Select a playlist"}
						</p>
						{selected?.itemCount != null && (
							<p className="text-xs text-muted-foreground">
								{selected.itemCount}{" "}
								{selected.itemCount === 1 ? "video" : "videos"}
							</p>
						)}
					</div>
					<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[60vh] overflow-y-auto"
			>
				{playlists.length === 0 ? (
					<div className="px-2 py-3 text-sm text-muted-foreground text-center">
						No playlists
					</div>
				) : (
					playlists.map((p) => (
						<DropdownMenuItem
							key={p.id}
							onSelect={() => onSelect(p.id)}
							className="gap-3 py-2"
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
								<p className="text-sm font-medium truncate">{p.title}</p>
								{p.itemCount != null && (
									<p className="text-xs text-muted-foreground">
										{p.itemCount} {p.itemCount === 1 ? "video" : "videos"}
									</p>
								)}
							</div>
						</DropdownMenuItem>
					))
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
