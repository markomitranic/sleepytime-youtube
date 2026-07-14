"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AccountTray } from "~/components/auth/AccountTray";
import { useAuth } from "~/components/auth/AuthContext";
import { useGlobalLoading } from "~/components/GlobalLoadingContext";
import { HomeScreenMenu } from "~/components/home/HomeScreenMenu";
import { Deck } from "~/components/playlist/Deck";
import { LockScreen } from "~/components/playlist/LockScreen";
import { usePlayer } from "~/components/playlist/PlayerContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { PlaylistTray } from "~/components/playlist/PlaylistTray";
import { QueueDrawer } from "~/components/playlist/QueueDrawer";
import { SleepTimerExpiryOverlay } from "~/components/playlist/SleepTimerExpiryOverlay";
import { SleepTray } from "~/components/playlist/SleepTray";
import { useYouTubePlayer } from "~/components/playlist/useYouTubePlayer";
import { VideoEndedDialog } from "~/components/playlist/VideoEndedDialog";
import { useUserPlaylists } from "~/lib/queries";
import { cn } from "~/lib/utils";

/**
 * The full player chassis: screen, deck, trays and drawers.
 *
 * `screenLive` gates the embed — while false (mid-fold), the YouTube player
 * gets no video so nothing loads or plays behind the folding page; the tape
 * threads only once the fold has seated.
 * @example <Player /> // /player direct load, screen live immediately
 */
