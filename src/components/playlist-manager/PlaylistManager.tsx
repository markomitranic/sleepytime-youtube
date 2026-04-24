"use client";

import { Library, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MovePanel } from "~/components/playlist-manager/MovePanel";
import { MoveRibbon } from "~/components/playlist-manager/MoveRibbon";
import { PlaylistItem } from "~/components/playlist-manager/PlaylistItem";
import { PlaylistSelect } from "~/components/playlist-manager/PlaylistSelect";
import {
	useDeletePlaylistItem,
	useMovePlaylistItem,
	usePlaylistItems,
	useUserPlaylists,
} from "~/lib/queries";
import { useMediaQuery } from "~/lib/useMediaQuery";
import type { YouTubePlaylistItem, YouTubeUserPlaylist } from "~/lib/youtube";

export function PlaylistManager() {
	const { data: userPlaylists, isLoading: playlistsLoading } =
		useUserPlaylists();
	const isDesktop = useMediaQuery("(min-width: 1024px)");

	const sorted = useMemo(
		() =>
			[...(userPlaylists ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
		[userPlaylists],
	);

	const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

	useEffect(() => {
		if (!selectedId && sorted[0]) setSelectedId(sorted[0].id);
	}, [sorted, selectedId]);

	const itemsQuery = usePlaylistItems(selectedId);
	const deleteMutation = useDeletePlaylistItem(selectedId);
	const moveMutation = useMovePlaylistItem();

	const items = useMemo(
		() => itemsQuery.data?.pages.flatMap((p) => p.items) ?? [],
		[itemsQuery.data],
	);

	const otherPlaylists = useMemo(
		() => sorted.filter((p) => p.id !== selectedId),
		[sorted, selectedId],
	);

	const [activeMoveId, setActiveMoveId] = useState<string | null>(null);
	const activeMoveItem = useMemo(
		() => items.find((i) => i.id === activeMoveId),
		[items, activeMoveId],
	);

	const panelRef = useRef<HTMLDivElement>(null);
	const buttonRefsMap = useRef(new Map<string, HTMLButtonElement>());

	const registerMoveButton = useCallback(
		(id: string, el: HTMLButtonElement | null) => {
			if (el) buttonRefsMap.current.set(id, el);
			else buttonRefsMap.current.delete(id);
		},
		[],
	);

	const getActiveButton = useCallback(
		() =>
			activeMoveId ? (buttonRefsMap.current.get(activeMoveId) ?? null) : null,
		[activeMoveId],
	);
	const getPanelEl = useCallback(() => panelRef.current, []);

	useEffect(() => {
		if (!activeMoveId) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setActiveMoveId(null);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [activeMoveId]);

	useEffect(() => {
		if (isDesktop === false) setActiveMoveId(null);
	}, [isDesktop]);

	const handleSelectPlaylist = (id: string) => {
		setSelectedId(id);
		setActiveMoveId(null);
	};

	const handleDelete = async (item: YouTubePlaylistItem) => {
		try {
			await deleteMutation.mutateAsync({ playlistItemId: item.id });
			toast.success("Video removed from playlist");
		} catch (e) {
			toast.error((e as Error)?.message ?? "Failed to remove video.");
			throw e;
		}
	};

	const handleMove = async (
		item: YouTubePlaylistItem,
		target: YouTubeUserPlaylist,
	) => {
		if (!selectedId) return;
		setActiveMoveId(null);
		try {
			await moveMutation.mutateAsync({
				sourcePlaylistId: selectedId,
				destPlaylistId: target.id,
				item,
			});
			toast.success(`Moved to ${target.title}`);
		} catch (e) {
			toast.error((e as Error)?.message ?? "Failed to move video.");
		}
	};

	const handleLoadMore = async () => {
		if (itemsQuery.hasNextPage && !itemsQuery.isFetchingNextPage) {
			await itemsQuery.fetchNextPage();
		}
	};

	if (isDesktop === null || playlistsLoading) {
		return (
			<div className="flex items-center justify-center py-24">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!sorted.length) {
		return (
			<div className="flex flex-col items-center justify-center gap-4 py-24 text-center text-muted-foreground">
				<Library className="h-10 w-10" />
				<p className="text-sm">You don&apos;t have any playlists yet.</p>
			</div>
		);
	}

	const itemsLoading = itemsQuery.isLoading && Boolean(selectedId);

	return (
		<div className="flex-1 min-h-0 flex gap-6">
			<div className="flex-1 min-w-0 flex flex-col glass-panel rounded-xl overflow-hidden">
				<div className="px-2 py-2 border-b border-white/[0.06]">
					<PlaylistSelect
						playlists={sorted}
						selectedId={selectedId}
						onSelect={handleSelectPlaylist}
					/>
				</div>

				<div className="flex-1 overflow-y-auto min-h-[200px]">
					{itemsLoading ? (
						<div className="flex items-center justify-center py-16">
							<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
						</div>
					) : items.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
							<Library className="h-8 w-8" />
							<p className="text-sm">This playlist has no videos</p>
						</div>
					) : (
						<ul className="grid grid-cols-1 gap-px">
							{items.map((item) => (
								<PlaylistItem
									key={item.id}
									item={item}
									isDesktop={isDesktop}
									isMoveActive={activeMoveId === item.id}
									otherPlaylists={otherPlaylists}
									onDelete={handleDelete}
									onMove={handleMove}
									onRequestMoveDesktop={() =>
										setActiveMoveId((curr) =>
											curr === item.id ? null : item.id,
										)
									}
									registerMoveButton={registerMoveButton}
								/>
							))}
						</ul>
					)}
				</div>

				{itemsQuery.hasNextPage && selectedId && (
					<button
						type="button"
						onClick={handleLoadMore}
						disabled={itemsQuery.isFetchingNextPage}
						className="text-sm border-t border-white/[0.06] h-12 w-full text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
					>
						{itemsQuery.isFetchingNextPage ? (
							<Loader2 className="h-4 w-4 animate-spin inline mr-1.5" />
						) : null}
						{itemsQuery.isFetchingNextPage ? "Loading..." : "Load more"}
					</button>
				)}
			</div>

			{isDesktop && (
				<>
					<MovePanel
						ref={panelRef}
						isOpen={!!activeMoveItem}
						playlists={otherPlaylists}
						activeItem={activeMoveItem}
						onSelect={(p) => activeMoveItem && handleMove(activeMoveItem, p)}
						onClose={() => setActiveMoveId(null)}
					/>
					<MoveRibbon
						isActive={!!activeMoveItem}
						getButtonEl={getActiveButton}
						getPanelEl={getPanelEl}
					/>
				</>
			)}
		</div>
	);
}
