export type YouTubePlaylistItem = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  videoId?: string;
  channelTitle?: string;
  channelId?: string;
};

export type YouTubePlaylistSnippet = {
  id: string;
  title: string;
  description?: string;
  itemCount?: number;
};

export type YouTubeUserPlaylist = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  itemCount?: number;
  isPrivate?: boolean;
  privacyStatus?: "public" | "unlisted" | "private";
  channelTitle?: string;
  channelId?: string;
};

export function isUnsupportedUserPlaylistId(id: string): boolean {
  // Exclude special/system playlists that commonly 404/are unsupported via Data API playlistItems
  // LL*: Liked videos, WL*: Watch later, HL*: History, RD*: Mix/auto mixes
  // FL*: Favorites (legacy, often 404/private)
  return /^(LL|WL|HL|RD|FL)/.test(id);
}

export function extractPlaylistIdFromUrl(input: string): string | null {
  try {
    const url = new URL(input);
    const list = url.searchParams.get("list");
    if (list) return list;
    // Support youtu.be or additional formats if needed later
    return null;
  } catch {
    return null;
  }
}

type YouTubePlaylistItemsResponse = {
  nextPageToken?: string;
  items: Array<{
    id: string;
    snippet?: {
      title?: string;
      resourceId?: { videoId?: string };
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
      videoOwnerChannelTitle?: string;
      videoOwnerChannelId?: string;
    };
  }>;
};

export async function fetchPlaylistItems({
  apiKey,
  accessToken,
  playlistId,
  pageToken,
  maxResults = 50,
  signal,
  refreshToken,
}: {
  apiKey?: string;
  accessToken?: string;
  playlistId: string;
  pageToken?: string;
  maxResults?: number;
  signal?: AbortSignal;
  refreshToken?: () => Promise<string | null>;
}): Promise<{ items: YouTubePlaylistItem[]; nextPageToken?: string }> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set(
    "maxResults",
    String(Math.min(50, Math.max(1, maxResults)))
  );
  url.searchParams.set("playlistId", playlistId);
  if (apiKey && !accessToken) url.searchParams.set("key", apiKey);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  // First attempt (possibly authorized)
  let res = await fetch(url.toString(), { headers, signal });

  // If unauthorized and we have a refresh function, try to refresh token and retry
  if (res.status === 401 && accessToken && refreshToken) {
    const freshToken = await refreshToken();
    if (freshToken) {
      headers["Authorization"] = `Bearer ${freshToken}`;
      res = await fetch(url.toString(), { headers, signal });
    }
  }

  // If still unauthorized and we have an API key, retry once WITHOUT Authorization header
  if (res.status === 401 && apiKey) {
    try {
      const retryUrl = new URL(url.toString());
      retryUrl.searchParams.set("key", apiKey);
      res = await fetch(retryUrl.toString(), { signal });
    } catch {
      // fall through to error handling
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err: any = new Error(
      `YouTube API error: ${res.status} ${res.statusText} ${text}`
    );
    err.status = res.status;
    throw err;
  }
  const json = (await res.json()) as YouTubePlaylistItemsResponse;
  const simplified: YouTubePlaylistItem[] = (json.items ?? []).map((item) => {
    const s = item.snippet ?? {};
    const title = s.title ?? "Untitled";
    const videoId = s.resourceId?.videoId;
    const thumb =
      s.thumbnails?.high?.url ||
      s.thumbnails?.medium?.url ||
      s.thumbnails?.default?.url;
    const channelTitle = s.videoOwnerChannelTitle;
    const channelId = s.videoOwnerChannelId;
    return {
      id: item.id,
      title,
      videoId,
      thumbnailUrl: thumb,
      channelTitle,
      channelId,
    };
  });
  return { items: simplified, nextPageToken: json.nextPageToken };
}

