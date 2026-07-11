"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { Moon } from "lucide-react";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { PlaylistSidebar } from "~/components/playlist/PlaylistSidebar";
import { SleepTimerDrawer } from "~/components/playlist/SleepTimerDrawer";
import {
	Drawer,
	DrawerContent,
	DrawerFooter,
	DrawerTitle,
} from "~/components/ui/drawer";
import { cn } from "~/lib/utils";
import type {
	YouTubePlaylistItem,
	YouTubePlaylistSnippet,
} from "~/lib/youtube";

/**
 * Right-side slide-over that holds the playlist queue plus a demoted sleep-timer
 * row in its footer.
 *
 * Open state is controlled by the parent so only the remote strip's queue button
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

				<DrawerFooter className="border-t border-white/[0.06] p-0">
					<SleepTimerRow />
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}

/**
 * Quiet full-width footer row that surfaces sleep-timer status and opens the
 * existing SleepTimerDrawer bottom sheet when tapped.
 */
function SleepTimerRow() {
	const playlist = usePlaylist();
	const isActive = playlist.sleepTimer.isActive;

	return (
		<SleepTimerDrawer>
			<button
				type="button"
				className="flex w-full items-center gap-3 px-4 py-4 text-left"
				aria-label="Sleep timer"
			>
				<Moon
					className={cn(
						"h-5 w-5",
						isActive ? "text-green-300" : "text-muted-foreground",
					)}
				/>
				<span className="flex-1 text-sm font-medium">Sleep timer</span>
				<span
					className={cn(
						"text-sm",
						isActive ? "text-green-300" : "text-muted-foreground",
					)}
				>
					{isActive ? "On" : "Off"}
				</span>
			</button>
		</SleepTimerDrawer>
	);
}