export function Player({ screenLive = true }: { screenLive?: boolean }) {
	const playlist = usePlaylist();
	const player = usePlayer();
	const auth = useAuth();
	const { data: userPlaylists } = useUserPlaylists();
	const canEdit = Boolean(
		auth.isAuthenticated &&
			playlist.playlistId &&
			(userPlaylists?.some((p) => p.id === playlist.playlistId) ?? false),
	);
	const currentVideoId = playlist.currentVideoId;
	const [endedOpen, setEndedOpen] = useState(false);
	// The clamshell: while true the lock screen swallows all input
	const [locked, setLocked] = useState(false);
	// One tray at a time: opening any panel closes the others
	const [openPanel, setOpenPanel] = useState<
		"queue" | "playlists" | "account" | "sleep" | null
	>(null);
	const endedVideoIdRef = useRef<string | undefined>(undefined);

	// Declarative loading from mutations
	useGlobalLoading("delete-item", playlist.deleteMutation.isPending);
	useGlobalLoading("reorder-item", playlist.reorderMutation.isPending);

	const getNextVideoId = useCallback(
		(fromVideoId: string | undefined): string | undefined => {
			if (!fromVideoId) return undefined;
			const available = playlist.items.filter((item) => item.videoId);
			if (!available.length) return undefined;
			const idx = available.findIndex((item) => item.videoId === fromVideoId);
			if (idx === -1) return undefined;
			return available[(idx + 1) % available.length]?.videoId;
		},
		[playlist.items],
	);

	const advanceToNext = useCallback(
		(fromVideoId: string | undefined) => {
			const nextId = getNextVideoId(fromVideoId);
			if (nextId) playlist.setCurrentVideoId(nextId);
		},
		[getNextVideoId, playlist],
	);

	const autoRemoveAndAdvance = useCallback(
		(videoId: string | undefined) => {
			if (!videoId || !playlist.playlistId) return;
			const nextVideoId = getNextVideoId(videoId);

			if (canEdit && auth.accessToken) {
				const currentItem = playlist.items.find((i) => i.videoId === videoId);
				if (currentItem) {
					playlist.deleteMutation.mutate(
						{ playlistItemId: currentItem.id },
						{
							onError: () => {
								toast.error("Failed to remove video from playlist.");
							},
						},
					);
					player.clearSavedProgress(videoId);
				}
			}

			if (nextVideoId) playlist.setCurrentVideoId(nextVideoId);
		},
		[canEdit, auth.accessToken, playlist, getNextVideoId, player],
	);

	const onVideoEnded = useCallback((videoId: string) => {
		endedVideoIdRef.current = videoId;
		setEndedOpen(true);
	}, []);

	const { playerRef, playerInstanceRef } = useYouTubePlayer({
		currentVideoId: screenLive ? currentVideoId : undefined,
		sleepTimerIsActive: playlist.sleepTimer.isActive,
		onVideoEnded,
		onAutoAdvance: autoRemoveAndAdvance,
		player,
	});

	const handlePlayPause = useCallback(() => {
		if (!playerInstanceRef.current) return;
		if (player.isPlaying) {
			playerInstanceRef.current.pauseVideo();
			player.setIsPlaying(false);
		} else {
			playerInstanceRef.current.playVideo();
			player.setIsPlaying(true);
		}
	}, [player, playerInstanceRef]);

	const handleNext = useCallback(() => {
		endedVideoIdRef.current = currentVideoId;
		setEndedOpen(true);
	}, [currentVideoId]);

	const handleRemoveAndPlayNext = useCallback(() => {
		autoRemoveAndAdvance(endedVideoIdRef.current ?? currentVideoId);
		setEndedOpen(false);
	}, [currentVideoId, autoRemoveAndAdvance]);

	const handlePlayNext = useCallback(() => {
		advanceToNext(endedVideoIdRef.current ?? currentVideoId);
		setEndedOpen(false);
	}, [currentVideoId, advanceToNext]);

	const handleShowDialog = useCallback((videoId: string) => {
		endedVideoIdRef.current = videoId;
		setEndedOpen(true);
	}, []);

	const handleDeleteItem = useCallback(
		async (itemId: string) => {
			if (!auth.isAuthenticated || !auth.accessToken) {
				toast.error("You must be signed in to delete from playlist.");
				throw new Error("Not authenticated");
			}
			if (!playlist.playlistId) {
				toast.error("No playlist selected.");
				throw new Error("No playlist");
			}

			const item = playlist.items.find((i) => i.id === itemId);
			if (!item) {
				toast.error("Couldn't find this video in the playlist.");
				throw new Error("Item not found");
			}

			const wasCurrentVideo = item.videoId === currentVideoId;

			try {
				await playlist.deleteMutation.mutateAsync({ playlistItemId: itemId });
				if (item.videoId) player.clearSavedProgress(item.videoId);
				if (wasCurrentVideo) {
					const nextId = getNextVideoId(item.videoId);
					if (nextId) playlist.setCurrentVideoId(nextId);
				}
				toast.success("Video removed from playlist");
			} catch (e) {
				toast.error((e as Error)?.message ?? "Failed to remove video.");
				throw e;
			}
		},
		[
			auth.isAuthenticated,
			auth.accessToken,
			currentVideoId,
			playlist,
			getNextVideoId,
			player,
		],
	);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			if (!over || active.id === over.id) return;
			if (!auth.isAuthenticated || !auth.accessToken || !playlist.playlistId)
				return;

			const available = playlist.items.filter((i) => i.videoId);
			const oldIndex = available.findIndex((i) => i.id === active.id);
			const newIndex = available.findIndex((i) => i.id === over.id);
			if (oldIndex === -1 || newIndex === -1) return;

			const movedItem = available[oldIndex];
			if (!movedItem?.videoId) return;

			playlist.reorderMutation.mutate(
				{
					playlistItemId: movedItem.id,
					videoId: movedItem.videoId,
					position: newIndex,
				},
				{
					onError: () => {
						toast.error("Failed to reorder playlist.");
					},
				},
			);
		},
		[auth.isAuthenticated, auth.accessToken, playlist],
	);

	// Handle pause/play based on isPaused state (sleep timer expiry)
	useEffect(() => {
		if (!playerInstanceRef.current) return;
		if (playlist.isPaused) {
			playerInstanceRef.current.pauseVideo();
		} else if (playerInstanceRef.current.getPlayerState?.() === 2) {
			playerInstanceRef.current.playVideo();
		}
	}, [playlist.isPaused, playerInstanceRef]);

	const current = playlist.items.find((i) => i.videoId === currentVideoId);

	return (
		<>
			<SleepTimerExpiryOverlay currentVideoId={currentVideoId} />

			<VideoEndedDialog
				open={endedOpen}
				onOpenChange={setEndedOpen}
				canEdit={canEdit}
				onRemoveAndPlayNext={handleRemoveAndPlayNext}
				onPlayNext={handlePlayNext}
				onDismiss={() => setEndedOpen(false)}
				playerInstanceRef={playerInstanceRef}
				currentVideoId={currentVideoId}
				sleepTimerIsActive={playlist.sleepTimer.isActive}
				onShowDialog={handleShowDialog}
			/>

			{/* One unified layout: huge video on top, the deck below, nothing scrolls */}
			<div className="flex h-full flex-col">
				{/* Video maximizes 16:9 within the free space above the deck.
				    [container-type:size] lets the frame width derive from the free
				    height (100cqh * 16/9), capped at full width — keeps a true 16:9
				    box at max size in both orientations. */}
				<div className="flex min-h-0 flex-1 items-start justify-center px-2.5 pt-2.5 [container-type:size]">
					<div
						data-player-screen
						className="relative aspect-video w-[min(100%,177.78cqh)] overflow-hidden rounded-sm glass-panel"
						// Mid-fold the glass is a clear window: the folding page behind
						// the chassis stays visible through the bezel. Inline because
						// .glass-panel's unlayered background outranks any utility.
						style={{ background: screenLive ? "#000" : "transparent" }}
					>
						{/* YT replaces the inner div with its iframe — this wrapper keeps
						    the DOM React owns stable around that foreign swap */}
						<div className={cn("absolute inset-0", !screenLive && "invisible")}>
							<div
								ref={playerRef}
								id="youtube-player"
								className="h-full w-full"
								// @ts-expect-error - iOS PWA properties
								style={{ WebkitPlaysInline: true, playsInline: true }}
								playsInline={true}
							/>
						</div>
						{/* No tape in: the screen is the menu channel (or a loading card) */}
						{screenLive &&
							!currentVideoId &&
							(playlist.isLoading ? <ScreenLoading /> : <HomeScreenMenu />)}
					</div>
				</div>

				{/* Deck bay: the cassette tray rises out of the chassis top edge,
				    its lower lip hidden behind the deck (which stacks above it) */}
				<div className="relative">
					<PlaylistTray
						open={openPanel === "playlists"}
						onOpenChange={(o) => setOpenPanel(o ? "playlists" : null)}
					/>
					<AccountTray
						open={openPanel === "account"}
						onOpenChange={(o) => setOpenPanel(o ? "account" : null)}
						onShowPlaylists={() => setOpenPanel("playlists")}
					/>
					<SleepTray
						open={openPanel === "sleep"}
						onOpenChange={(o) => setOpenPanel(o ? "sleep" : null)}
					/>
					<div className="relative z-30">
						<Deck
							current={current}
							currentVideoId={currentVideoId}
							isPlaying={player.isPlaying}
							onPlayPause={handlePlayPause}
							onNext={handleNext}
							onOpenQueue={() => setOpenPanel("queue")}
							onOpenPlaylists={() =>
								setOpenPanel((p) => (p === "playlists" ? null : "playlists"))
							}
							onOpenAccount={() =>
								setOpenPanel((p) => (p === "account" ? null : "account"))
							}
							playlistsOpen={openPanel === "playlists"}
							onOpenSleep={() =>
								setOpenPanel((p) => (p === "sleep" ? null : "sleep"))
							}
							onLock={() => {
								setOpenPanel(null);
								setLocked(true);
							}}
						/>
					</div>
					{/* Child lock: clamshell sized to this deck bay, plus its
					    viewport-wide input blanket (video stays visible) */}
					<LockScreen open={locked} onUnlock={() => setLocked(false)} />
				</div>
			</div>

			<QueueDrawer
				open={openPanel === "queue"}
				onOpenChange={(o) => setOpenPanel(o ? "queue" : null)}
				items={playlist.items}
				currentVideoId={currentVideoId}
				canEdit={canEdit}
				hasMore={playlist.hasMore}
				snippet={playlist.snippet}
				isRefreshing={playlist.isRefreshing}
				onSelectVideo={playlist.setCurrentVideoId}
				onDeleteItem={handleDeleteItem}
				onDragEnd={handleDragEnd}
				onLoadMore={playlist.loadMoreItems}
				onRefresh={playlist.refresh}
			/>
		</>
	);
}

/** Dot-matrix loading card on the screen glass while a playlist tunes in. */
function ScreenLoading() {
	return (
		<div className="absolute inset-0 z-10 grid place-items-center bg-black">
			<p className="phos-text animate-pulse font-(family-name:--font-dot) text-sm uppercase tracking-[0.35em]">
				Loading
			</p>
		</div>
	);
}
