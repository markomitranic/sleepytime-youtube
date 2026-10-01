"use client";

import { useEffect } from "react";

const HAND_BACK_MS = 300;

/**
 * Calls `onTap` whenever the user taps into an embedded iframe.
 *
 * Cross-origin frames swallow pointer events, so the page only sees its window
 * blur as focus moves in. Focus is handed back shortly after, so the next tap
 * blurs the window again.
 * @example useEmbedTap(wake); // embed taps count as activity
 */
export function useEmbedTap(onTap: () => void, enabled = true) {
	useEffect(() => {
		if (!enabled) return;
		let handBackTimer: ReturnType<typeof setTimeout> | undefined;

		const onWindowBlur = () => {
			const frame = document.activeElement;
			if (!(frame instanceof HTMLIFrameElement)) return;

			onTap();
			clearTimeout(handBackTimer);
			handBackTimer = setTimeout(() => frame.blur(), HAND_BACK_MS);
		};

		window.addEventListener("blur", onWindowBlur);
		return () => {
			window.removeEventListener("blur", onWindowBlur);
			clearTimeout(handBackTimer);
		};
	}, [onTap, enabled]);
}
