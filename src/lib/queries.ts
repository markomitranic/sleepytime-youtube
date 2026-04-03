import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useAuth } from "~/components/auth/AuthContext";
import { filterNotEmpty } from "~/lib/filterNotEmpty";
import type { YouTubePlaylistItem, YouTubeUserPlaylist } from "~/lib/youtube";
import {
	deletePlaylistItem,
	fetchPlaylistItems,
	fetchPlaylistSnippet,
	fetchVideoDurations,
	updatePlaylistItemPosition,
} from "~/lib/youtube";

export const PLAYLIST_PAGE_SIZE = 20;

/**
 * Shared query for builtin playlists to avoid duplicate API calls
 */
export function useBuiltinPlaylists(enabled: boolean = true) {
	return useQuery({
		queryKey: ["builtinPlaylists"],
		queryFn: async () => {
			const response = await fetch("/api/builtin-playlists");
			if (!response.ok) {
				throw new Error("Failed to fetch built-in playlists");
			}
			return response.json() as Promise<YouTubeUserPlaylist[]>;
		},
		enabled,
		staleTime: 1000 * 60 * 60 * 24,
		gcTime: 1000 * 60 * 60 * 24 * 7,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
	});
}

export function usePlaylistSnippet(playlistId: string | undefined) {
	const auth = useAuth();
	return useQuery({
		queryKey: ["playlistSnippet", playlistId],
		queryFn: async ({ signal }) => {
			if (!playlistId) return null;
			return fetchPlaylistSnippet({
				apiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
				accessToken: auth.accessToken,
				playlistId,
				signal,
				refreshToken: auth.getTokenSilently,
			});
		},
		enabled: Boolean(playlistId),
	});
}

type PlaylistItemsPage = {
	items: YouTubePlaylistItem[];
	nextPageToken?: string;
};

export function usePlaylistItems(playlistId: string | undefined) {
	const auth = useAuth();
	return useInfiniteQuery<
		PlaylistItemsPage,
		Error,
		{ pages: PlaylistItemsPage[] },
		string[],
		string | undefined
	>({
		queryKey: ["playlistItems", playlistId ?? ""],
		queryFn: async ({ pageParam, signal }) => {
			if (!playlistId) return { items: [], nextPageToken: undefined };
			const res = await fetchPlaylistItems({
				apiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
				accessToken: auth.accessToken,
				playlistId,
				maxResults: PLAYLIST_PAGE_SIZE,
				pageToken: pageParam,
				signal,
				refreshToken: auth.getTokenSilently,
			});

			// Enrich with durations
			const videoIds = res.items.map((i) => i.videoId).filter(filterNotEmpty);
			if (videoIds.length) {
				try {
					const durations = await fetchVideoDurations({
						apiKey: process.env.NEXT_PUBLIC_YOUTUBE_API_KEY,
						accessToken: auth.accessToken,
						videoIds,
						refreshToken: auth.getTokenSilently,
					});
					for (const item of res.items) {
						if (item.videoId && durations.has(item.videoId)) {
							item.durationSeconds = durations.get(item.videoId);
						}
					}
				} catch (e) {
					console.warn("Failed to fetch video durations", e);
				}
			}

			return res;
		},
		initialPageParam: undefined,
		getNextPageParam: (lastPage) => lastPage.nextPageToken,
		enabled: Boolean(playlistId),
	});
}

export function useDeletePlaylistItem(playlistId: string | undefined) {
	const auth = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ playlistItemId }: { playlistItemId: string }) => {
			if (!auth.accessToken) throw new Error("Not authenticated");
			await deletePlaylistItem({
				accessToken: auth.accessToken,
				playlistItemId,
				refreshToken: auth.getTokenSilently,
			});
		},
		onMutate: async ({ playlistItemId }) => {
			await queryClient.cancelQueries({
				queryKey: ["playlistItems", playlistId ?? ""],
			});
			const prev = queryClient.getQueryData<{
				pages: PlaylistItemsPage[];
				pageParams: (string | undefined)[];
			}>(["playlistItems", playlistId ?? ""]);

			if (prev) {
				queryClient.setQueryData(["playlistItems", playlistId ?? ""], {
					...prev,
					pages: prev.pages.map((page) => ({
						...page,
						items: page.items.filter((i) => i.id !== playlistItemId),
					})),
				});
			}

			return { prev };
		},
		onError: (_err, _vars, context) => {
			if (context?.prev) {
				queryClient.setQueryData(
					["playlistItems", playlistId ?? ""],
					context.prev,
				);
			}
		},
		onSettled: () => {
			// YouTube API needs time to propagate deletes
			setTimeout(() => {
				queryClient.invalidateQueries({
					queryKey: ["playlistItems", playlistId ?? ""],
				});
				queryClient.invalidateQueries({
					queryKey: ["playlistSnippet", playlistId],
				});
			}, 900);
		},
	});
}

export function useReorderPlaylistItem(playlistId: string | undefined) {
	const auth = useAuth();
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			playlistItemId,
			videoId,
			position,
		}: {
			playlistItemId: string;
			videoId: string;
			position: number;
		}) => {
			if (!auth.accessToken || !playlistId)
				throw new Error("Not authenticated or no playlist");
			await updatePlaylistItemPosition({
				accessToken: auth.accessToken,
				playlistItemId,
				playlistId,
				videoId,
				position,
				refreshToken: auth.getTokenSilently,
			});
		},
		onMutate: async ({ playlistItemId, position }) => {
			await queryClient.cancelQueries({
				queryKey: ["playlistItems", playlistId ?? ""],
			});
			const prev = queryClient.getQueryData<{
				pages: PlaylistItemsPage[];
				pageParams: (string | undefined)[];
			}>(["playlistItems", playlistId ?? ""]);

			if (prev) {
				// Flatten, reorder, then redistribute into pages
				const allItems = prev.pages.flatMap((p) => p.items);
				const oldIndex = allItems.findIndex((i) => i.id === playlistItemId);
				if (oldIndex !== -1) {
					const [moved] = allItems.splice(oldIndex, 1);
					if (moved) {
						allItems.splice(Math.min(position, allItems.length), 0, moved);
					}
				}

				// Redistribute back into pages preserving page structure
				let offset = 0;
				const newPages = prev.pages.map((page) => {
					const count = page.items.length;
					const items = allItems.slice(offset, offset + count);
					offset += count;
					return { ...page, items };
				});

				queryClient.setQueryData(["playlistItems", playlistId ?? ""], {
					...prev,
					pages: newPages,
				});
			}

			return { prev };
		},
		onError: (_err, _vars, context) => {
			if (context?.prev) {
				queryClient.setQueryData(
					["playlistItems", playlistId ?? ""],
					context.prev,
				);
			}
		},
		onSettled: () => {
			// YouTube API needs more time to propagate reorders
			setTimeout(() => {
				queryClient.invalidateQueries({
					queryKey: ["playlistItems", playlistId ?? ""],
				});
			}, 2000);
		},
	});
}
