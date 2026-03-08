"use client";

import type { DragEndEvent } from "@dnd-kit/core";
import { useQuery } from "@tanstack/react-query";
import { Library } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlayer } from "~/components/playlist/PlayerContext";
import { PlayerControls } from "~/components/playlist/PlayerControls";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { PlaylistSidebar } from "~/components/playlist/PlaylistSidebar";
import { SleepTimerExpiryOverlay } from "~/components/playlist/SleepTimerExpiryOverlay";
import { useYouTubePlayer } from "~/components/playlist/useYouTubePlayer";
import { VideoEndedDialog } from "~/components/playlist/VideoEndedDialog";
import { Button } from "~/components/ui/button";
import {
	deletePlaylistItem,
	fetchUserPlaylists,
	updatePlaylistItemPosition,
} from "~/lib/youtube";

export function Player() {
	const playlist = usePlaylist();
	const player = usePlayer();
	const auth = useAuth();
	const { data: userPlaylists } = useQuery({
		queryKey: ["userPlaylists", auth.accessToken],
		queryFn: async () => {
			if (!auth.isAuthenticated || !auth.accessToken) return [];
			try {
				return await fetchUserPlaylists({
					accessToken: auth.accessToken,
					refreshToken: auth.getTokenSilently,
				});
			} catch {
				return [];
			}
		},
		enabled: Boolean(auth.isAuthenticated && auth.accessToken),
		staleTime: 1000 * 60,
	});
	const canEdit = Boolean(
		auth.isAuthenticated &&
			playlist.playlistId &&
			(userPlaylists?.some((p) => p.id === playlist.playlistId) ?? false),
	);
	const currentVideoId = playlist.currentVideoId;
	const [endedOpen, setEndedOpen] = useState(false);
	const endedVideoIdRef = useRef<string | undefined>(undefined);
	const [isReordering, setIsReordering] = useState(false);

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
					playlist.removeItem(videoId);
					setIsReordering(true);
					deletePlaylistItem({
						accessToken: auth.accessToken,
						playlistItemId: currentItem.id,
					})
						.then(() => playlist.refreshItemsOnce({ delayMs: 900 }))
						.catch(
							async () => await playlist.refreshItemsOnce({ delayMs: 900 }),
						)
						.finally(() => setIsReordering(false));
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
			if (item.videoId) playlist.removeItem(item.videoId);
			setIsReordering(true);

			try {
				await deletePlaylistItem({
					accessToken: auth.accessToken,
					playlistItemId: itemId,
					refreshToken: auth.getTokenSilently,
				});
				if (wasCurrentVideo) {
					const nextId = getNextVideoId(item.videoId);
					if (nextId) playlist.setCurrentVideoId(nextId);
				}
				await playlist.refreshItemsOnce({ delayMs: 900 });
				toast.success("Video removed from playlist");
			} catch (e) {
				toast.error((e as Error)?.message ?? "Failed to remove video.");
				await playlist.refreshItemsOnce({ delayMs: 900 });
				throw e;
			} finally {
				setIsReordering(false);
			}
		},
		[
			auth.isAuthenticated,
			auth.accessToken,
			currentVideoId,
			playlist,
			getNextVideoId,
			auth.getTokenSilently,
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
			const steps = Math.abs(newIndex - oldIndex);
			const direction = oldIndex < newIndex ? "down" : "up";
			for (let i = 0; i < steps; i++) {
				playlist.reorderItem(movedItem.videoId, direction);
			}

			setIsReordering(true);
			try {
				await updatePlaylistItemPosition({
					accessToken: auth.accessToken,
					playlistItemId: movedItem.id,
					playlistId: playlist.playlistId,
					videoId: movedItem.videoId,
					position: newIndex,
					refreshToken: auth.getTokenSilently,
				});
				playlist
					.refreshItemsOnce({ delayMs: 2000 })
					.catch(() => {})
					.finally(() => setIsReordering(false));
			} catch {
				await playlist.refreshItemsOnce({ delayMs: 500 });
				setIsReordering(false);
			}
		},
		[auth.isAuthenticated, auth.accessToken, playlist, auth.getTokenSilently],
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

			{/* Main layout */}
			<div className="flex flex-col lg:flex-row gap-2 h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
				{/* Left: Video player + controls */}
				<div className="flex-1 lg:w-2/3 flex flex-col gap-4">
					<div className="aspect-video w-full overflow-hidden rounded-xl glass-panel bg-black shrink-0">
						<div
							ref={playerRef}
							id={`youtube-player-${currentVideoId}`}
							className="h-full w-full"
							// @ts-expect-error - iOS PWA properties
							style={{ WebkitPlaysInline: true, playsInline: true }}
							playsInline={true}
						/>
					</div>

					<PlayerControls
						currentVideo={current}
						isPlaying={player.isPlaying}
						sleepTimerIsActive={playlist.sleepTimer.isActive}
						onPlayPause={handlePlayPause}
						onNext={handleNext}
					/>
				</div>

				<PlaylistSidebar
					items={playlist.items}
					currentVideoId={currentVideoId}
					canEdit={canEdit}
					hasMore={playlist.hasMore}
					isReordering={isReordering}
					onSelectVideo={playlist.setCurrentVideoId}
					onDeleteItem={handleDeleteItem}
					onDragEnd={handleDragEnd}
					onLoadMore={playlist.loadMoreItems}
				/>
			</div>
		</>
	);
}
