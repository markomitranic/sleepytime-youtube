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
    // Use our server-side API route to avoid CORS issues
    const apiUrl = `/api/wayback?videoId=${encodeURIComponent(videoId)}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.title) {
      return data.title;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching from Wayback Machine API:", error);
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
