"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { useAuth } from "~/components/auth/AuthContext";
import {
	useDeletePlaylistItem,
	usePlaylistItems,
	usePlaylistSnippet,
	useReorderPlaylistItem,
} from "~/lib/queries";
import type { SleepTimer } from "~/lib/useSleepTimer";
import { useSleepTimer } from "~/lib/useSleepTimer";
import type {
	YouTubePlaylistItem,
	YouTubePlaylistSnippet,
} from "~/lib/youtube";

type PersistedPlaylistState = {
	playlistId?: string;
	currentVideoId?: string;
	currentVideoTitle?: string;
	currentVideoThumbnail?: string;
	currentVideoChannel?: string;
};

export type { SleepTimer } from "~/lib/useSleepTimer";

export type PlaylistState = {
	playlistId?: string;
	snippet?: YouTubePlaylistSnippet | null;
	items: YouTubePlaylistItem[];
	currentVideoId?: string;
	currentVideoMeta?: {
		title?: string;
		thumbnailUrl?: string;
		channelTitle?: string;
	};
	isLoading?: boolean;
	isRefreshing?: boolean;
	hasMore?: boolean;
	error?: string | null;
	errorDetails?: string | null;
	sleepTimer: SleepTimer;
	isPaused?: boolean;
};

export type PlaylistActions = {
	loadByPlaylistId: (
		playlistId: string,
		opts?: { currentVideoId?: string },
	) => Promise<void>;
	loadMoreItems: () => Promise<void>;
	refresh: () => Promise<void>;
	setCurrentVideoId: (videoId: string | undefined) => void;
	clear: () => void;
	setSleepTimer: (durationMinutes: number) => void;
	deactivateSleepTimer: () => void;
	dismissSleepExpiry: () => void;
	prolongSleepTimer: (additionalMinutes: number) => void;
	triggerSleep: () => void;
	deleteMutation: ReturnType<typeof useDeletePlaylistItem>;
	reorderMutation: ReturnType<typeof useReorderPlaylistItem>;
};

function useLocalStorage<T>(
	key: string,
	initialValue: T,
): [T, (value: T) => void] {
	const [stored, setStored] = useState<T>(() => {
		try {
			const item = localStorage.getItem(key);
			return item ? (JSON.parse(item) as T) : initialValue;
		} catch {
			return initialValue;
		}
	});

	const setValue = useCallback(
		(value: T) => {
			setStored(value);
			try {
				if (value === null || value === undefined) {
					localStorage.removeItem(key);
				} else {
					localStorage.setItem(key, JSON.stringify(value));
				}
			} catch {}
		},
		[key],
	);

	return [stored, setValue];
}

