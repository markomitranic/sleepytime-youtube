/**
 * Utilities for finding replacement videos for deleted YouTube videos
 */

export type WaybackMachineSnapshot = {
  timestamp: string;
  status: string;
  url: string;
  title?: string;
};

export type YouTubeSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  channelId: string;
  thumbnailUrl?: string;
  description?: string;
  publishedAt?: string;
};

/**
 * Attempts to retrieve the original video title from Wayback Machine
 */
export async function getOriginalVideoTitle(
  videoId: string
): Promise<string | null> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    
    // First, check if the URL has been archived
    const cdxUrl = new URL("https://web.archive.org/cdx/search/cdx");
    cdxUrl.searchParams.set("url", videoUrl);
    cdxUrl.searchParams.set("output", "json");
    cdxUrl.searchParams.set("limit", "1");
    cdxUrl.searchParams.set("filter", "statuscode:200");
    
    const cdxRes = await fetch(cdxUrl.toString());
    if (!cdxRes.ok) return null;
    
    const cdxData = await cdxRes.json() as string[][];
    if (!cdxData || cdxData.length < 2) return null;
    
    // Get the snapshot timestamp (format: YYYYMMDDhhmmss)
    const snapshot = cdxData[1];
    if (!snapshot) return null;
    const timestamp = snapshot[1];
    
    // Fetch the archived page
    const archiveUrl = `https://web.archive.org/web/${timestamp}/${videoUrl}`;
    const archiveRes = await fetch(archiveUrl);
    if (!archiveRes.ok) return null;
    
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
          return title;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching from Wayback Machine:", error);
    return null;
  }
}

/**
 * Searches YouTube for videos matching the given query
 */
export async function searchYouTube({
  query,
  apiKey,
  accessToken,
  maxResults = 10,
  refreshToken,
}: {
  query: string;
  apiKey?: string;
  accessToken?: string;
  maxResults?: number;
  refreshToken?: () => Promise<string | null>;
}): Promise<YouTubeSearchResult[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(Math.min(50, Math.max(1, maxResults))));
  url.searchParams.set("order", "relevance");
  
  const headers: Record<string, string> = {};
  
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  } else if (apiKey) {
    url.searchParams.set("key", apiKey);
  }
  
  let res = await fetch(url.toString(), { headers });
  
  // If unauthorized and we have a refresh function, try to refresh token and retry
  if (res.status === 401 && accessToken && refreshToken) {
    const freshToken = await refreshToken();
    if (freshToken) {
      headers["Authorization"] = `Bearer ${freshToken}`;
      res = await fetch(url.toString(), { headers });
    }
  }
  
  // If still unauthorized and we have an API key, retry without Authorization header
  if (res.status === 401 && apiKey) {
    try {
      const retryUrl = new URL(url.toString());
      retryUrl.searchParams.set("key", apiKey);
      res = await fetch(retryUrl.toString());
    } catch {
      // fall through to error handling
    }
  }
  
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `YouTube Search API error: ${res.status} ${res.statusText} ${text}`
    );
  }
  
  const json = (await res.json()) as {
    items?: Array<{
      id?: { videoId?: string };
      snippet?: {
        title?: string;
        channelTitle?: string;
        channelId?: string;
        description?: string;
        thumbnails?: {
          default?: { url?: string };
          medium?: { url?: string };
          high?: { url?: string };
        };
        publishedAt?: string;
      };
    }>;
  };
  
  return (json.items ?? [])
    .filter((item) => item.id?.videoId && item.snippet)
    .map((item) => ({
      videoId: item.id!.videoId!,
      title: item.snippet!.title ?? "Untitled",
      channelTitle: item.snippet!.channelTitle ?? "Unknown",
      channelId: item.snippet!.channelId ?? "",
      thumbnailUrl:
        item.snippet!.thumbnails?.high?.url ||
        item.snippet!.thumbnails?.medium?.url ||
        item.snippet!.thumbnails?.default?.url,
      description: item.snippet!.description,
      publishedAt: item.snippet!.publishedAt,
    }));
}
