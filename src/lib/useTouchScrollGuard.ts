"use client";

import { useCallback, useRef } from "react";

const TAP_SLOP_PX = 10;
const SCROLL_SETTLE_MS = 400;

type TouchStart = {
	x: number;
	y: number;
	scrollTop: number;
	wasScrolling: boolean;
};

/**
 * Stops a touch that scrolled, or stopped a scroll, from activating a row.
 *
 * Judges the gesture by the container itself: its scroll events and scrollTop
 * survive iOS taking over the pan, pointer moves do not. Mouse and keyboard
 * activation pass through untouched.
 * @example <div {...useTouchScrollGuard()} className="overflow-y-auto" />
 */
export function useTouchScrollGuard() {
	const touchStartRef = useRef<TouchStart | null>(null);
	const lastScrollAtRef = useRef(0);

	const onScroll = useCallback(() => {
		lastScrollAtRef.current = Date.now();
	}, []);

	const onPointerDownCapture = useCallback(
		(event: React.PointerEvent<HTMLElement>) => {
			if (event.pointerType !== "touch") {
				touchStartRef.current = null;
				return;
			}

			touchStartRef.current = {
				x: event.clientX,
				y: event.clientY,
				scrollTop: event.currentTarget.scrollTop,
				wasScrolling: Date.now() - lastScrollAtRef.current < SCROLL_SETTLE_MS,
			};
		},
		[],
	);

	const onPointerCancelCapture = useCallback(() => {
		touchStartRef.current = null;
	}, []);

	const onClickCapture = useCallback((event: React.MouseEvent<HTMLElement>) => {
		const touch = touchStartRef.current;
		touchStartRef.current = null;
		if (!touch || event.detail === 0) return;

		const moved =
			Math.hypot(event.clientX - touch.x, event.clientY - touch.y) >
			TAP_SLOP_PX;
		const scrolled = event.currentTarget.scrollTop !== touch.scrollTop;
		if (!touch.wasScrolling && !moved && !scrolled) return;

		event.preventDefault();
		event.stopPropagation();
	}, []);

	return {
		onClickCapture,
		onPointerCancelCapture,
		onPointerDownCapture,
		onScroll,
	};
}
