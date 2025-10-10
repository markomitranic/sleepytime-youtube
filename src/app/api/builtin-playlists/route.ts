import { NextResponse } from 'next/server';
import { fetchPlaylistsByIds } from '~/lib/youtube';
import { BUILTIN_PLAYLIST_IDS, BUILTIN_PLAYLISTS } from '~/lib/builtinPlaylists';
import { env } from '~/env';

// Cache for 72 hours (259200 seconds)
export const revalidate = 259200;

export async function GET() {
    try {
        // Fetch built-in playlists from YouTube API
        const apiResults = await fetchPlaylistsByIds({
            apiKey: env.NEXT_PUBLIC_YOUTUBE_API_KEY,
            playlistIds: Array.from(BUILTIN_PLAYLIST_IDS),
        });

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

        return NextResponse.json(playlists, {
            headers: {
                // Add cache headers for CDN caching
                'Cache-Control': 'public, s-maxage=259200, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error('Error fetching built-in playlists:', error);

        // Return error but with caching to avoid hammering API on repeated failures
        return NextResponse.json(
            { error: 'Failed to fetch playlists' },
            {
                status: 500,
                headers: {
                    // Cache errors for 5 minutes to avoid API spam
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
                },
            }
        );
    }
}

