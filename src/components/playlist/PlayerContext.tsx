"use client";

import { usePathname } from "next/navigation";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

export type YTPlayer = {
	destroy: () => void;
	playVideo: () => void;
	pauseVideo: () => void;
	getCurrentTime: () => number;
	getDuration: () => number;
	seekTo: (seconds: number, allowSeekAhead: boolean) => void;
	getPlayerState: () => number;
};

type PlayerState = {
	isInactive: boolean;
	isPlaying: boolean;
	currentTime: number;
	duration: number;
	playerInstance: YTPlayer | null;
};

type PlayerActions = {
	resetInactivity: () => void;
	updateProgress: (time: number, duration: number, videoId?: string) => void;
	setPlayerInstance: (instance: YTPlayer | null) => void;
	setIsPlaying: (playing: boolean) => void;
	getSavedProgress: (videoId: string) => number | null;
	clearSavedProgress: (videoId: string) => void;
};

const PROGRESS_STORAGE_KEY = "sleepytime-video-progress";

const PlayerContext = createContext<(PlayerState & PlayerActions) | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
	const [isInactive, setIsInactive] = useState(false);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const [duration, setDuration] = useState(0);
	const [playerInstance, setPlayerInstance] = useState<YTPlayer | null>(null);
	const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
	const pathname = usePathname();
	const isPlayerPage = pathname === "/player";

	const resetInactivity = useCallback(() => {
		if (!isPlayerPage) return;
		setIsInactive(false);
		if (inactivityTimerRef.current) {
			clearTimeout(inactivityTimerRef.current);
		}
		inactivityTimerRef.current = setTimeout(() => {
			setIsInactive(true);
		}, 10000);
	}, [isPlayerPage]);

	const updateProgress = useCallback(
		(time: number, dur: number, videoId?: string) => {
			setCurrentTime(time);
			setDuration(dur);

			if (videoId && dur > 0) {
				try {
					const progress = JSON.parse(
						localStorage.getItem(PROGRESS_STORAGE_KEY) || "{}",
					);
					progress[videoId] = {
						currentTime: time,
						duration: dur,
						timestamp: Date.now(),
					};
					localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
				} catch {}
			}
		},
		[],
	);

	const getSavedProgress = useCallback((videoId: string): number | null => {
		try {
			const progress = JSON.parse(
				localStorage.getItem(PROGRESS_STORAGE_KEY) || "{}",
			);
			const saved = progress[videoId];
			if (!saved?.currentTime || !saved?.duration) return null;
			if (saved.duration - saved.currentTime < 10) return null;
			const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
			if (saved.timestamp && saved.timestamp < sevenDaysAgo) return null;
			return saved.currentTime;
		} catch {
			return null;
		}
	}, []);

	const clearSavedProgress = useCallback((videoId: string) => {
		try {
			const progress = JSON.parse(
				localStorage.getItem(PROGRESS_STORAGE_KEY) || "{}",
			);
			delete progress[videoId];
			localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
		} catch {}
	}, []);

	// Inactivity timer - only active on player page
	useEffect(() => {
		if (!isPlayerPage) {
			setIsInactive(false);
			if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
			return;
		}

		const events = [
			"mousedown",
			"mousemove",
			"keydown",
			"touchstart",
			"scroll",
		] as const;
		for (const event of events) {
			window.addEventListener(event, resetInactivity);
		}
		resetInactivity();

		return () => {
			if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
			for (const event of events) {
				window.removeEventListener(event, resetInactivity);
			}
		};
	}, [isPlayerPage, resetInactivity]);

	return (
		<PlayerContext.Provider
			value={{
				isInactive,
				resetInactivity,
				isPlaying,
				currentTime,
				duration,
				playerInstance,
				updateProgress,
				setPlayerInstance,
				setIsPlaying,
				getSavedProgress,
				clearSavedProgress,
			}}
		>
			{children}
		</PlayerContext.Provider>
	);
}

export function usePlayer() {
	const context = useContext(PlayerContext);
	if (!context) {
		throw new Error("usePlayer must be used within a PlayerProvider");
	}
	return context;
}
