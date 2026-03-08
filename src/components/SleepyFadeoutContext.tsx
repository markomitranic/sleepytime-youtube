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
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const resetTimer = () => {
			setIsFadedOut(false);
			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => setIsFadedOut(true), IDLE_TIMEOUT_MS);
		};

		const events = ["pointerdown", "pointermove", "keydown", "scroll"];
		for (const e of events) window.addEventListener(e, resetTimer);
		resetTimer();

		return () => {
			for (const e of events) window.removeEventListener(e, resetTimer);
			if (timerRef.current) clearTimeout(timerRef.current);
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
