export type BuiltinPlaylist = {
  id: string;
  shortLabel: string;
};

export const BUILTIN_PLAYLISTS: BuiltinPlaylist[] = [
  { id: "PLPX6lu9kG1JXEdTsF1GSWzZ8qQA_3aUMs", shortLabel: "slowedReverb" },
  { id: "PLdvzE2TS0UFKSqqogxzoA7miRHATFMXZH", shortLabel: "Skyrim Homes" },
  { id: "PLXZYfNCCCIGZNcKJYLDf9hi7MSWSKjag9", shortLabel: "Bob Ross" },
  { id: "PLVTclEEyY1SKFumpT86h-y6jikkEUKIAH", shortLabel: "Tolkien Lore" },
];

export const BUILTIN_PLAYLIST_IDS = BUILTIN_PLAYLISTS.map(p => p.id) as readonly string[];


