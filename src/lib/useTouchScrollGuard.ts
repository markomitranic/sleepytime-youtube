"use client";

import { useCallback, useRef } from "react";

const MOVE_TOLERANCE_PX = 8;
const SCROLL_SETTLE_MS = 250;

type TouchGesture = {
	pointerId: number;
	startX: number;
	startY: number;
	shouldBlock: boolean;
};

/** Prevents a touch used for scrolling from activating content beneath it.
 *
 * Apply the returned capture handlers to the element that owns overflow. Mouse
 * clicks and keyboard activation pass through unchanged.
 * @example <div {...useTouchScrollGuard()} className="overflow-y-auto" />
 */
export function useTouchScrollGuard() {
	const gestureRef = useRef<TouchGesture | null>(null);
	const lastTouchScrollRef = useRef(0);
	const blockUntilRef = useRef(0);

	const onPointerDownCapture = useCallback(
		(event: React.PointerEvent<HTMLElement>) => {
			if (event.pointerType !== "touch") {
				gestureRef.current = null;
				return;
			}

			gestureRef.current = {
				pointerId: event.pointerId,
				startX: event.clientX,
				startY: event.clientY,
				shouldBlock: Date.now() < blockUntilRef.current,
			};
		},
		[],
	);

	const onPointerMoveCapture = useCallback(
		(event: React.PointerEvent<HTMLElement>) => {
			const gesture = gestureRef.current;
			if (!gesture || gesture.pointerId !== event.pointerId) return;

			const movedX = Math.abs(event.clientX - gesture.startX);
			const movedY = Math.abs(event.clientY - gesture.startY);
			if (Math.max(movedX, movedY) < MOVE_TOLERANCE_PX) return;

			gesture.shouldBlock = true;
			lastTouchScrollRef.current = Date.now();
		},
		[],
	);

	const onScroll = useCallback(() => {
		const now = Date.now();
		const gesture = gestureRef.current;
		const followsTouch =
			Boolean(gesture) || now - lastTouchScrollRef.current < SCROLL_SETTLE_MS;
		if (!followsTouch) return;

		if (gesture) gesture.shouldBlock = true;
		lastTouchScrollRef.current = now;
		blockUntilRef.current = now + SCROLL_SETTLE_MS;
	}, []);

	const onPointerCancelCapture = useCallback(() => {
		gestureRef.current = null;
	}, []);

	const onClickCapture = useCallback((event: React.MouseEvent<HTMLElement>) => {
		if (event.detail === 0) return;

		const gesture = gestureRef.current;
		gestureRef.current = null;
		if (!gesture?.shouldBlock) return;

		event.preventDefault();
		event.stopPropagation();
	}, []);

	return {
		onClickCapture,
		onPointerCancelCapture,
		onPointerDownCapture,
		onPointerMoveCapture,
		onScroll,
	};
}
