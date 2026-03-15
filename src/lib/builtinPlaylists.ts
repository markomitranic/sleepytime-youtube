export type BuiltinPlaylist = {
	id: string;
	shortLabel: string;
	// Optional overrides for UI without hitting YouTube API
	title?: string;
	/** @see https://youtube-thumbnail-grabber.com */
	thumbnail?: string;
	channel?: string;
};

export const BUILTIN_PLAYLISTS: BuiltinPlaylist[] = [
	{
		id: "PLbRxQtYzom4NZnuTE7G22nByvhUJNnT2i",
		shortLabel: "Painting Restoration",
		title: "Painting Restoration",
		channel: "Baumgartner Restoration",
		thumbnail: "/restoration.jpg",
	},
	{
		id: "PLdvzE2TS0UFKSqqogxzoA7miRHATFMXZH",
		shortLabel: "Skyrim Homes",
		title: "Skyrim Homes",
		channel: "SkyrimPlus",
		thumbnail: "/skyrim.jpg",
	},
	{
		id: "PLPX6lu9kG1JXEdTsF1GSWzZ8qQA_3aUMs",
		shortLabel: "slowedReverb",
		title: "Slowed + Reverb",
		channel: "MrManafon",
		thumbnail: "/slowedreverb.jpg",
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
		thumbnail: "/tolkien.jpg",
	},
	{
		id: "PL1jwNlafHh-A5G-VmMdRarvch-Kc0CqM7",
		shortLabel: "Cabin DIY",
		title: "Cabin Life",
		thumbnail: "/rosie.avif",
	},
];

export const BUILTIN_PLAYLIST_IDS = BUILTIN_PLAYLISTS.map(
	(p) => p.id,
) as readonly string[];
