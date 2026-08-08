"use client";

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";

const IDLE_TIMEOUT_MS = 5000;

const SleepyFadeoutContext = createContext<{
	isFadedOut: boolean;
	setHold: (held: boolean) => void;
} | null>(null);

export function SleepyFadeoutProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isFadedOut, setIsFadedOut] = useState(false);
	const [holdCount, setHoldCount] = useState(0);
	const isFadedOutRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// True between a wake-tap's pointerdown and its click: that click is eaten so
	// the first touch only lights the UI (TV-remote-backlight), never activates
	// whatever was under the finger.
	const suppressRef = useRef(false);
	const suppressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const setHold = useCallback((held: boolean) => {
		setHoldCount((count) => Math.max(0, count + (held ? 1 : -1)));
	}, []);

	const isHeld = holdCount > 0;

	useEffect(() => {
		const setFaded = (value: boolean) => {
			isFadedOutRef.current = value;
			setIsFadedOut(value);
		};

		const resetTimer = () => {
			setFaded(false);
			if (timerRef.current) clearTimeout(timerRef.current);
			if (isHeld) return;
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
	}, [isHeld]);

	return (
		<SleepyFadeoutContext.Provider value={{ isFadedOut, setHold }}>
			{children}
		</SleepyFadeoutContext.Provider>
	);
}

/**
 * Holds the UI awake for as long as `active` is true.
 *
 * Panels and trays are places to look at, not to watch the video through — the
 * idle fade would dim exactly what the user just opened. Holds are counted, so
 * overlapping callers each release their own.
 * @example useKeepAwake(openPanel !== null); // no fade while any tray is out
 */
export function useKeepAwake(active: boolean) {
	const { setHold } = useSleepyFadeout();

	useEffect(() => {
		if (!active) return;
		setHold(true);
		return () => setHold(false);
	}, [active, setHold]);
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
