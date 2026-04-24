"use client";

import { CornerUpRight, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { VideoThumbnail } from "~/components/playlist/VideoThumbnail";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { cn } from "~/lib/utils";
import type { YouTubePlaylistItem, YouTubeUserPlaylist } from "~/lib/youtube";

type PlaylistItemProps = {
	item: YouTubePlaylistItem;
	isDesktop: boolean;
	isMoveActive: boolean;
	otherPlaylists: YouTubeUserPlaylist[];
	onDelete: (item: YouTubePlaylistItem) => Promise<void>;
	onMove: (
		item: YouTubePlaylistItem,
		target: YouTubeUserPlaylist,
	) => Promise<void>;
	onRequestMoveDesktop: () => void;
	registerMoveButton: (id: string, el: HTMLButtonElement | null) => void;
};

export function PlaylistItem({
	item,
	isDesktop,
	isMoveActive,
	otherPlaylists,
	onDelete,
	onMove,
	onRequestMoveDesktop,
	registerMoveButton,
}: PlaylistItemProps) {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const moveButtonRef = useCallback(
		(el: HTMLButtonElement | null) => registerMoveButton(item.id, el),
		[item.id, registerMoveButton],
	);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await onDelete(item);
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	return (
		<>
			<li
				data-video-id={item.videoId}
				className={cn(
					"flex items-start gap-3 border-y border-white/[0.06] py-3 pr-3 select-none transition-colors",
					isMoveActive && "bg-white/[0.06]",
				)}
			>
				<div className="w-2 shrink-0" />

				<VideoThumbnail item={item} />

				<div className="min-w-0 flex-1">
					<p className="truncate font-medium">{item.title}</p>
					{item.channelTitle && (
						<p className="text-xs text-muted-foreground truncate">
							{item.channelTitle}
						</p>
					)}
				</div>

				{item.videoId && (
					<div className="flex items-center gap-1 self-center flex-shrink-0">
						<button
							type="button"
							className="h-8 w-8 inline-flex items-center justify-center rounded transition-colors text-white hover:text-red-500 hover:bg-red-500/10"
							aria-label="Delete from playlist"
							onClick={() => setShowDeleteConfirm(true)}
						>
							<Trash2 className="h-4 w-4" />
						</button>

						{isDesktop ? (
							<button
								ref={moveButtonRef}
								type="button"
								className={cn(
									"h-8 w-8 inline-flex items-center justify-center rounded transition-colors",
									isMoveActive
										? "text-foreground bg-white/10"
										: "text-white hover:text-foreground hover:bg-secondary/80",
								)}
								aria-label="Move to another playlist"
								aria-expanded={isMoveActive}
								onClick={onRequestMoveDesktop}
							>
								<CornerUpRight className="h-4 w-4" />
							</button>
						) : (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<button
										type="button"
										className="h-8 w-8 inline-flex items-center justify-center rounded transition-colors text-white hover:text-foreground hover:bg-secondary/80"
										aria-label="Move to another playlist"
									>
										<CornerUpRight className="h-4 w-4" />
									</button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="max-h-[60vh]">
									<DropdownMenuLabel>Move to playlist</DropdownMenuLabel>
									<DropdownMenuSeparator />
									{otherPlaylists.length === 0 ? (
										<div className="px-2 py-3 text-sm text-muted-foreground text-center">
											No other playlists
										</div>
									) : (
										otherPlaylists.map((p) => (
											<DropdownMenuItem
												key={p.id}
												onSelect={() => onMove(item, p)}
											>
												<span className="truncate">{p.title}</span>
											</DropdownMenuItem>
										))
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
					</div>
				)}
			</li>

			<Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<DialogContent className="p-0 overflow-hidden">
					<div className="p-6 flex flex-col items-center text-center gap-4">
						<div className="size-16 rounded-full bg-red-500/10 flex items-center justify-center">
							<Trash2 className="size-8 text-red-500" />
						</div>
						<DialogHeader className="p-0">
							<DialogTitle>Delete from playlist?</DialogTitle>
							<DialogDescription>
								Are you sure you want to remove &quot;{item.title}&quot; from
								the playlist?
							</DialogDescription>
						</DialogHeader>
					</div>
					<DialogFooter className="gap-2 p-4">
						<Button
							variant="outline"
							onClick={() => setShowDeleteConfirm(false)}
							disabled={isDeleting}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={isDeleting}
						>
							{isDeleting ? "Deleting..." : "Delete"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