export async function fetchPlaylistSnippet({
  apiKey,
  accessToken,
  playlistId,
  signal,
  refreshToken,
}: {
  apiKey?: string;
  accessToken?: string;
  playlistId: string;
  signal?: AbortSignal;
  refreshToken?: () => Promise<string | null>;
}): Promise<YouTubePlaylistSnippet | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  // Include contentDetails to obtain itemCount for progress UI
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", playlistId);
  if (apiKey && !accessToken) url.searchParams.set("key", apiKey);
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  let res = await fetch(url.toString(), { headers, signal });

  // If unauthorized and we have a refresh function, try to refresh token and retry
  if (res.status === 401 && accessToken && refreshToken) {
    const freshToken = await refreshToken();
    if (freshToken) {
      headers["Authorization"] = `Bearer ${freshToken}`;
      res = await fetch(url.toString(), { headers, signal });
    }
  }

  if (res.status === 401 && apiKey) {
    try {
      const retryUrl = new URL(url.toString());
      retryUrl.searchParams.set("key", apiKey);
      res = await fetch(retryUrl.toString(), { signal });
    } catch { }
  }
  if (!res.ok) {
    // Propagate 401 to enable caller to sign out; return null for other statuses
    if (res.status === 401) {
      const text = await res.text().catch(() => "");
      const err: any = new Error(
        `YouTube API error: ${res.status} ${res.statusText} ${text}`
      );
      err.status = res.status;
      throw err;
    }
    return null;
  }
  const json = (await res.json()) as {
    items?: Array<{
      id: string;
      snippet?: { title?: string; description?: string };
      contentDetails?: { itemCount?: number };
    }>;
  };
  const first = json.items?.[0];
  if (!first) return null;
  return {
    id: first.id,
    title: first.snippet?.title ?? "Untitled playlist",
    description: first.snippet?.description,
    itemCount: first.contentDetails?.itemCount,
  };
}

type YouTubePlaylistsListResponse = {
  nextPageToken?: string;
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      channelTitle?: string;
      channelId?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
    };
    status?: { privacyStatus?: string };
    contentDetails?: { itemCount?: number };
  }>;
};

