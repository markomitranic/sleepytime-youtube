import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
        return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
    }

    try {
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

        // First, check if the URL has been archived
        const cdxUrl = new URL("https://web.archive.org/cdx/search/cdx");
        cdxUrl.searchParams.set("url", videoUrl);
        cdxUrl.searchParams.set("output", "json");
        cdxUrl.searchParams.set("limit", "1");
        cdxUrl.searchParams.set("filter", "statuscode:200");

        const cdxRes = await fetch(cdxUrl.toString());
        if (!cdxRes.ok) {
            return NextResponse.json({ error: 'CDX request failed' }, { status: cdxRes.status });
        }

        const cdxData = await cdxRes.json() as string[][];
        if (!cdxData || cdxData.length < 2) {
            return NextResponse.json({ error: 'No archive data found' }, { status: 404 });
        }

        // Get the snapshot timestamp (format: YYYYMMDDhhmmss)
        const snapshot = cdxData[1];
        if (!snapshot) {
            return NextResponse.json({ error: 'No snapshot data' }, { status: 404 });
        }

        const timestamp = snapshot[1];

        // Fetch the archived page
        const archiveUrl = `https://web.archive.org/web/${timestamp}/${videoUrl}`;
        const archiveRes = await fetch(archiveUrl);
        if (!archiveRes.ok) {
            return NextResponse.json({ error: 'Archive request failed' }, { status: archiveRes.status });
        }

        const html = await archiveRes.text();

        // Try to extract title from various meta tags and title element
        // YouTube uses various formats, try them all
        const patterns = [
            /<meta property="og:title" content="([^"]+)"/,
            /<meta name="title" content="([^"]+)"/,
            /<title>([^<]+)<\/title>/,
        ];

        for (const pattern of patterns) {
            const match = html.match(pattern);
            if (match?.[1]) {
                let title = match[1]
                    .replace(/ - YouTube$/, "") // Remove " - YouTube" suffix
                    .trim();
                if (title && title !== "YouTube") {
                    return NextResponse.json({ title });
                }
            }
        }

        return NextResponse.json({ error: 'No title found in archive' }, { status: 404 });
    } catch (error) {
        console.error('Error fetching from Wayback Machine:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
