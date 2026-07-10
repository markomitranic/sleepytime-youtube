"use client";

import type { DragEndEvent, DragStartEvent, Modifier } from "@dnd-kit/core";
import {
	closestCenter,
	DndContext,
	DragOverlay,
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
import { GripVertical, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SortablePlaylistItem } from "~/components/playlist/SortablePlaylistItem";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";
import { formatDuration } from "~/lib/formatTime";
import { cn } from "~/lib/utils";
import type {
	YouTubePlaylistItem,
	YouTubePlaylistSnippet,
} from "~/lib/youtube";

const restrictToVerticalAxis: Modifier = ({ transform }) => ({
	...transform,
	x: 0,
});

export function PlaylistSidebar({
	items,
	currentVideoId,
	canEdit,
	hasMore,
	snippet,
	onSelectVideo,
	onDeleteItem,
	onDragEnd,
	onLoadMore,
}: {
	items: YouTubePlaylistItem[];
	currentVideoId: string | undefined;
	canEdit: boolean;
	hasMore: boolean | undefined;
	snippet?: YouTubePlaylistSnippet | null;
	onSelectVideo: (videoId?: string) => void;
	onDeleteItem: (itemId: string) => Promise<void>;
	onDragEnd: (event: DragEndEvent) => Promise<void>;
	onLoadMore: () => Promise<void>;
}) {
	const { isFadedOut } = useSleepyFadeout();
	const [activeItem, setActiveItem] = useState<YouTubePlaylistItem | null>(
		null,
	);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const listRef = useRef<HTMLDivElement>(null);
	const hasScrolledRef = useRef(false);

	// Auto-scroll to the currently playing item
	useEffect(() => {
		if (!currentVideoId || !listRef.current) return;
		const el = listRef.current.querySelector(
			`[data-video-id="${currentVideoId}"]`,
		);
		if (el) {
			el.scrollIntoView({ block: "start" });
			hasScrolledRef.current = true;
		}
	}, [currentVideoId]);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 300, tolerance: 10 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const item = items.find((i) => i.id === event.active.id);
			setActiveItem(item ?? null);
		},
		[items],
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			setActiveItem(null);
			await onDragEnd(event);
		},
		[onDragEnd],
	);

	const handleDragCancel = useCallback(() => setActiveItem(null), []);

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
			ref={listRef}
			className={cn(
				"flex flex-col lg:glass-panel lg:rounded-xl transition-opacity duration-1000",
				isFadedOut && "opacity-25",
			)}
		>
			{snippet && (
				<div className="flex gap-3 px-4 py-4 border-b border-white/[0.06]">
					{snippet.thumbnailUrl && (
						/* biome-ignore lint/performance/noImgElement: external URL */
						<img
							src={snippet.thumbnailUrl}
							alt=""
							className="w-16 h-16 rounded-lg object-cover shrink-0"
						/>
					)}
					<div className="min-w-0 flex-1">
						<h3 className="font-semibold text-sm truncate">{snippet.title}</h3>
						{snippet.channelTitle && (
							<a
								href={`https://www.youtube.com/channel/${snippet.channelId}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-xs text-muted-foreground hover:text-foreground transition-colors"
							>
								{snippet.channelTitle}
							</a>
						)}
						{snippet.itemCount != null && (
							<p className="text-xs text-muted-foreground mt-0.5">
								{snippet.itemCount} video{snippet.itemCount !== 1 ? "s" : ""}
							</p>
						)}
						{snippet.description && (
							<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
								{snippet.description}
							</p>
						)}
					</div>
				</div>
			)}
			<div
				className={`pr-2 -mr-2 touch-drag-container ${activeItem ? "dragging" : ""}`}
			>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					modifiers={[restrictToVerticalAxis]}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
					onDragCancel={handleDragCancel}
				>
					<SortableContext
						items={items.map((item) => item.id)}
						strategy={verticalListSortingStrategy}
					>
						<ul className="grid grid-cols-1 gap-px">
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
					<DragOverlay dropAnimation={null}>
						{activeItem && <DragOverlayItem item={activeItem} />}
					</DragOverlay>
				</DndContext>
				{hasMore && (
					<button
						type="button"
						onClick={handleLoadMore}
						disabled={isLoadingMore}
						className="text-sm mt-px border-t border-white/[0.06] h-[128px] w-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
					>
						{isLoadingMore ? (
							<Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />
						) : null}
						{isLoadingMore ? "Loading..." : "Load more"}
					</button>
				)}
			</div>
		</div>
	);
}

function DragOverlayItem({ item }: { item: YouTubePlaylistItem }) {
	return (
		<li className="flex items-start gap-3 border-y border-white/[0.06] py-3 pr-3 bg-secondary/80 rounded-lg shadow-xl list-none cursor-grabbing">
			<div className="w-8 inline-flex items-center justify-center self-stretch flex-shrink-0 text-white">
				<GripVertical className="h-5 w-5" />
			</div>
			{item.thumbnailUrl && (
				<div className="relative h-16 w-28 rounded flex-shrink-0">
					{/* biome-ignore lint/performance/noImgElement: external URL */}
					<img
						src={item.thumbnailUrl}
						alt="thumbnail"
						className="h-full w-full rounded object-cover"
					/>
					{item.durationSeconds !== undefined && (
						<div className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-medium">
							{formatDuration(item.durationSeconds)}
						</div>
					)}
				</div>
			)}
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium">{item.title}</p>
				{item.channelTitle && (
					<p className="text-xs text-muted-foreground">{item.channelTitle}</p>
				)}
			</div>
		</li>
	);
}
