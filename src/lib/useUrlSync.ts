import { useEffect } from "react";

/**
 * Syncs playlist state to URL params (?list=, ?v=) and document title.
 */
export function useUrlSync({
	playlistId,
	currentVideoId,
	playlistTitle,
}: {
	playlistId?: string;
	currentVideoId?: string;
	playlistTitle?: string;
}) {
	// Sync ?list= param
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!playlistId) return;
		const urlObj = new URL(window.location.href);
		if (urlObj.searchParams.get("list") === playlistId) return;
		urlObj.searchParams.set("list", playlistId);
		const q = urlObj.searchParams.toString();
		window.history.replaceState(
			null,
			"",
			q ? `${urlObj.pathname}?${q}` : urlObj.pathname,
		);
	}, [playlistId]);

	// Sync ?v= param
	useEffect(() => {
		if (typeof window === "undefined") return;
		if (!playlistId || !currentVideoId) return;
		const urlObj = new URL(window.location.href);
		if (urlObj.searchParams.get("v") === currentVideoId) return;
		urlObj.searchParams.set("v", currentVideoId);
		const q = urlObj.searchParams.toString();
		window.history.replaceState(
			null,
			"",
			q ? `${urlObj.pathname}?${q}` : urlObj.pathname,
		);
	}, [playlistId, currentVideoId]);

	// Sync document title
	useEffect(() => {
		if (typeof document === "undefined") return;
		const baseTitle = "Sleepytime-YouTube";
		const trimmed = playlistTitle?.trim();
		document.title =
			playlistId && trimmed ? `${baseTitle} - ${trimmed}` : baseTitle;
	}, [playlistId, playlistTitle]);
}
