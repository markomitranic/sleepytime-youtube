"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { PlaylistSidebar } from "~/components/playlist/PlaylistSidebar";
import { Drawer, DrawerContent, DrawerTitle } from "~/components/ui/drawer";
import type {
	YouTubePlaylistItem,
	YouTubePlaylistSnippet,
} from "~/lib/youtube";

/**
 * Right-side slide-over that holds the playlist queue.
 *
 * Open state is controlled by the parent so only the deck's queue knob
 * opens it (no edge-swipe). `handleOnly` stops vaul's drag-to-dismiss from
 * fighting @dnd-kit reordering inside the list; the drawer closes via scrim tap.
 * @example <QueueDrawer open={open} onOpenChange={setOpen} items={items} currentVideoId={id} canEdit ... />
 */
export function QueueDrawer({
	open,
	onOpenChange,
	items,
	currentVideoId,
	canEdit,
	hasMore,
	snippet,
	isRefreshing,
	onSelectVideo,
	onDeleteItem,
	onDragEnd,
	onLoadMore,
	onRefresh,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	items: YouTubePlaylistItem[];
	currentVideoId: string | undefined;
	canEdit: boolean;
	hasMore: boolean | undefined;
	snippet?: YouTubePlaylistSnippet | null;
	isRefreshing?: boolean;
	onSelectVideo: (videoId?: string) => void;
	onDeleteItem: (itemId: string) => Promise<void>;
	onDragEnd: (event: DragEndEvent) => Promise<void>;
	onLoadMore: () => Promise<void>;
	onRefresh?: () => Promise<void>;
}) {
	return (
		<Drawer
			direction="right"
			open={open}
			onOpenChange={onOpenChange}
			handleOnly
		>
			<DrawerContent className="gap-0 p-0 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] data-[vaul-drawer-direction=right]:w-[calc(100%-3rem)] data-[vaul-drawer-direction=right]:sm:max-w-md">
				<DrawerTitle className="sr-only">Queue</DrawerTitle>

				<div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
					<PlaylistSidebar
						items={items}
						currentVideoId={currentVideoId}
						canEdit={canEdit}
						hasMore={hasMore}
						snippet={snippet}
						isRefreshing={isRefreshing}
						onSelectVideo={onSelectVideo}
						onDeleteItem={onDeleteItem}
						onDragEnd={onDragEnd}
						onLoadMore={onLoadMore}
						onRefresh={onRefresh}
					/>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
