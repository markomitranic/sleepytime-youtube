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
import { useQuery } from "@tanstack/react-query";
import {
	ChevronDown,
	ListVideo,
	Loader2,
	Moon,
	Pause,
	Play,
	SkipForward,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "~/components/auth/AuthContext";
import type { YTPlayer } from "~/components/playlist/PlayerContext";
import { usePlayer } from "~/components/playlist/PlayerContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { PlaylistSwitcherDrawer } from "~/components/playlist/PlaylistSwitcherDrawer";
import { SleepTimerDrawer } from "~/components/playlist/SleepTimerDrawer";
import { SleepTimerExpiryOverlay } from "~/components/playlist/SleepTimerExpiryOverlay";
import { SortablePlaylistItem } from "~/components/playlist/SortablePlaylistItem";
import { StickyPlayerBar } from "~/components/playlist/StickyPlayerBar";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { formatTotalDuration } from "~/lib/formatTime";
import {
	deletePlaylistItem,
	fetchUserPlaylists,
	updatePlaylistItemPosition,
} from "~/lib/youtube";

type YTPlayerEvent = {
	target: YTPlayer;
	data?: number;
};

type YTAPI = {
	Player: new (element: HTMLElement, config: object) => YTPlayer;
	PlayerState: {
		ENDED: number;
		PLAYING: number;
		PAUSED: number;
	};
};

declare global {
	interface Window {
		YT: YTAPI;
		onYouTubeIframeAPIReady: () => void;
	}
}

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
	const playerRef = useRef<HTMLDivElement>(null);
	const playerContainerRef = useRef<HTMLDivElement>(null);
	const playerInstanceRef = useRef<YTPlayer | null>(null);
	const [endedOpen, setEndedOpen] = useState(false);
	const endedVideoIdRef = useRef<string | undefined>(undefined);
	const [isReordering, setIsReordering] = useState(false);
	const dialogShownForVideoRef = useRef<string | undefined>(undefined);
	const timeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const [isDragging, setIsDragging] = useState(false);

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
		useSensor(TouchSensor, {
			activationConstraint: { delay: 100, tolerance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const playlistMetadata = useMemo(() => {
		const totalDuration = playlist.items.reduce(
			(sum, item) => sum + (item.durationSeconds ?? 0),
			0,
		);
		return {
			totalDurationSeconds: totalDuration,
			videoCount: playlist.items.length,
		};
	}, [playlist.items]);

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

	const handleNext = useCallback((videoId: string | undefined) => {
		endedVideoIdRef.current = videoId;
		setEndedOpen(true);
	}, []);

	const handlePlayPause = useCallback(() => {
		if (!playerInstanceRef.current) return;
		if (player.isPlaying) {
			playerInstanceRef.current.pauseVideo();
			player.setIsPlaying(false);
		} else {
			playerInstanceRef.current.playVideo();
			player.setIsPlaying(true);
		}
	}, [player]);

	const handleRemoveAndPlayNext = useCallback(() => {
		autoRemoveAndAdvance(endedVideoIdRef.current ?? currentVideoId);
		setEndedOpen(false);
	}, [currentVideoId, autoRemoveAndAdvance]);

	const handlePlayNext = useCallback(() => {
		advanceToNext(endedVideoIdRef.current ?? currentVideoId);
		setEndedOpen(false);
	}, [currentVideoId, advanceToNext]);

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

	const handleDragStart = useCallback(() => setIsDragging(true), []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			setIsDragging(false);
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

	// Load YouTube IFrame API
	useEffect(() => {
		if (!window.YT) {
			const script = document.createElement("script");
			script.src = "https://www.youtube.com/iframe_api";
			script.async = true;
			document.head.appendChild(script);
		}
		window.onYouTubeIframeAPIReady = () => {};
	}, []);

	// Initialize player when video changes
	useEffect(() => {
		if (!currentVideoId) return;
		dialogShownForVideoRef.current = undefined;

		const initPlayer = () => {
			if (!window.YT || !playerRef.current) return;

			if (playerInstanceRef.current?.destroy) {
				try {
					playerInstanceRef.current.destroy();
				} catch {}
			}

			playerInstanceRef.current = new window.YT.Player(playerRef.current, {
				videoId: currentVideoId,
				playerVars: {
					autoplay: 1,
					enablejsapi: 1,
					playsinline: 1,
					rel: 0,
					modestbranding: 1,
					controls: 1,
					fs: 1,
					cc_load_policy: 0,
					iv_load_policy: 3,
					origin: window.location.origin,
				},
				events: {
					onReady: (event: YTPlayerEvent) => {
						player.setPlayerInstance(event.target);
						try {
							const dur = event.target.getDuration?.();
							if (dur) player.updateProgress(0, dur, currentVideoId);
						} catch {}

						const saved = player.getSavedProgress(currentVideoId);
						if (saved && saved > 0) {
							try {
								event.target.seekTo(saved, true);
							} catch {}
						}

						try {
							event.target.playVideo();
							player.setIsPlaying(true);
						} catch {}
					},
					onStateChange: (event: YTPlayerEvent) => {
						try {
							if (event?.data === window?.YT?.PlayerState?.ENDED) {
								player.clearSavedProgress(currentVideoId);
								if (playlist.sleepTimer.isActive) {
									autoRemoveAndAdvance(currentVideoId);
								} else {
									endedVideoIdRef.current = currentVideoId;
									setEndedOpen(true);
								}
							} else if (event?.data === window?.YT?.PlayerState?.PLAYING) {
								player.setIsPlaying(true);
							} else if (event?.data === window?.YT?.PlayerState?.PAUSED) {
								player.setIsPlaying(false);
							}
						} catch {}
					},
				},
			});
		};

		if (window.YT) initPlayer();
		else window.onYouTubeIframeAPIReady = initPlayer;

		return () => {
			if (playerInstanceRef.current?.destroy) {
				try {
					playerInstanceRef.current.destroy();
				} catch {}
				playerInstanceRef.current = null;
			}
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
		};
	}, [
		currentVideoId,
		autoRemoveAndAdvance,
		player.clearSavedProgress,
		player.getSavedProgress,
		player.setIsPlaying,
		player.setPlayerInstance,
		player.updateProgress,
		playlist.sleepTimer.isActive,
	]);

	// Progress tracking for mini player
	useEffect(() => {
		if (!player.playerInstance || !currentVideoId) return;
		if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

		progressIntervalRef.current = setInterval(() => {
			if (!player.playerInstance) return;
			try {
				const t = player.playerInstance.getCurrentTime();
				const d = player.playerInstance.getDuration();
				if (typeof t === "number" && typeof d === "number" && d > 0) {
					player.updateProgress(t, d, currentVideoId);
				}
			} catch {}
		}, 500);

		return () => {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}
		};
	}, [currentVideoId, player.playerInstance, player.updateProgress]);

	// Show dialog 20s before video end (skip when sleep timer active)
	useEffect(() => {
		if (!playerInstanceRef.current || !currentVideoId) return;
		if (timeCheckIntervalRef.current)
			clearInterval(timeCheckIntervalRef.current);

		timeCheckIntervalRef.current = setInterval(() => {
			try {
				if (!playerInstanceRef.current?.getCurrentTime) return;
				const t = playerInstanceRef.current.getCurrentTime();
				const d = playerInstanceRef.current.getDuration();
				if (d > 0 && t > 0 && !playlist.sleepTimer.isActive) {
					const remaining = d - t;
					if (
						remaining <= 20 &&
						remaining > 0 &&
						dialogShownForVideoRef.current !== currentVideoId
					) {
						dialogShownForVideoRef.current = currentVideoId;
						endedVideoIdRef.current = currentVideoId;
						setEndedOpen(true);
					}
				}
			} catch {}
		}, 1000);

		return () => {
			if (timeCheckIntervalRef.current)
				clearInterval(timeCheckIntervalRef.current);
		};
	}, [currentVideoId, playlist.sleepTimer.isActive]);

	// Handle pause/play based on isPaused state (sleep timer expiry)
	useEffect(() => {
		if (!playerInstanceRef.current) return;
		if (playlist.isPaused) {
			playerInstanceRef.current.pauseVideo();
		} else if (playerInstanceRef.current.getPlayerState?.() === 2) {
			playerInstanceRef.current.playVideo();
		}
	}, [playlist.isPaused]);

	// Spacebar for play/pause
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code !== "Space" && e.key !== " ") return;
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable
			)
				return;
			e.preventDefault();
			handlePlayPause();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handlePlayPause]);

	// Empty state
	if (!playlist.items.length || !currentVideoId) {
		return (
			<div className="flex flex-col items-center justify-center h-[calc(100vh-6rem)] gap-6 text-center px-4">
				<div className="space-y-3">
					<ListVideo className="h-16 w-16 mx-auto text-muted-foreground" />
					<h2 className="text-2xl font-semibold">No Playlist Selected</h2>
					<p className="text-muted-foreground max-w-md">
						Choose a playlist to start listening. Browse your personal playlists
						or try one of our curated selections.
					</p>
				</div>
				<PlaylistSwitcherDrawer>
					<Button size="lg" className="gap-2">
						<ListVideo className="h-5 w-5" />
						Select a Playlist
					</Button>
				</PlaylistSwitcherDrawer>
			</div>
		);
	}

	const current = playlist.items.find((i) => i.videoId === currentVideoId);

	return (
		<>
			<StickyPlayerBar playerContainerRef={playerContainerRef} />
			<SleepTimerExpiryOverlay currentVideoId={currentVideoId} />

			{/* Video ended / sleepy dialog */}
			<Dialog open={endedOpen} onOpenChange={setEndedOpen}>
				<DialogContent className="p-0 overflow-hidden">
					<div className="p-6 flex flex-col items-center text-center gap-4">
						<div className="size-16 rounded-full bg-blue-500/10 flex items-center justify-center">
							<Moon className="size-8 text-blue-400" />
						</div>
						<DialogHeader className="p-0">
							<DialogTitle>Sleepy yet?</DialogTitle>
							<DialogDescription>
								This is a good place to stop watching. Your phone will go to
								sleep unless you explicitly decide to continue.
							</DialogDescription>
						</DialogHeader>
					</div>
					<DialogFooter className="gap-2 p-4">
						{canEdit ? (
							<Button onClick={handleRemoveAndPlayNext}>
								Remove &amp; Play Next
							</Button>
						) : (
							<Button onClick={handlePlayNext}>Play Next</Button>
						)}
						<Button variant="ghost" onClick={() => setEndedOpen(false)}>
							Dismiss
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Main layout */}
			<div className="flex flex-col lg:flex-row gap-2 h-[calc(100vh-2rem)] max-h-[calc(100vh-2rem)]">
				{/* Left: Video player + controls */}
				<div className="flex-1 lg:w-2/3 flex flex-col gap-4">
					<PlaylistSwitcherDrawer>
						<button
							type="button"
							className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-sm transition-colors"
						>
							{playlist.items[0]?.thumbnailUrl ? (
								// biome-ignore lint/performance/noImgElement: external YouTube thumbnail URL
								<img
									src={playlist.items[0].thumbnailUrl}
									alt={playlist.snippet?.title ?? "Playlist"}
									className="w-10 h-[23px] rounded object-cover flex-shrink-0"
								/>
							) : (
								<div className="w-10 h-[23px] rounded bg-muted flex items-center justify-center flex-shrink-0">
									<ListVideo className="h-3 w-3 text-muted-foreground" />
								</div>
							)}
							<div className="flex-1 min-w-0 text-left">
								<p className="font-medium truncate text-sm">
									{playlist.snippet?.title ?? "Playlist"}
								</p>
								<p className="text-xs text-muted-foreground">
									{playlistMetadata.videoCount} video
									{playlistMetadata.videoCount !== 1 ? "s" : ""}
									{playlistMetadata.totalDurationSeconds > 0 && (
										<>
											{" · "}
											{formatTotalDuration(
												playlistMetadata.totalDurationSeconds,
											)}
										</>
									)}
								</p>
							</div>
							<ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
						</button>
					</PlaylistSwitcherDrawer>

					<div
						ref={playerContainerRef}
						className="aspect-video w-full overflow-hidden rounded-xl glass-panel bg-black flex-shrink-0"
					>
						<div
							ref={playerRef}
							id={`youtube-player-${currentVideoId}`}
							className="h-full w-full"
							// @ts-expect-error - iOS PWA properties
							style={{ WebkitPlaysInline: true, playsInline: true }}
							playsInline={true}
						/>
					</div>

					<div
						className={`flex-1 flex flex-col gap-4 transition-opacity duration-500 ${player.isInactive ? "opacity-30" : ""}`}
					>
						<div>
							<h2 className="text-xl font-semibold">{current?.title ?? ""}</h2>
							{current?.channelTitle && (
								<p className="text-sm text-muted-foreground">
									{current.channelTitle}
								</p>
							)}
						</div>

						{/* Player Controls */}
						<div className="flex items-center justify-center gap-8 py-2">
							<SleepTimerDrawer>
								<button
									type="button"
									className={`hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full transition focus-visible:ring-[3px] ${
										playlist.sleepTimer.isActive
											? "text-white border-2 border-white"
											: "text-muted-foreground"
									}`}
									aria-label={
										playlist.sleepTimer.isActive
											? "Sleep timer active - click to modify"
											: "Set sleep timer"
									}
								>
									<Moon className="h-5 w-5" />
								</button>
							</SleepTimerDrawer>

							<button
								type="button"
								onClick={handlePlayPause}
								className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-black glow-button focus-visible:ring-[3px] focus-visible:ring-ring/50"
								aria-label={player.isPlaying ? "Pause" : "Play"}
							>
								{player.isPlaying ? (
									<Pause className="h-6 w-6" />
								) : (
									<Play className="h-6 w-6" />
								)}
							</button>

							<button
								type="button"
								onClick={() => handleNext(currentVideoId)}
								className="hover:bg-secondary/60 focus-visible:ring-ring/50 inline-flex h-12 w-12 items-center justify-center rounded-full border text-muted-foreground transition focus-visible:ring-[3px] hover:text-foreground"
								aria-label="Next video"
							>
								<SkipForward className="h-5 w-5" />
							</button>
						</div>
					</div>
				</div>

				{/* Right: Playlist sidebar */}
				<div
					className={`lg:w-1/3 flex flex-col lg:glass-panel lg:rounded-xl lg:pl-2 lg:pb-4 transition-opacity duration-500 ${player.isInactive ? "opacity-30" : ""}`}
				>
					{isReordering && (
						<div className="flex items-center gap-2 text-muted-foreground pb-2">
							<Loader2 className="h-5 w-5 animate-spin" />
							<span className="text-sm">Saving...</span>
						</div>
					)}

					<div
						className={`flex-1 pr-2 -mr-2 pt-2 pb-24 touch-drag-container ${isDragging ? "dragging" : "overflow-y-auto"}`}
					>
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragStart={handleDragStart}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={playlist.items.map((item) => item.id)}
								strategy={verticalListSortingStrategy}
							>
								<ul className="grid grid-cols-1 gap-1">
									{playlist.items.map((item) => (
										<SortablePlaylistItem
											key={item.id}
											item={item}
											isCurrent={Boolean(
												currentVideoId && item.videoId === currentVideoId,
											)}
											canEdit={canEdit}
											onSelect={playlist.setCurrentVideoId}
											onDelete={handleDeleteItem}
										/>
									))}
								</ul>
							</SortableContext>
						</DndContext>
					</div>
				</div>
			</div>
		</>
	);
}
