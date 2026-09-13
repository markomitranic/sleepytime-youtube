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

/**
 * Owns idle fading and the first-interaction wake boundary for the app.
 * @example <SleepyFadeoutProvider>{children}</SleepyFadeoutProvider>
 */
export function SleepyFadeoutProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [isFadedOut, setIsFadedOut] = useState(false);
	const [holdCount, setHoldCount] = useState(0);
	const isFadedOutRef = useRef(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const setHold = useCallback((held: boolean) => {
		setHoldCount((count) => Math.max(0, count + (held ? 1 : -1)));
	}, []);

	const isHeld = holdCount > 0;
	const wake = useCallback(() => {
		isFadedOutRef.current = false;
		setIsFadedOut(false);
		if (timerRef.current) clearTimeout(timerRef.current);
		if (isHeld) return;
		timerRef.current = setTimeout(() => {
			isFadedOutRef.current = true;
			setIsFadedOut(true);
		}, IDLE_TIMEOUT_MS);
	}, [isHeld]);

	useEffect(() => {
		const registerActivity = () => {
			if (isFadedOutRef.current) return;
			wake();
		};

		const onKeyDownCapture = (event: KeyboardEvent) => {
			if (!isFadedOutRef.current) {
				wake();
				return;
			}

			event.preventDefault();
			event.stopImmediatePropagation();
			wake();
		};

		const events = ["pointerdown", "pointermove", "scroll", "wheel"];
		for (const event of events)
			window.addEventListener(event, registerActivity);
		window.addEventListener("keydown", onKeyDownCapture, true);
		wake();

		return () => {
			for (const event of events)
				window.removeEventListener(event, registerActivity);
			window.removeEventListener("keydown", onKeyDownCapture, true);
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [wake]);

	return (
		<SleepyFadeoutContext.Provider value={{ isFadedOut, setHold }}>
			{children}
			{isFadedOut && <WakeCurtain onWake={wake} />}
		</SleepyFadeoutContext.Provider>
	);
}

/**
 * Swallows the first pointer activation while waking the faded interface.
 * @example <WakeCurtain onWake={wake} />
 */
function WakeCurtain({ onWake }: { onWake: () => void }) {
	return (
		<button
			type="button"
			tabIndex={-1}
			aria-label="Wake controls"
			onClick={onWake}
			className="fixed inset-0 z-[100] cursor-default border-0 bg-transparent p-0"
		/>
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

/**
 * Reads the current idle-fade state and hold controls.
 * @example const { isFadedOut } = useSleepyFadeout();
 */
export function useSleepyFadeout() {
	const context = useContext(SleepyFadeoutContext);
	if (!context) {
		throw new Error(
			"useSleepyFadeout must be used within a SleepyFadeoutProvider",
		);
	}
	return context;
}