export async function fetchUserPlaylists({
  accessToken,
  refreshToken,
}: {
  accessToken: string;
  refreshToken?: () => Promise<string | null>;
}): Promise<YouTubeUserPlaylist[]> {
  const base = new URL("https://www.googleapis.com/youtube/v3/playlists");
  base.searchParams.set("part", "snippet,contentDetails,status");
  base.searchParams.set("mine", "true");
  base.searchParams.set("maxResults", "50");
  base.searchParams.set(
    "fields",
    [
      "nextPageToken",
      "items(id,snippet(title,channelTitle,channelId,thumbnails(default(url),medium(url),high(url))),contentDetails(itemCount),status(privacyStatus))",
    ].join(",")
  );

  let currentToken = accessToken;
  let tokenRefreshed = false;

  const all: YouTubeUserPlaylist[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const url = new URL(base.toString());
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    let res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    // If unauthorized and we haven't refreshed yet, try to refresh token and retry
    if (res.status === 401 && !tokenRefreshed && refreshToken) {
      const freshToken = await refreshToken();
      if (freshToken) {
        currentToken = freshToken;
        tokenRefreshed = true;
        res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err: any = new Error(
        `YouTube API error: ${res.status} ${text}`
      );
      err.status = res.status;
      throw err;
    }
    const json = (await res.json()) as YouTubePlaylistsListResponse;
    const mapped: YouTubeUserPlaylist[] = (json.items ?? [])
      .filter((p) => Boolean(p.id))
      .map((p) => {
        const title = p.snippet?.title ?? "Untitled";
        const thumb =
          p.snippet?.thumbnails?.high?.url ||
          p.snippet?.thumbnails?.medium?.url ||
          p.snippet?.thumbnails?.default?.url;
        return {
          id: p.id as string,
          title,
          thumbnailUrl: thumb,
          itemCount: p.contentDetails?.itemCount,
          isPrivate: p.status?.privacyStatus === "private",
          channelTitle: p.snippet?.channelTitle,
          channelId: p.snippet?.channelId,
          privacyStatus:
            p.status?.privacyStatus === "public" ||
              p.status?.privacyStatus === "unlisted" ||
              p.status?.privacyStatus === "private"
              ? (p.status?.privacyStatus as "public" | "unlisted" | "private")
              : undefined,
        };
      })
      .filter((p) => !isUnsupportedUserPlaylistId(p.id));
    all.push(...mapped);
    pageToken = json.nextPageToken;
  } while (pageToken);

  return all;
}

// Fetch metadata for specific playlist IDs (public/unlisted). If an accessToken is provided
// and the user has access, it may also return private metadata. Intended for built-in IDs.
export async function fetchPlaylistsByIds({
  apiKey,
  accessToken,
  playlistIds,
  refreshToken,
}: {
  apiKey?: string;
  accessToken?: string;
  playlistIds: string[];
  refreshToken?: () => Promise<string | null>;
}): Promise<YouTubeUserPlaylist[]> {
  if (!playlistIds.length) return [];

  // YouTube API allows up to 50 ids per request
  const chunks: string[][] = [];
  for (let i = 0; i < playlistIds.length; i += 50) {
    chunks.push(playlistIds.slice(i, i + 50));
  }

  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  let tokenRefreshed = false;

  const results: YouTubeUserPlaylist[] = [];
  for (const ids of chunks) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("id", ids.join(","));
    if (apiKey && !accessToken) url.searchParams.set("key", apiKey);

    let res = await fetch(url.toString(), { headers });

    // If unauthorized and we haven't refreshed yet, try to refresh token and retry
    if (res.status === 401 && accessToken && !tokenRefreshed && refreshToken) {
      const freshToken = await refreshToken();
      if (freshToken) {
        headers["Authorization"] = `Bearer ${freshToken}`;
        tokenRefreshed = true;
        res = await fetch(url.toString(), { headers });
      }
    }

    if (res.status === 401 && apiKey) {
      try {
        const retryUrl = new URL(url.toString());
        retryUrl.searchParams.set("key", apiKey);
        res = await fetch(retryUrl.toString());
      } catch { }
    }
    if (!res.ok) {
      // Skip this chunk on error but continue processing others
      continue;
    }
    const json = (await res.json()) as {
      items?: Array<{
        id?: string;
        snippet?: {
          title?: string;
          channelTitle?: string;
          channelId?: string;
          thumbnails?: {
            default?: { url?: string };
            medium?: { url?: string };
            high?: { url?: string };
          };
        };
        status?: { privacyStatus?: string };
        contentDetails?: { itemCount?: number };
      }>;
    };

    const mapped: YouTubeUserPlaylist[] = (json.items ?? [])
      .filter((p) => Boolean(p.id))
      .map((p) => {
        const title = p.snippet?.title ?? "Untitled";
        const thumb =
          p.snippet?.thumbnails?.high?.url ||
          p.snippet?.thumbnails?.medium?.url ||
          p.snippet?.thumbnails?.default?.url;
        return {
          id: p.id as string,
          title,
          thumbnailUrl: thumb,
          itemCount: p.contentDetails?.itemCount,
          channelTitle: p.snippet?.channelTitle,
          channelId: p.snippet?.channelId,
          isPrivate: p.status?.privacyStatus === "private",
          privacyStatus:
            p.status?.privacyStatus === "public" ||
              p.status?.privacyStatus === "unlisted" ||
              p.status?.privacyStatus === "private"
              ? (p.status?.privacyStatus as "public" | "unlisted" | "private")
              : undefined,
        };
      });
    results.push(...mapped);
  }

  // Preserve input order
  const order = new Map(playlistIds.map((id, idx) => [id, idx] as const));
  results.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return results;
}

