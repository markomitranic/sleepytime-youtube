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
};

export type YouTubeUserPlaylist = {
  id: string;
  title: string;
  thumbnailUrl?: string;
  itemCount?: number;
  isPrivate?: boolean;
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
      thumbnails?: { default?: { url?: string }; medium?: { url?: string }; high?: { url?: string } };
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
}: {
  apiKey?: string;
  accessToken?: string;
  playlistId: string;
  pageToken?: string;
  maxResults?: number;
}): Promise<{ items: YouTubePlaylistItem[]; nextPageToken?: string }> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", String(Math.min(50, Math.max(1, maxResults))));
  url.searchParams.set("playlistId", playlistId);
  if (apiKey && !accessToken) url.searchParams.set("key", apiKey);
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`YouTube API error: ${res.status} ${res.statusText} ${text}`);
  }
  const json = (await res.json()) as YouTubePlaylistItemsResponse;
  const simplified: YouTubePlaylistItem[] = (json.items ?? []).map((item) => {
    const s = item.snippet ?? {};
    const title = s.title ?? "Untitled";
    const videoId = s.resourceId?.videoId;
    const thumb = s.thumbnails?.high?.url || s.thumbnails?.medium?.url || s.thumbnails?.default?.url;
    const channelTitle = s.videoOwnerChannelTitle;
    const channelId = s.videoOwnerChannelId;
    return { id: item.id, title, videoId, thumbnailUrl: thumb, channelTitle, channelId };
  });
  return { items: simplified, nextPageToken: json.nextPageToken };
}

export async function fetchPlaylistSnippet({
  apiKey,
  accessToken,
  playlistId,
}: {
  apiKey?: string;
  accessToken?: string;
  playlistId: string;
}): Promise<YouTubePlaylistSnippet | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", playlistId);
  if (apiKey && !accessToken) url.searchParams.set("key", apiKey);
  const headers: Record<string, string> = {};
  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) return null;
  const json = (await res.json()) as { items?: Array<{ id: string; snippet?: { title?: string; description?: string } }> };
  const first = json.items?.[0];
  if (!first) return null;
  return {
    id: first.id,
    title: first.snippet?.title ?? "Untitled playlist",
    description: first.snippet?.description,
  };
}

type YouTubePlaylistsListResponse = {
  nextPageToken?: string;
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      thumbnails?: { default?: { url?: string }; medium?: { url?: string }; high?: { url?: string } };
    };
    status?: { privacyStatus?: string };
    contentDetails?: { itemCount?: number };
  }>;
};

export async function fetchUserPlaylists({ accessToken }: { accessToken: string }): Promise<YouTubeUserPlaylist[]> {
  const base = new URL("https://www.googleapis.com/youtube/v3/playlists");
  base.searchParams.set("part", "snippet,contentDetails,status");
  base.searchParams.set("mine", "true");
  base.searchParams.set("maxResults", "50");
  base.searchParams.set(
    "fields",
    [
      "nextPageToken",
      "items(id,snippet(title,thumbnails(default(url),medium(url),high(url))),contentDetails(itemCount),status(privacyStatus))",
    ].join(","),
  );

  const all: YouTubeUserPlaylist[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const url = new URL(base.toString());
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
    const json = (await res.json()) as YouTubePlaylistsListResponse;
    const mapped: YouTubeUserPlaylist[] = (json.items ?? [])
      .filter((p) => Boolean(p.id))
      .map((p) => {
        const title = p.snippet?.title ?? "Untitled";
        const thumb = p.snippet?.thumbnails?.high?.url || p.snippet?.thumbnails?.medium?.url || p.snippet?.thumbnails?.default?.url;
        return {
          id: p.id as string,
          title,
          thumbnailUrl: thumb,
          itemCount: p.contentDetails?.itemCount,
          isPrivate: p.status?.privacyStatus === "private",
        };
      })
      .filter((p) => !isUnsupportedUserPlaylistId(p.id));
    all.push(...mapped);
    pageToken = json.nextPageToken;
  } while (pageToken);

  return all;
}

export async function deletePlaylistItem({ accessToken, playlistItemId }: { accessToken: string; playlistItemId: string }): Promise<void> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("id", playlistItemId);
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`YouTube API error (delete): ${res.status} ${res.statusText}`);
  }
}

export async function updatePlaylistItemPosition({
  accessToken,
  playlistItemId,
  playlistId,
  videoId,
  position,
}: {
  accessToken: string;
  playlistItemId: string;
  playlistId: string;
  videoId: string;
  position: number;
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
  const res = await fetch(url.toString(), {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`YouTube API error (update): ${res.status} ${res.statusText} ${text}`);
  }
}


