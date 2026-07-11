"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { Library } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "~/components/auth/AuthContext";
import { useGlobalLoading } from "~/components/GlobalLoadingContext";
import { Deck } from "~/components/playlist/Deck";
import { usePlayer } from "~/components/playlist/PlayerContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { QueueDrawer } from "~/components/playlist/QueueDrawer";
import { SleepTimerExpiryOverlay } from "~/components/playlist/SleepTimerExpiryOverlay";
import { useYouTubePlayer } from "~/components/playlist/useYouTubePlayer";
import { VideoEndedDialog } from "~/components/playlist/VideoEndedDialog";
import { Button } from "~/components/ui/button";
import { useUserPlaylists } from "~/lib/queries";

export function Player() {
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
	const [queueOpen, setQueueOpen] = useState(false);
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
				}
			}

			if (nextVideoId) playlist.setCurrentVideoId(nextVideoId);
		},
		[canEdit, auth.accessToken, playlist, getNextVideoId],
	);

	const onVideoEnded = useCallback((videoId: string) => {
		endedVideoIdRef.current = videoId;
		setEndedOpen(true);
	}, []);

	const { playerRef, playerInstanceRef } = useYouTubePlayer({
		currentVideoId,
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

	// Empty state
	if (!playlist.items.length || !currentVideoId) {
		return (
			<div className="flex flex-col items-center justify-center h-[calc(100vh-6rem)] gap-6 text-center px-4">
				<div className="space-y-3">
					<Library className="h-16 w-16 mx-auto text-muted-foreground" />
					<h2 className="text-2xl font-semibold">No Playlist Selected</h2>
					<p className="text-muted-foreground max-w-md">
						Pick a playlist from the library to start listening.
					</p>
				</div>
				<Link href="/playlists">
					<Button size="lg" className="gap-2">
						<Library className="h-5 w-5" />
						Browse Playlists
					</Button>
				</Link>
			</div>
		);
	}

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
					<div className="aspect-video w-[min(100%,177.78cqh)] overflow-hidden rounded-sm glass-panel bg-black">
						<div
							ref={playerRef}
							id="youtube-player"
							className="h-full w-full"
							// @ts-expect-error - iOS PWA properties
							style={{ WebkitPlaysInline: true, playsInline: true }}
							playsInline={true}
						/>
					</div>
				</div>

				<Deck
					current={current}
					currentVideoId={currentVideoId}
					isPlaying={player.isPlaying}
					onPlayPause={handlePlayPause}
					onNext={handleNext}
					onOpenQueue={() => setQueueOpen(true)}
				/>
			</div>

			<QueueDrawer
				open={queueOpen}
				onOpenChange={setQueueOpen}
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
