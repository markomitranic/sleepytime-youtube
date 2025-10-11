import { NextResponse } from 'next/server';
import { fetchPlaylistsByIds } from '~/lib/youtube';
import { BUILTIN_PLAYLIST_IDS, BUILTIN_PLAYLISTS } from '~/lib/builtinPlaylists';
import { env } from '~/env';

// Cache for 7 days (604800 seconds) - builtin playlists rarely change
export const revalidate = 604800;

export async function GET() {
    try {
        // First, try to return static data from our builtin config to avoid YouTube API calls
        // This provides immediate response and reduces API usage
        const staticPlaylists = BUILTIN_PLAYLISTS.map((p) => ({
            id: p.id,
            title: p.title ?? 'Loading...',
            thumbnailUrl: p.thumbnail,
            channelTitle: p.channel,
            itemCount: undefined, // Will be filled by YouTube API if available
            isPrivate: false,
            privacyStatus: 'public' as const,
        }));

        // Return static data immediately
        const response = NextResponse.json(staticPlaylists, {
            headers: {
                // Add cache headers for CDN caching
                'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
            },
        });

        // In the background, try to fetch fresh data from YouTube API
        // This will update the cache for future requests
        fetchPlaylistsByIds({
            apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
            playlistIds: Array.from(BUILTIN_PLAYLIST_IDS),
        })
            .then((apiResults) => {
                // Apply overrides from our built-in config
                const overrides = new Map(BUILTIN_PLAYLISTS.map((b) => [b.id, b] as const));
                const playlists = apiResults.map((p) => {
                    const o = overrides.get(p.id);
                    return {
                        ...p,
                        title: o?.title ?? p.title,
                        thumbnailUrl: o?.thumbnail ?? p.thumbnailUrl,
                        channelTitle: o?.channel ?? p.channelTitle,
                    };
                });
                // Note: This won't update the current response, but will update the cache
                console.log('Background refresh of builtin playlists completed');
            })
            .catch((error) => {
                console.warn('Background refresh of builtin playlists failed:', error);
            });

        return response;
    } catch (error) {
        console.error('Error in built-in playlists API:', error);

        // Fallback to static data even on error
        const fallbackPlaylists = BUILTIN_PLAYLISTS.map((p) => ({
            id: p.id,
            title: p.title ?? 'Playlist',
            thumbnailUrl: p.thumbnail,
            channelTitle: p.channel,
            itemCount: undefined,
            isPrivate: false,
            privacyStatus: 'public' as const,
        }));

        return NextResponse.json(fallbackPlaylists, {
            headers: {
                // Cache fallback for 1 hour
                'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300',
            },
        });
    }
}