export async function deletePlaylistItem({
  accessToken,
  playlistItemId,
  refreshToken,
}: {
  accessToken: string;
  playlistItemId: string;
  refreshToken?: () => Promise<string | null>;
}): Promise<void> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("id", playlistItemId);
  let res = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // If unauthorized, try to refresh token and retry
  if (res.status === 401 && refreshToken) {
    const freshToken = await refreshToken();
    if (freshToken) {
      res = await fetch(url.toString(), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${freshToken}` },
      });
    }
  }

  if (!res.ok) {
    throw new Error(
      `YouTube API error (delete): ${res.status} ${res.statusText}`
    );
  }
}

export async function updatePlaylistItemPosition({
  accessToken,
  playlistItemId,
  playlistId,
  videoId,
  position,
  refreshToken,
}: {
  accessToken: string;
  playlistItemId: string;
  playlistId: string;
  videoId: string;
  position: number;
  refreshToken?: () => Promise<string | null>;
}): Promise<void> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  const body = {
    id: playlistItemId,
    snippet: {
      playlistId,
      position,
      resourceId: { kind: "youtube#video", videoId },
    },
  };
  let res = await fetch(url.toString(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  // If unauthorized, try to refresh token and retry
  if (res.status === 401 && refreshToken) {
    const freshToken = await refreshToken();
    if (freshToken) {
      res = await fetch(url.toString(), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${freshToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `YouTube API error (update): ${res.status} ${res.statusText} ${text}`
    );
  }
}

export type YouTubeSubscriptionVideo = {
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  channelTitle?: string;
  channelId?: string;
  publishedAt: string;
  description?: string;
};

type YouTubeActivitiesResponse = {
  nextPageToken?: string;
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      channelId?: string;
      publishedAt?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
    };
    contentDetails?: {
      upload?: {
        videoId?: string;
      };
    };
  }>;
};

export async function fetchSubscriptionVideos({
  accessToken,
  pageToken,
  maxResults = 20,
  signal,
  refreshToken,
}: {
  accessToken: string;
  pageToken?: string;
  maxResults?: number;
  signal?: AbortSignal;
  refreshToken?: () => Promise<string | null>;
}): Promise<{ items: YouTubeSubscriptionVideo[]; nextPageToken?: string }> {
  const url = new URL("https://www.googleapis.com/youtube/v3/activities");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("home", "true");
  url.searchParams.set("maxResults", String(Math.min(50, Math.max(1, maxResults))));
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  let res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal,
  });

  // If unauthorized, try to refresh token and retry
  if (res.status === 401 && refreshToken) {
    const freshToken = await refreshToken();
    if (freshToken) {
      res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${freshToken}` },
        signal,
      });
    }
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err: any = new Error(
      `YouTube API error: ${res.status} ${text}`
    );
    err.status = res.status;
    err.needsReauth = res.status === 401; // Flag for UI to handle
    throw err;
  }

  const json = (await res.json()) as YouTubeActivitiesResponse;

  // Filter for upload activities and map to video items
  const videos: YouTubeSubscriptionVideo[] = (json.items ?? [])
    .filter((item) => item.contentDetails?.upload?.videoId)
    .map((item) => {
      const snippet = item.snippet ?? {};
      const videoId = item.contentDetails?.upload?.videoId ?? "";
      const thumb =
        snippet.thumbnails?.high?.url ||
        snippet.thumbnails?.medium?.url ||
        snippet.thumbnails?.default?.url;

      return {
        videoId,
        title: snippet.title ?? "Untitled",
        thumbnailUrl: thumb,
        channelTitle: snippet.channelTitle,
        channelId: snippet.channelId,
        publishedAt: snippet.publishedAt ?? new Date().toISOString(),
        description: snippet.description,
      };
    });

  return { items: videos, nextPageToken: json.nextPageToken };
}
