export type BuiltinPlaylist = {
  id: string;
  shortLabel: string;
  // Optional overrides for UI without hitting YouTube API
  title?: string;
  thumbnail?: string;
  channel?: string;
};

export const BUILTIN_PLAYLISTS: BuiltinPlaylist[] = [
  {
    id: "PLPX6lu9kG1JXEdTsF1GSWzZ8qQA_3aUMs",
    shortLabel: "slowedReverb",
    title: "Slowed + Reverb",
    channel: "MrManafon",
    // thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  },
  {
    id: "PLdvzE2TS0UFKSqqogxzoA7miRHATFMXZH",
    shortLabel: "Skyrim Homes",
    title: "Skyrim Homes",
    channel: "SkyrimPlus",
    // thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  },
  {
    id: "PLXZYfNCCCIGZNcKJYLDf9hi7MSWSKjag9",
    shortLabel: "Bob Ross",
    title: "Bob Ross - The Joy of Painting",
    thumbnail: "/bobross.jpg",
  },
  {
    id: "PLVTclEEyY1SKFumpT86h-y6jikkEUKIAH",
    shortLabel: "Tolkien Lore",
    title: "Tolkien Lore",
    // thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  },
];

export const BUILTIN_PLAYLIST_IDS = BUILTIN_PLAYLISTS.map(
  (p) => p.id
) as readonly string[];
