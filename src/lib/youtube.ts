export type YouTubePlaylistItem = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  videoId?: string;
  channelTitle?: string;
  channelId?: string;
  publishedAt?: string;
  durationSeconds?: number;
};

export type YouTubePlaylistSnippet = {
  id: string;
  title: string;
  description?: string;
  itemCount?: number;
  publishedAt?: string;
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
  return /^(LL|WL|HL|RD|FL)/.test(id);
}

export function extractPlaylistIdFromUrl(input: string): string | null {
  try {
    const url = new URL(input);
    return url.searchParams.get("list") ?? null;
  } catch {
    return null;
  }
}

// --- Shared fetch utility with auth retry logic ---

type YoutubeFetchOptions = {
  url: URL;
  method?: string;
  body?: object;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: () => Promise<string | null>;
  signal?: AbortSignal;
};

async function youtubeFetch({
  url,
  method = "GET",
  body,
  apiKey,
  accessToken,
  refreshToken,
  signal,
}: YoutubeFetchOptions): Promise<Response> {
  // Set API key on URL if no access token
  if (apiKey && !accessToken) url.searchParams.set("key", apiKey);

  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  if (body) headers["Content-Type"] = "application/json";

  const fetchOpts: RequestInit = {
    method,
    headers,
    signal,
    ...(body && { body: JSON.stringify(body) }),
  };

  let res = await fetch(url.toString(), fetchOpts);

  // 401 + refreshToken → refresh and retry
  if (res.status === 401 && accessToken && refreshToken) {
    const freshToken = await refreshToken();
    if (freshToken) {
      headers["Authorization"] = `Bearer ${freshToken}`;
      res = await fetch(url.toString(), { ...fetchOpts, headers });
    }
  }

  // Still 401 + apiKey → retry without auth header, with API key
  if (res.status === 401 && apiKey) {
    const retryUrl = new URL(url.toString());
    retryUrl.searchParams.set("key", apiKey);
    const { Authorization: _, ...headersWithoutAuth } = headers;
    res = await fetch(retryUrl.toString(), {
      ...fetchOpts,
      headers: headersWithoutAuth,
    });
  }

  return res;
}

function throwYouTubeError(res: Response, text: string, context?: string): never {
  const msg = context
    ? `YouTube API error (${context}): ${res.status} ${res.statusText} ${text}`
    : `YouTube API error: ${res.status} ${res.statusText} ${text}`;
  const err: any = new Error(msg);
  err.status = res.status;
  throw err;
}

function pickThumbnail(thumbnails?: {
  default?: { url?: string };
  medium?: { url?: string };
  high?: { url?: string };
}): string | undefined {
  return (
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url
  );
}

function parsePrivacyStatus(
  status?: string,
): "public" | "unlisted" | "private" | undefined {
  if (status === "public" || status === "unlisted" || status === "private") {
    return status;
  }
  return undefined;
}

// Parse ISO 8601 duration (PT1H2M10S) to seconds
function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    parseInt(match[1] || "0", 10) * 3600 +
    parseInt(match[2] || "0", 10) * 60 +
    parseInt(match[3] || "0", 10)
  );
}

// --- Public API functions ---

type AuthParams = {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: () => Promise<string | null>;
  signal?: AbortSignal;
};

export async function fetchPlaylistItems({
  apiKey,
  accessToken,
  playlistId,
  pageToken,
  maxResults = 50,
  signal,
  refreshToken,
}: AuthParams & {
  playlistId: string;
  pageToken?: string;
  maxResults?: number;
}): Promise<{ items: YouTubePlaylistItem[]; nextPageToken?: string }> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", String(Math.min(50, Math.max(1, maxResults))));
  url.searchParams.set("playlistId", playlistId);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await youtubeFetch({ url, apiKey, accessToken, refreshToken, signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throwYouTubeError(res, text);
  }

  const json = await res.json();
  const items: YouTubePlaylistItem[] = (json.items ?? []).map((item: any) => {
    const s = item.snippet ?? {};
    return {
      id: item.id,
      title: s.title ?? "Untitled",
      videoId: s.resourceId?.videoId,
      thumbnailUrl: pickThumbnail(s.thumbnails),
      channelTitle: s.videoOwnerChannelTitle,
      channelId: s.videoOwnerChannelId,
      publishedAt: s.publishedAt,
    };
  });
  return { items, nextPageToken: json.nextPageToken };
}

