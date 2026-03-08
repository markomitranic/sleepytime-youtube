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
	const sleepTimerIsActiveRef = useRef(false);
	const autoAdvanceRef = useRef<(videoId: string) => void>(() => {});
	const videoEndedRef = useRef<(videoId: string) => void>(() => {});

	sleepTimerIsActiveRef.current = sleepTimerIsActive;
	autoAdvanceRef.current = onAutoAdvance;
	videoEndedRef.current = onVideoEnded;

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

		const initPlayer = () => {
			if (!window.YT || !playerRef.current) return;

			if (playerInstanceRef.current?.destroy) {
				try {
					playerInstanceRef.current.destroy();
				} catch {}
			}

			const savedStart = player.getSavedProgress(currentVideoId);

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
						player.setPlayerInstance(event.target);
						try {
							const dur = event.target.getDuration?.();
							if (dur) player.updateProgress(0, dur, currentVideoId);
						} catch {}

						try {
							event.target.playVideo();
							player.setIsPlaying(true);
						} catch {}
					},
					onStateChange: (event: YTPlayerEvent) => {
						try {
							if (event?.data === window?.YT?.PlayerState?.ENDED) {
								player.clearSavedProgress(currentVideoId);
								if (sleepTimerIsActiveRef.current) {
									autoAdvanceRef.current(currentVideoId);
								} else {
									videoEndedRef.current(currentVideoId);
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
		player.clearSavedProgress,
		player.getSavedProgress,
		player.setIsPlaying,
		player.setPlayerInstance,
		player.updateProgress,
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

	return { playerRef, playerInstanceRef };
}
