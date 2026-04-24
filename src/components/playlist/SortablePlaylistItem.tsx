import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { toast } from "sonner";
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
import type { YouTubePlaylistItem } from "~/lib/youtube";

type SortableItemProps = {
	canEdit: boolean;
	isCurrent: boolean;
	item: YouTubePlaylistItem;
	onDelete: (itemId: string) => Promise<void>;
	onSelect: (videoId?: string) => void;
};

export function SortablePlaylistItem({
	item,
	isCurrent,
	canEdit,
	onSelect,
	onDelete,
}: SortableItemProps) {
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id, disabled: !canEdit });

	const style: CSSProperties = {
		transform: CSS.Translate.toString(transform),
		transition,
		...(isDragging && { opacity: 0, pointerEvents: "none" }),
	};

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await onDelete(item.id);
		} finally {
			setIsDeleting(false);
			setShowDeleteConfirm(false);
		}
	};

	return (
		<>
			<li
				ref={setNodeRef}
				style={style}
				data-video-id={item.videoId}
				className={`flex cursor-pointer items-start gap-3 border-y white/[0.06] py-3 pr-3 select-none transition-all duration-200 hover:shadow-lg hover:bg-secondary/80 ${
					isCurrent ? "playlist-item-playing bg-secondary/60" : ""
				}`}
				onClick={() => {
					if (!item.videoId) {
						toast.error("This video is unavailable (private or removed)");
						return;
					}
					onSelect(item.videoId);
				}}
				onKeyDown={(e) => {
					if (e.key !== "Enter" && e.key !== " ") return;
					e.preventDefault();
					if (!item.videoId) {
						toast.error("This video is unavailable (private or removed)");
						return;
					}
					onSelect(item.videoId);
				}}
			>
				{canEdit && item.videoId ? (
					<button
						type="button"
						ref={setActivatorNodeRef}
						className="w-8 inline-flex items-center justify-center rounded transition-colors self-stretch flex-shrink-0 text-white hover:text-white/80 hover:bg-secondary/50 cursor-grab active:cursor-grabbing touch-manipulation select-none touch-drag-handle"
						aria-label="Drag to reorder"
						onClick={(e) => e.stopPropagation()}
						{...attributes}
						{...listeners}
					>
						<GripVertical className="h-5 w-5" />
					</button>
				) : (
					<div className="w-8 shrink-0" />
				)}

				<VideoThumbnail item={item} />

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<p
							className={`truncate font-medium ${isCurrent ? "opacity-80" : ""}`}
						>
							{item.title}
						</p>
					</div>
					{item.channelTitle && (
						<div className="flex flex-col gap-1">
							<p className="text-xs text-muted-foreground">
								{item.channelTitle}
							</p>
							{isCurrent && (
								<span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground w-fit">
									<span className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_6px_theme(colors.green.500)]" />
									Playing
								</span>
							)}
						</div>
					)}
				</div>

				{canEdit && item.videoId && (
					<button
						type="button"
						className="h-8 w-8 inline-flex items-center justify-center rounded self-center flex-shrink-0 transition-colors text-white hover:text-red-500 hover:bg-red-500/10"
						aria-label="Delete from playlist"
						onClick={(e) => {
							e.stopPropagation();
							setShowDeleteConfirm(true);
						}}
					>
						<Trash2 className="h-4 w-4" />
					</button>
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
