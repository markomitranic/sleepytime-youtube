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
  playlistId,
  pageToken,
  maxResults = 50,
}: {
  apiKey: string;
  playlistId: string;
  pageToken?: string;
  maxResults?: number;
}): Promise<{ items: YouTubePlaylistItem[]; nextPageToken?: string }> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("maxResults", String(Math.min(50, Math.max(1, maxResults))));
  url.searchParams.set("playlistId", playlistId);
  url.searchParams.set("key", apiKey);
  url.searchParams.set(
    "fields",
    [
      "etag",
      "nextPageToken",
      "items(snippet(title,videoOwnerChannelTitle,videoOwnerChannelId,position,resourceId(videoId),thumbnails(default(url),medium(url),high(url))))",
      "pageInfo",
    ].join(","),
  );
  if (pageToken) url.searchParams.set("pageToken", pageToken);

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status} ${res.statusText}`);
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
  playlistId,
}: {
  apiKey: string;
  playlistId: string;
}): Promise<YouTubePlaylistSnippet | null> {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", playlistId);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("fields", "items(id,snippet(title,description))");
  const res = await fetch(url.toString());
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


