"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT_MS = 5000;

const SleepyFadeoutContext = createContext<{ isFadedOut: boolean } | null>(
	null,
);

export function SleepyFadeoutProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isFadedOut, setIsFadedOut] = useState(false);
	const isFadedOutRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// True between a wake-tap's pointerdown and its click: that click is eaten so
	// the first touch only lights the UI (TV-remote-backlight), never activates
	// whatever was under the finger.
	const suppressRef = useRef(false);
	const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const setFaded = (value: boolean) => {
			isFadedOutRef.current = value;
			setIsFadedOut(value);
		};

		const resetTimer = () => {
			setFaded(false);
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => setFaded(true), IDLE_TIMEOUT_MS);
		};

		// Capture phase runs before the bubble-phase resetTimer wakes the UI, so
		// isFadedOutRef still reflects the pre-tap state here. Don't preventDefault
		// on pointerdown — scrolling/gestures must keep working.
		const onPointerDownCapture = () => {
			if (!isFadedOutRef.current) return;
			suppressRef.current = true;
			if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
			// A drag-scroll may never produce a click; clear so it can't eat the next tap.
			suppressTimerRef.current = setTimeout(() => {
				suppressRef.current = false;
			}, 700);
		};

		const onClickCapture = (e: MouseEvent) => {
			if (!suppressRef.current) return;
			e.preventDefault();
			e.stopPropagation();
			suppressRef.current = false;
			if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
		};

		const events = ["pointerdown", "pointermove", "keydown", "scroll"];
		for (const e of events) window.addEventListener(e, resetTimer);
		window.addEventListener("pointerdown", onPointerDownCapture, true);
		window.addEventListener("click", onClickCapture, true);
		resetTimer();

		return () => {
			for (const e of events) window.removeEventListener(e, resetTimer);
			window.removeEventListener("pointerdown", onPointerDownCapture, true);
			window.removeEventListener("click", onClickCapture, true);
			if (timerRef.current) clearTimeout(timerRef.current);
			if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
		};
	}, []);

	return (
		<SleepyFadeoutContext.Provider value={{ isFadedOut }}>
			{children}
		</SleepyFadeoutContext.Provider>
	);
}

export function useSleepyFadeout() {
	const context = useContext(SleepyFadeoutContext);
	if (!context) {
		throw new Error(
			"useSleepyFadeout must be used within a SleepyFadeoutProvider",
		);
	}
	return context;
}
