"use client";

import { useEffect, useRef } from "react";
import type { YTPlayer } from "~/components/playlist/PlayerContext";

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

export function useYouTubePlayer({
	currentVideoId,
	sleepTimerIsActive,
	onVideoEnded,
	onAutoAdvance,
	player,
}: {
	currentVideoId: string | undefined;
	sleepTimerIsActive: boolean;
	onVideoEnded: (videoId: string) => void;
	onAutoAdvance: (videoId: string) => void;
	player: {
		setPlayerInstance: (instance: YTPlayer | null) => void;
		setIsPlaying: (playing: boolean) => void;
		updateProgress: (time: number, duration: number, videoId?: string) => void;
		getSavedProgress: (videoId: string) => number | null;
		clearSavedProgress: (videoId: string) => void;
		playerInstance: YTPlayer | null;
	};
}) {
	const playerRef = useRef<HTMLDivElement>(null);
	const playerInstanceRef = useRef<YTPlayer | null>(null);
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const currentVideoIdRef = useRef<string | undefined>(undefined);
	const sleepTimerIsActiveRef = useRef(false);
	const autoAdvanceRef = useRef<(videoId: string) => void>(() => {});
	const videoEndedRef = useRef<(videoId: string) => void>(() => {});
	const playerFnsRef = useRef(player);

	sleepTimerIsActiveRef.current = sleepTimerIsActive;
	autoAdvanceRef.current = onAutoAdvance;
	videoEndedRef.current = onVideoEnded;
	playerFnsRef.current = player;

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

	// Create player once, reuse via loadVideoById for subsequent videos
	useEffect(() => {
		if (!currentVideoId) return;

		const p = playerFnsRef.current;

		// Reuse existing player for video changes (preserves autoplay privileges)
		if (playerInstanceRef.current?.loadVideoById && currentVideoIdRef.current) {
			currentVideoIdRef.current = currentVideoId;
			const savedStart = p.getSavedProgress(currentVideoId);
			playerInstanceRef.current.loadVideoById({
				videoId: currentVideoId,
				startSeconds: savedStart && savedStart > 0 ? Math.floor(savedStart) : 0,
			});
			p.setIsPlaying(true);
			return;
		}

		currentVideoIdRef.current = currentVideoId;

		const initPlayer = () => {
			if (!window.YT || !playerRef.current) return;

			if (playerInstanceRef.current?.destroy) {
				try {
					playerInstanceRef.current.destroy();
				} catch {}
			}

			const savedStart = p.getSavedProgress(currentVideoId);

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
					...(savedStart && savedStart > 0
						? { start: Math.floor(savedStart) }
						: {}),
				},
				events: {
					onReady: (event: YTPlayerEvent) => {
						playerFnsRef.current.setPlayerInstance(event.target);
						try {
							const dur = event.target.getDuration?.();
							if (dur)
								playerFnsRef.current.updateProgress(
									0,
									dur,
									currentVideoIdRef.current,
								);
						} catch {}

						try {
							event.target.playVideo();
							playerFnsRef.current.setIsPlaying(true);
						} catch {}
					},
					onStateChange: (event: YTPlayerEvent) => {
						try {
							if (event?.data === window?.YT?.PlayerState?.ENDED) {
								const endedId = currentVideoIdRef.current;
								if (!endedId) return;
								playerFnsRef.current.clearSavedProgress(endedId);
								if (sleepTimerIsActiveRef.current) {
									autoAdvanceRef.current(endedId);
								} else {
									videoEndedRef.current(endedId);
								}
							} else if (event?.data === window?.YT?.PlayerState?.PLAYING) {
								playerFnsRef.current.setIsPlaying(true);
							} else if (event?.data === window?.YT?.PlayerState?.PAUSED) {
								playerFnsRef.current.setIsPlaying(false);
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
	}, [currentVideoId]);

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

	return { playerRef, playerInstanceRef };
}
