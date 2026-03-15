"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";

import { SortablePlaylistItem } from "~/components/playlist/SortablePlaylistItem";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { YouTubePlaylistItem } from "~/lib/youtube";

export function PlaylistSidebar({
	items,
	currentVideoId,
	canEdit,
	hasMore,
	onSelectVideo,
	onDeleteItem,
	onDragEnd,
	onLoadMore,
}: {
	items: YouTubePlaylistItem[];
	currentVideoId: string | undefined;
	canEdit: boolean;
	hasMore: boolean | undefined;
	onSelectVideo: (videoId?: string) => void;
	onDeleteItem: (itemId: string) => Promise<void>;
	onDragEnd: (event: DragEndEvent) => Promise<void>;
	onLoadMore: () => Promise<void>;
}) {
	const { isFadedOut } = useSleepyFadeout();
	const [isDragging, setIsDragging] = useState(false);
	const [isLoadingMore, setIsLoadingMore] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 100, tolerance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragStart = useCallback(() => setIsDragging(true), []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			setIsDragging(false);
			await onDragEnd(event);
		},
		[onDragEnd],
	);

	const handleLoadMore = useCallback(async () => {
		setIsLoadingMore(true);
		try {
			await onLoadMore();
		} finally {
			setIsLoadingMore(false);
		}
	}, [onLoadMore]);

	return (
		<div
			className={cn(
				"flex flex-col lg:glass-panel lg:rounded-xl lg:pl-2 lg:pb-4 transition-opacity duration-1000",
				isFadedOut && "opacity-25",
			)}
		>
			<div
				className={`pr-2 -mr-2 lg:pt-2 pb-40 touch-drag-container ${isDragging ? "dragging" : ""}`}
			>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={items.map((item) => item.id)}
						strategy={verticalListSortingStrategy}
					>
						<ul className="grid grid-cols-1 gap-1">
							{items.map((item) => (
								<SortablePlaylistItem
									key={item.id}
									item={item}
									isCurrent={Boolean(
										currentVideoId && item.videoId === currentVideoId,
									)}
									canEdit={canEdit}
									onSelect={onSelectVideo}
									onDelete={onDeleteItem}
								/>
							))}
						</ul>
					</SortableContext>
				</DndContext>
				{hasMore && (
					<Button
						type="button"
						variant={"outline"}
						onClick={handleLoadMore}
						disabled={isLoadingMore}
						className="text-sm mt-1 bg-white py-10 w-full text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
					>
						{isLoadingMore ? (
							<Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />
						) : null}
						{isLoadingMore ? "Loading..." : "Load more"}
					</Button>
				)}
			</div>
		</div>
	);
}
