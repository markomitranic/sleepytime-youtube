export type BuiltinPlaylist = {
  id: string;
  shortLabel: string;
};

export const BUILTIN_PLAYLISTS: BuiltinPlaylist[] = [
  { id: "PLPX6lu9kG1JXEdTsF1GSWzZ8qQA_3aUMs", shortLabel: "slowedReverb" },
  { id: "PLPX6lu9kG1JXtN3eWYd5AaNOpJG2GqeCP", shortLabel: "80s" },
];

export const BUILTIN_PLAYLIST_IDS = BUILTIN_PLAYLISTS.map(p => p.id) as readonly string[];


