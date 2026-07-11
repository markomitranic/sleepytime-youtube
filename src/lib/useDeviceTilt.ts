"use client";

import { useEffect } from "react";

/**
 * Feeds device tilt into `--tilt-x` / `--tilt-y` on the root element (both
 * normalized to -1..1), so metal surfaces can shift their sheen and shadows
 * like real hardware catching the light.
 *
 * The glint follows *changes* in tilt: a slow-adapting baseline recenters
 * after ~2s, so it works the same whether the iPad lies flat or sits propped
 * up. iOS needs a motion permission gesture — asked once on the first tap,
 * then remembered per site. No-op on desktops (no accelerometer) and under
 * prefers-reduced-motion. Multiple mounts share one sensor subscription.
 * @example useDeviceTilt(); // then: box-shadow: calc(var(--tilt-x, 0) * -5px) ...
 */
export function useDeviceTilt() {
	useEffect(() => {
		users++;
		if (users === 1) teardown = startTilt();
		return () => {
			users--;
			if (users === 0) {
				teardown?.();
				teardown = null;
			}
		};
	}, []);
}

let users = 0;
let teardown: (() => void) | null = null;

/** Degrees of tilt change that push the glint to its full deflection. */
const FULL_TILT_DEG = 18;
/** Baseline adaptation per event (~60Hz): recenters over roughly 2 seconds. */
const BASELINE_ALPHA = 0.01;

function startTilt(): (() => void) | null {
	if (typeof window === "undefined") return null;
	if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
		return null;
	const DOE = window.DeviceOrientationEvent as
		| (typeof DeviceOrientationEvent & {
				requestPermission?: () => Promise<"granted" | "denied">;
		  })
		| undefined;
	if (!DOE) return null;

	const root = document.documentElement;
	let raf = 0;
	let baseX: number | null = null;
	let baseY = 0;
	let targetX = 0;
	let targetY = 0;
	let curX = 0;
	let curY = 0;

	const tick = () => {
		curX += (targetX - curX) * 0.15;
		curY += (targetY - curY) * 0.15;
		root.style.setProperty("--tilt-x", curX.toFixed(3));
		root.style.setProperty("--tilt-y", curY.toFixed(3));
		const settled =
			Math.abs(targetX - curX) < 0.002 && Math.abs(targetY - curY) < 0.002;
		raf = settled ? 0 : requestAnimationFrame(tick);
	};

	const onOrientation = (e: DeviceOrientationEvent) => {
		if (e.beta == null || e.gamma == null) return;
		// Sensor axes are device-frame; rotate them into screen-frame
		const angle = screen.orientation?.angle ?? 0;
		let x = e.gamma;
		let y = e.beta;
		if (angle === 90) {
			x = e.beta;
			y = -e.gamma;
		} else if (angle === 180) {
			x = -e.gamma;
			y = -e.beta;
		} else if (angle === 270) {
			x = -e.beta;
			y = e.gamma;
		}
		if (baseX === null) {
			baseX = x;
			baseY = y;
		}
		baseX += (x - baseX) * BASELINE_ALPHA;
		baseY += (y - baseY) * BASELINE_ALPHA;
		targetX = clamp((x - baseX) / FULL_TILT_DEG);
		targetY = clamp((y - baseY) / FULL_TILT_DEG);
		if (!raf) raf = requestAnimationFrame(tick);
	};

	const subscribe = () =>
		window.addEventListener("deviceorientation", onOrientation);

	let disarmTap: (() => void) | null = null;
	if (typeof DOE.requestPermission === "function") {
		// iOS: permission needs a user gesture; Safari remembers the grant,
		// so the dialog appears once ever, then this resolves silently
		const onFirstTap = () => {
			DOE.requestPermission?.()
				.then((state) => {
					if (state === "granted") subscribe();
				})
				.catch(() => {});
		};
		window.addEventListener("pointerdown", onFirstTap, { once: true });
		disarmTap = () => window.removeEventListener("pointerdown", onFirstTap);
	} else {
		subscribe();
	}

	return () => {
		disarmTap?.();
		window.removeEventListener("deviceorientation", onOrientation);
		cancelAnimationFrame(raf);
		root.style.removeProperty("--tilt-x");
		root.style.removeProperty("--tilt-y");
	};
}

/** clamp(2.5); // 1 */
function clamp(n: number) {
	return Math.min(1, Math.max(-1, n));
}
