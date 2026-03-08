"use client";

import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";

export function AuroraBackground() {
	const { isFadedOut } = useSleepyFadeout();

	if (isFadedOut) return null;
	return <div className="aurora-background" aria-hidden="true" />;
}