export async function fetchPlaylistSnippet({
  apiKey,
  accessToken,
  playlistId,
  signal,
  refreshToken,
}: AuthParams & {
  playlistId: string;
}): Promise<YouTubePlaylistSnippet | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", playlistId);

  const res = await youtubeFetch({ url, apiKey, accessToken, refreshToken, signal });
  if (!res.ok) {
    if (res.status === 401) {
      const text = await res.text().catch(() => "");
      throwYouTubeError(res, text);
    }
    return null;
  }

  const json = await res.json();
  const first = json.items?.[0];
  if (!first) return null;
  return {
    id: first.id,
    title: first.snippet?.title ?? "Untitled playlist",
    description: first.snippet?.description,
    itemCount: first.contentDetails?.itemCount,
    publishedAt: first.snippet?.publishedAt,
  };
}

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
    "nextPageToken,items(id,snippet(title,channelTitle,channelId,thumbnails(default(url),medium(url),high(url))),contentDetails(itemCount),status(privacyStatus))",
  );

  const all: YouTubeUserPlaylist[] = [];
  let pageToken: string | undefined;
  let tokenUsed = accessToken;
  let refreshed = false;

  do {
    const url = new URL(base.toString());
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    let res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${tokenUsed}` },
    });

    if (res.status === 401 && !refreshed && refreshToken) {
      const fresh = await refreshToken();
      if (fresh) {
        tokenUsed = fresh;
        refreshed = true;
        res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${tokenUsed}` },
        });
      }
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throwYouTubeError(res, text);
    }

    const json = await res.json();
    const mapped = (json.items ?? [])
      .filter((p: any) => Boolean(p.id))
      .map((p: any) => ({
        id: p.id as string,
        title: p.snippet?.title ?? "Untitled",
        thumbnailUrl: pickThumbnail(p.snippet?.thumbnails),
        itemCount: p.contentDetails?.itemCount,
        isPrivate: p.status?.privacyStatus === "private",
        channelTitle: p.snippet?.channelTitle,
        channelId: p.snippet?.channelId,
        privacyStatus: parsePrivacyStatus(p.status?.privacyStatus),
      }))
      .filter((p: YouTubeUserPlaylist) => !isUnsupportedUserPlaylistId(p.id));
    all.push(...mapped);
    pageToken = json.nextPageToken;
  } while (pageToken);

  return all;
}

export async function fetchPlaylistsByIds({
  apiKey,
  accessToken,
  playlistIds,
  refreshToken,
}: AuthParams & {
  playlistIds: string[];
}): Promise<YouTubeUserPlaylist[]> {
  if (!playlistIds.length) return [];

  const results: YouTubeUserPlaylist[] = [];

  for (let i = 0; i < playlistIds.length; i += 50) {
    const ids = playlistIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("id", ids.join(","));

    const res = await youtubeFetch({ url, apiKey, accessToken, refreshToken });
    if (!res.ok) continue;

    const json = await res.json();
    const mapped = (json.items ?? [])
      .filter((p: any) => Boolean(p.id))
      .map((p: any) => ({
        id: p.id as string,
        title: p.snippet?.title ?? "Untitled",
        thumbnailUrl: pickThumbnail(p.snippet?.thumbnails),
        itemCount: p.contentDetails?.itemCount,
        channelTitle: p.snippet?.channelTitle,
        channelId: p.snippet?.channelId,
        isPrivate: p.status?.privacyStatus === "private",
        privacyStatus: parsePrivacyStatus(p.status?.privacyStatus),
      }));
    results.push(...mapped);
  }

  const order = new Map(playlistIds.map((id, idx) => [id, idx] as const));
  results.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return results;
}

export async function addVideoToPlaylist({
  accessToken,
  playlistId,
  videoId,
  position,
  refreshToken,
}: {
  accessToken: string;
  playlistId: string;
  videoId: string;
  position?: number;
  refreshToken?: () => Promise<string | null>;
}): Promise<void> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");

  const res = await youtubeFetch({
    url,
    method: "POST",
    accessToken,
    refreshToken,
    body: {
      snippet: {
        playlistId,
        resourceId: { kind: "youtube#video", videoId },
        ...(position !== undefined && { position }),
      },
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throwYouTubeError(res, text, "add to playlist");
  }
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

  const res = await youtubeFetch({ url, method: "DELETE", accessToken, refreshToken });
  if (!res.ok) {
    throwYouTubeError(res, "", "delete");
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

  const res = await youtubeFetch({
    url,
    method: "PUT",
    accessToken,
    refreshToken,
    body: {
      id: playlistItemId,
      snippet: {
        playlistId,
        position,
        resourceId: { kind: "youtube#video", videoId },
      },
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throwYouTubeError(res, text, "update");
  }
}

export async function fetchVideoDurations({
  apiKey,
  accessToken,
  videoIds,
  refreshToken,
}: AuthParams & {
  videoIds: string[];
}): Promise<Map<string, number>> {
  if (!videoIds.length) return new Map();

  const durations = new Map<string, number>();

  for (let i = 0; i < videoIds.length; i += 50) {
    const ids = videoIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("id", ids.join(","));

    const res = await youtubeFetch({ url, apiKey, accessToken, refreshToken });
    if (!res.ok) continue;

    const json = await res.json();
    for (const item of json.items ?? []) {
      if (item.id && item.contentDetails?.duration) {
        durations.set(item.id, parseISO8601Duration(item.contentDetails.duration));
      }
    }
  }

  return durations;
}

export async function fetchVideosByIds({
  apiKey,
  accessToken,
  videoIds,
  refreshToken,
}: AuthParams & {
  videoIds: string[];
}): Promise<YouTubePlaylistItem[]> {
  if (!videoIds.length) return [];

  const results: YouTubePlaylistItem[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const ids = videoIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("id", ids.join(","));

    const res = await youtubeFetch({ url, apiKey, accessToken, refreshToken });
    if (!res.ok) continue;

    const json = await res.json();
    for (const item of json.items ?? []) {
      if (!item.id) continue;
      const s = item.snippet ?? {};
      results.push({
        id: item.id,
        title: s.title ?? "Untitled",
        videoId: item.id,
        thumbnailUrl: pickThumbnail(s.thumbnails),
        channelTitle: s.channelTitle,
        channelId: s.channelId,
        publishedAt: s.publishedAt,
        durationSeconds: item.contentDetails?.duration
          ? parseISO8601Duration(item.contentDetails.duration)
          : undefined,
      });
    }
  }

  const order = new Map(videoIds.map((id, idx) => [id, idx] as const));
  results.sort((a, b) => (order.get(a.videoId!) ?? 0) - (order.get(b.videoId!) ?? 0));
  return results;
}
