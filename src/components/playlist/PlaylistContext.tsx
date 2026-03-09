"use client";

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
import { filterNotEmpty } from "~/lib/filterNotEmpty";
import type { SleepTimer } from "~/lib/useSleepTimer";
import { useSleepTimer } from "~/lib/useSleepTimer";
import type {
	YouTubePlaylistItem,
	YouTubePlaylistSnippet,
} from "~/lib/youtube";
import {
	fetchPlaylistItems,
	fetchPlaylistSnippet,
	fetchVideoDurations,
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
	hasMore?: boolean;
	error?: string | null;
	errorDetails?: string | null;
	sleepTimer: SleepTimer;
	isPaused?: boolean;
};

export type PlaylistActions = {
	loadPlaylist: (params: {
		playlistId: string;
		snippet: YouTubePlaylistSnippet | null;
		items: YouTubePlaylistItem[];
		currentVideoId?: string;
	}) => void;
	loadByPlaylistId: (
		playlistId: string,
		opts?: { currentVideoId?: string },
	) => Promise<void>;
	loadMoreItems: () => Promise<void>;
	setCurrentVideoId: (videoId: string | undefined) => void;
	clear: () => void;
	setSleepTimer: (durationMinutes: number) => void;
	deactivateSleepTimer: () => void;
	dismissSleepExpiry: () => void;
	prolongSleepTimer: (additionalMinutes: number) => void;
	triggerSleep: () => void;
	reorderItem: (videoId: string, direction: "up" | "down") => void;
	removeItem: (videoId: string) => void;
	refreshItemsOnce: (opts?: { delayMs?: number }) => Promise<void>;
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

async function fetchDurationsForItems(
	items: YouTubePlaylistItem[],
	accessToken: string | undefined,
	getTokenSilently: () => Promise<string | null>,
) {
	const videoIds = items.map((i) => i.videoId).filter(filterNotEmpty);
	if (!videoIds.length) return;
	try {
		const durations = await fetchVideoDurations({
			apiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
			accessToken,
			videoIds,
			refreshToken: getTokenSilently,
		});
		for (const item of items) {
			if (item.videoId && durations.has(item.videoId)) {
				item.durationSeconds = durations.get(item.videoId);
			}
		}
	} catch (e) {
		console.warn("Failed to fetch video durations", e);
	}
}

const PLAYLIST_PAGE_SIZE = 20;

export function PlaylistProvider({ children }: { children: React.ReactNode }) {
	const [persistedState, setPersistedState] =
		useLocalStorage<PersistedPlaylistState | null>("sleepytime-playlist", null);
	const { sleepTimer, isPaused, sleepTimerActions, resetSleepTimer } =
		useSleepTimer();
	const [state, setState] = useState<
		Omit<PlaylistState, "sleepTimer" | "isPaused">
	>({
		items: [],
	});
	const loadAbortRef = useRef<AbortController | null>(null);
	const nextPageTokenRef = useRef<string | undefined>(undefined);
	const isLoadingMoreRef = useRef(false);
	const pagesLoadedRef = useRef(0);
	const hasInitializedFromStorage = useRef(false);
	const auth = useAuth();

	// Stable ref for auth.getTokenSilently to avoid recreating actions
	const getTokenSilentlyRef = useRef(auth.getTokenSilently);
	useEffect(() => {
		getTokenSilentlyRef.current = auth.getTokenSilently;
	}, [auth.getTokenSilently]);

	const actions: PlaylistActions = useMemo(
		() => ({
			loadPlaylist: ({ playlistId, snippet, items, currentVideoId }) => {
				setState((prev) => {
					const provided = currentVideoId ?? undefined;
					const preserved = prev.currentVideoId ?? undefined;
					const fallback = items.find((i) => Boolean(i.videoId))?.videoId;
					return {
						...prev,
						playlistId,
						snippet,
						items,
						currentVideoId: provided ?? preserved ?? fallback,
						isLoading: false,
						error: null,
						errorDetails: null,
					};
				});
			},
			loadByPlaylistId: async (playlistId, opts) => {
				try {
					if (loadAbortRef.current) {
						try {
							loadAbortRef.current.abort();
						} catch {}
					}

					const controller = new AbortController();
					loadAbortRef.current = controller;
					nextPageTokenRef.current = undefined;
					pagesLoadedRef.current = 0;

					setState((s) => ({
						...s,
						isLoading: true,
						error: null,
						errorDetails: null,
						playlistId,
						items: [],
						hasMore: false,
					}));
					if (typeof window !== "undefined") {
						try {
							window.scrollTo(0, 0);
						} catch {}
					}
					if (auth.isAuthenticated && getTokenSilentlyRef.current) {
						try {
							await getTokenSilentlyRef.current();
						} catch {}
					}
					const snippet = await fetchPlaylistSnippet({
						apiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
						accessToken: auth.accessToken,
						playlistId,
						signal: loadAbortRef.current?.signal,
						refreshToken: getTokenSilentlyRef.current,
					});

					setState((s) => ({
						...s,
						snippet: snippet ?? null,
					}));

					// Fetch only the first page of items
					const res = await fetchPlaylistItems({
						apiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
						accessToken: auth.accessToken,
						playlistId,
						maxResults: PLAYLIST_PAGE_SIZE,
						signal: loadAbortRef.current?.signal,
						refreshToken: getTokenSilentlyRef.current,
					});

					nextPageTokenRef.current = res.nextPageToken;
					pagesLoadedRef.current = 1;

					await fetchDurationsForItems(
						res.items,
						auth.accessToken,
						getTokenSilentlyRef.current,
					);

					actions.loadPlaylist({
						playlistId,
						snippet: snippet ?? null,
						items: res.items,
						currentVideoId: opts?.currentVideoId,
					});
					setState((s) => ({
						...s,
						hasMore: Boolean(res.nextPageToken),
					}));
				} catch (e) {
					if (e instanceof DOMException && e.name === "AbortError") return;
					const raw = (e as Error)?.message ?? "Failed to load playlist.";
					const lower = raw.toLowerCase();
					const isNotFound =
						lower.includes("playlistnotfound") ||
						lower.includes("cannot be found") ||
						lower.includes("404");
					const isUnauthorized =
						(e as { status?: number }).status === 401 || lower.includes("401");
					const friendly = isNotFound
						? "Couldn't load this playlist. If it's private, ensure you're signed into the same YouTube account that owns it and try refreshing the playlists."
						: raw || "Failed to load playlist.";
					setState((s) => ({
						...s,
						isLoading: false,
						hasMore: false,
						error: friendly,
						errorDetails: raw,
						playlistId: isNotFound ? undefined : s.playlistId,
						items: isNotFound ? [] : s.items,
					}));
					if (isNotFound) {
						setPersistedState(null);
					}
					try {
						if (
							(isUnauthorized || isNotFound) &&
							auth?.isAuthenticated &&
							auth?.signOut
						) {
							try {
								toast.error("Your session expired. You've been signed out.");
							} catch {}
							auth.signOut();
						}
					} catch {}
				}
			},
			loadMoreItems: async () => {
				const playlistId = state.playlistId;
				if (
					!playlistId ||
					!nextPageTokenRef.current ||
					isLoadingMoreRef.current
				)
					return;

				isLoadingMoreRef.current = true;
				try {
					const res = await fetchPlaylistItems({
						apiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
						accessToken: auth.accessToken,
						playlistId,
						maxResults: PLAYLIST_PAGE_SIZE,
						pageToken: nextPageTokenRef.current,
						refreshToken: getTokenSilentlyRef.current,
					});

					nextPageTokenRef.current = res.nextPageToken;
					pagesLoadedRef.current += 1;

					await fetchDurationsForItems(
						res.items,
						auth.accessToken,
						getTokenSilentlyRef.current,
					);

					setState((s) => ({
						...s,
						items: [...s.items, ...res.items],
						hasMore: Boolean(res.nextPageToken),
					}));
				} finally {
					isLoadingMoreRef.current = false;
				}
			},
			setCurrentVideoId: (videoId) =>
				setState((s) => ({ ...s, currentVideoId: videoId })),
			clear: () => {
				if (loadAbortRef.current) {
					try {
						loadAbortRef.current.abort();
					} catch {}
					loadAbortRef.current = null;
				}
				nextPageTokenRef.current = undefined;
				pagesLoadedRef.current = 0;
				isLoadingMoreRef.current = false;
				setState({
					items: [],
				});
				resetSleepTimer();
				setPersistedState(null);
			},
			setSleepTimer: sleepTimerActions.setSleepTimer,
			deactivateSleepTimer: sleepTimerActions.deactivateSleepTimer,
			dismissSleepExpiry: sleepTimerActions.dismissSleepExpiry,
			prolongSleepTimer: sleepTimerActions.prolongSleepTimer,
			triggerSleep: sleepTimerActions.triggerSleep,
			reorderItem: (videoId, direction) => {
				setState((prev) => {
					const items = prev.items.slice();
					const currentIndex = items.findIndex((i) => i.videoId === videoId);
					if (currentIndex === -1) return prev;
					let targetIndex = currentIndex;
					if (direction === "up") {
						for (let i = currentIndex - 1; i >= 0; i--) {
							if (items[i]?.videoId) {
								targetIndex = i;
								break;
							}
						}
					} else {
						for (let i = currentIndex + 1; i < items.length; i++) {
							if (items[i]?.videoId) {
								targetIndex = i;
								break;
							}
						}
					}
					if (targetIndex === currentIndex) return prev;
					const updated = items.slice();
					const removed = updated.splice(currentIndex, 1);
					const moved = removed[0];
					if (!moved) return prev;
					updated.splice(targetIndex, 0, moved);
					return { ...prev, items: updated };
				});
			},
			removeItem: (videoId) => {
				setState((prev) => {
					const updated = prev.items.filter((i) => i.videoId !== videoId);
					const nextCurrent =
						prev.currentVideoId === videoId
							? updated.find((i) => Boolean(i.videoId))?.videoId
							: prev.currentVideoId;
					return { ...prev, items: updated, currentVideoId: nextCurrent };
				});
			},
			refreshItemsOnce: async ({
				delayMs = 700,
			}: {
				delayMs?: number;
			} = {}) => {
				const playlistId = state.playlistId;
				if (!playlistId) return;
				await new Promise((r) => setTimeout(r, Math.max(0, delayMs)));
				try {
					const aggregated: YouTubePlaylistItem[] = [];
					let pageToken: string | undefined;
					const maxPages = pagesLoadedRef.current || 1;
					let page = 0;
					do {
						const res = await fetchPlaylistItems({
							apiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
							accessToken: auth.accessToken,
							playlistId,
							maxResults: PLAYLIST_PAGE_SIZE,
							pageToken,
							refreshToken: getTokenSilentlyRef.current,
						});
						aggregated.push(...res.items);
						pageToken = res.nextPageToken;
						page++;
					} while (pageToken && page < maxPages);

					nextPageTokenRef.current = pageToken;
					setState((s) => ({
						...s,
						items: aggregated,
						hasMore: Boolean(pageToken),
					}));
				} catch {
					// ignore
				}
			},
		}),
		[
			auth.isAuthenticated,
			auth.accessToken,
			sleepTimerActions,
			resetSleepTimer,
			auth?.signOut,
			setPersistedState,
			state.playlistId,
		],
	);

	const currentVideoMeta = useMemo(() => {
		const fromItems = state.items.find(
			(i) => i.videoId === state.currentVideoId,
		);
		if (fromItems) {
			return {
				title: fromItems.title,
				thumbnailUrl: fromItems.thumbnailUrl,
				channelTitle: fromItems.channelTitle,
			};
		}
		if (persistedState?.currentVideoId === state.currentVideoId) {
			return {
				title: persistedState.currentVideoTitle,
				thumbnailUrl: persistedState.currentVideoThumbnail,
				channelTitle: persistedState.currentVideoChannel,
			};
		}
		return undefined;
	}, [state.items, state.currentVideoId, persistedState]);

	const value = useMemo(
		() => ({ ...state, currentVideoMeta, sleepTimer, isPaused, ...actions }),
		[state, currentVideoMeta, sleepTimer, isPaused, actions],
	);

	// Sync document title
	useEffect(() => {
		if (typeof document === "undefined") return;
		const baseTitle = "Sleepytime-YouTube";
		const trimmed = state.snippet?.title?.trim();
		document.title =
			state.playlistId && trimmed ? `${baseTitle} - ${trimmed}` : baseTitle;
	}, [state.playlistId, state.snippet?.title]);

	// Persist playlist state to localStorage whenever it changes
	const persistedMetaRef = useRef(persistedState);
	persistedMetaRef.current = persistedState;
	useEffect(() => {
		if (state.playlistId) {
			const currentItem = state.items.find(
				(i) => i.videoId === state.currentVideoId,
			);
			const prev = persistedMetaRef.current;
			setPersistedState({
				playlistId: state.playlistId,
				currentVideoId: state.currentVideoId,
				currentVideoTitle: currentItem?.title ?? prev?.currentVideoTitle,
				currentVideoThumbnail:
					currentItem?.thumbnailUrl ?? prev?.currentVideoThumbnail,
				currentVideoChannel:
					currentItem?.channelTitle ?? prev?.currentVideoChannel,
			});
		}
	}, [state.playlistId, state.currentVideoId, state.items, setPersistedState]);

	// Hydrate from localStorage on mount
	useEffect(() => {
		if (hasInitializedFromStorage.current) return;
		if (!auth.isReady) return;
		hasInitializedFromStorage.current = true;

		if (persistedState?.playlistId) {
			actions.loadByPlaylistId(persistedState.playlistId, {
				currentVideoId: persistedState.currentVideoId,
			});
		}
	}, [
		auth.isReady,
		persistedState?.playlistId,
		persistedState?.currentVideoId,
		actions,
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