const PlaylistContext = createContext<(PlaylistState & PlaylistActions) | null>(
	null,
);

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
	const [persistedState, setPersistedState] =
		useLocalStorage<PersistedPlaylistState | null>("sleepytime-playlist", null);
	const { sleepTimer, isPaused, sleepTimerActions, resetSleepTimer } =
		useSleepTimer();

	const [playlistId, setPlaylistId] = useState<string | undefined>(undefined);
	const [currentVideoId, setCurrentVideoIdRaw] = useState<string | undefined>(
		undefined,
	);
	const hasInitializedFromStorage = useRef(false);
	const pendingVideoIdRef = useRef<string | undefined>(undefined);
	const auth = useAuth();
	const queryClient = useQueryClient();

	// React Query hooks
	const snippetQuery = usePlaylistSnippet(playlistId);
	const itemsQuery = usePlaylistItems(playlistId);
	const deleteMutation = useDeletePlaylistItem(playlistId);
	const reorderMutation = useReorderPlaylistItem(playlistId);

	// Derive items from query
	const allItems = useMemo(
		() => itemsQuery.data?.pages.flatMap((p) => p.items) ?? [],
		[itemsQuery.data],
	);

	const snippet = snippetQuery.data ?? null;
	const isLoading = itemsQuery.isLoading && Boolean(playlistId);
	const isRefreshing =
		Boolean(playlistId) &&
		(itemsQuery.isRefetching || snippetQuery.isRefetching);
	const hasMore = itemsQuery.hasNextPage ?? false;
	const queryError = snippetQuery.error ?? itemsQuery.error;

	// Derive error state
	const errorInfo = useMemo(() => {
		if (!queryError) return { error: null, errorDetails: null };
		const raw = queryError.message ?? "Failed to load playlist.";
		const lower = raw.toLowerCase();
		const isNotFound =
			lower.includes("playlistnotfound") ||
			lower.includes("cannot be found") ||
			lower.includes("404");
		const friendly = isNotFound
			? "Couldn't load this playlist. If it's private, ensure you're signed into the same YouTube account that owns it and try refreshing the playlists."
			: raw || "Failed to load playlist.";
		return {
			error: friendly,
			errorDetails: raw,
			isNotFound,
			isUnauthorized: lower.includes("401"),
		};
	}, [queryError]);

	// Handle errors: clear on 404, sign out on 401
	useEffect(() => {
		if (!queryError) return;
		if (errorInfo.isNotFound) {
			setPlaylistId(undefined);
			setCurrentVideoIdRaw(undefined);
			setPersistedState(null);
		}
		if (
			(errorInfo.isUnauthorized || errorInfo.isNotFound) &&
			auth.isAuthenticated &&
			auth.signOut
		) {
			try {
				toast.error("Your session expired. You've been signed out.");
			} catch {}
			auth.signOut();
		}
	}, [queryError, errorInfo, auth, setPersistedState]);

	// When items arrive and we have a pending videoId or need a default
	useEffect(() => {
		if (!allItems.length || !playlistId) return;

		const pending = pendingVideoIdRef.current;
		if (pending) {
			const valid = allItems.some((i) => i.videoId === pending);
			if (valid) {
				setCurrentVideoIdRaw(pending);
				pendingVideoIdRef.current = undefined;
				return;
			}
		}

		// If no currentVideoId or it's not in items, pick first
		if (
			!currentVideoId ||
			!allItems.some((i) => i.videoId === currentVideoId)
		) {
			const fallback = allItems.find((i) => Boolean(i.videoId))?.videoId;
			if (fallback) setCurrentVideoIdRaw(fallback);
		}
	}, [allItems, playlistId, currentVideoId]);

	const setCurrentVideoId = useCallback((videoId: string | undefined) => {
		setCurrentVideoIdRaw(videoId);
	}, []);

	const loadByPlaylistId = useCallback(
		async (newPlaylistId: string, opts?: { currentVideoId?: string }) => {
			pendingVideoIdRef.current = opts?.currentVideoId;
			setPlaylistId(newPlaylistId);
			if (typeof window !== "undefined") {
				try {
					window.scrollTo(0, 0);
				} catch {}
			}
		},
		[],
	);

	const loadMoreItems = useCallback(async () => {
		if (itemsQuery.hasNextPage && !itemsQuery.isFetchingNextPage) {
			await itemsQuery.fetchNextPage();
		}
	}, [itemsQuery]);

	const refresh = useCallback(async () => {
		if (!playlistId) return;
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: ["playlistItems", playlistId],
			}),
			queryClient.invalidateQueries({
				queryKey: ["playlistSnippet", playlistId],
			}),
		]);
	}, [playlistId, queryClient]);

	const clear = useCallback(() => {
		setPlaylistId(undefined);
		setCurrentVideoIdRaw(undefined);
		pendingVideoIdRef.current = undefined;
		resetSleepTimer();
		setPersistedState(null);
	}, [resetSleepTimer, setPersistedState]);

	const currentVideoMeta = useMemo(() => {
		const fromItems = allItems.find((i) => i.videoId === currentVideoId);
		if (fromItems) {
			return {
				title: fromItems.title,
				thumbnailUrl: fromItems.thumbnailUrl,
				channelTitle: fromItems.channelTitle,
			};
		}
		if (persistedState && persistedState.currentVideoId === currentVideoId) {
			return {
				title: persistedState.currentVideoTitle,
				thumbnailUrl: persistedState.currentVideoThumbnail,
				channelTitle: persistedState.currentVideoChannel,
			};
		}
		return undefined;
	}, [allItems, currentVideoId, persistedState]);

	const value = useMemo(
		() => ({
			playlistId,
			snippet,
			items: allItems,
			currentVideoId,
			currentVideoMeta,
			isLoading,
			isRefreshing,
			hasMore,
			error: errorInfo.error,
			errorDetails: errorInfo.errorDetails,
			sleepTimer,
			isPaused,
			loadByPlaylistId,
			loadMoreItems,
			refresh,
			setCurrentVideoId,
			clear,
			setSleepTimer: sleepTimerActions.setSleepTimer,
			deactivateSleepTimer: sleepTimerActions.deactivateSleepTimer,
			dismissSleepExpiry: sleepTimerActions.dismissSleepExpiry,
			prolongSleepTimer: sleepTimerActions.prolongSleepTimer,
			triggerSleep: sleepTimerActions.triggerSleep,
			deleteMutation,
			reorderMutation,
		}),
		[
			playlistId,
			snippet,
			allItems,
			currentVideoId,
			currentVideoMeta,
			isLoading,
			isRefreshing,
			hasMore,
			errorInfo,
			sleepTimer,
			isPaused,
			loadByPlaylistId,
			loadMoreItems,
			refresh,
			setCurrentVideoId,
			clear,
			sleepTimerActions,
			deleteMutation,
			reorderMutation,
		],
	);

	// Sync document title
	useEffect(() => {
		if (typeof document === "undefined") return;
		const baseTitle = "Sleepytime-YouTube";
		const trimmed = snippet?.title?.trim();
		document.title =
			playlistId && trimmed ? `${baseTitle} - ${trimmed}` : baseTitle;
	}, [playlistId, snippet?.title]);

	// Persist playlist state to localStorage
	const persistedMetaRef = useRef(persistedState);
	persistedMetaRef.current = persistedState;
	useEffect(() => {
		if (playlistId) {
			const currentItem = allItems.find((i) => i.videoId === currentVideoId);
			const prev = persistedMetaRef.current;
			setPersistedState({
				playlistId,
				currentVideoId,
				currentVideoTitle: currentItem?.title ?? prev?.currentVideoTitle,
				currentVideoThumbnail:
					currentItem?.thumbnailUrl ?? prev?.currentVideoThumbnail,
				currentVideoChannel:
					currentItem?.channelTitle ?? prev?.currentVideoChannel,
			});
		}
	}, [playlistId, currentVideoId, allItems, setPersistedState]);

	// Hydrate from localStorage on mount
	useEffect(() => {
		if (hasInitializedFromStorage.current) return;
		if (!auth.isReady) return;
		hasInitializedFromStorage.current = true;

		if (persistedState?.playlistId) {
			loadByPlaylistId(persistedState.playlistId, {
				currentVideoId: persistedState.currentVideoId,
			});
		}
	}, [
		auth.isReady,
		persistedState?.playlistId,
		persistedState?.currentVideoId,
		loadByPlaylistId,
	]);

	return (
		<PlaylistContext.Provider value={value}>
			{children}
		</PlaylistContext.Provider>
	);
}

export function usePlaylist() {
	const ctx = useContext(PlaylistContext);
	if (!ctx) throw new Error("usePlaylist must be used within PlaylistProvider");
	return ctx;
}
