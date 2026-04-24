"use client";

import { useEffect, useRef, useState } from "react";

type MoveRibbonProps = {
	isActive: boolean;
	getButtonEl: () => HTMLButtonElement | null;
	getPanelEl: () => HTMLDivElement | null;
};

type Rect = {
	buttonRight: number;
	buttonTop: number;
	buttonBottom: number;
	panelLeft: number;
	panelTop: number;
	panelBottom: number;
};

export function MoveRibbon({
	isActive,
	getButtonEl,
	getPanelEl,
}: MoveRibbonProps) {
	const [rect, setRect] = useState<Rect | null>(null);
	const rafRef = useRef<number | null>(null);

	useEffect(() => {
		if (!isActive) {
			setRect(null);
			return;
		}

		const measure = () => {
			const btn = getButtonEl();
			const panel = getPanelEl();
			if (!btn || !panel) {
				setRect(null);
				return;
			}
			const b = btn.getBoundingClientRect();
			const p = panel.getBoundingClientRect();
			// Panel container animates width 0 → 320 via a wrapper, but the
			// inner panelEl always reports w-80. Check that it's visible on screen.
			if (p.right <= p.left || p.right < 4) {
				setRect(null);
				return;
			}
			setRect({
				buttonRight: b.right,
				buttonTop: b.top + 4,
				buttonBottom: b.bottom - 4,
				panelLeft: p.left,
				panelTop: p.top,
				panelBottom: p.bottom,
			});
		};

		const loop = () => {
			measure();
			rafRef.current = requestAnimationFrame(loop);
		};
		rafRef.current = requestAnimationFrame(loop);

		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
		};
	}, [isActive, getButtonEl, getPanelEl]);

	if (!rect) return null;

	const {
		buttonRight,
		buttonTop,
		buttonBottom,
		panelLeft,
		panelTop,
		panelBottom,
	} = rect;

	// Don't draw if panel hasn't slid past the button yet
	if (panelLeft <= buttonRight) return null;

	const midX = (buttonRight + panelLeft) / 2;
	const curve = Math.min(24, (panelLeft - buttonRight) / 2);
	const startX = buttonRight + curve;

	const path = [
		`M ${startX} ${buttonTop}`,
		`C ${midX} ${buttonTop}, ${midX} ${panelTop}, ${panelLeft} ${panelTop}`,
		`L ${panelLeft} ${panelBottom}`,
		`C ${midX} ${panelBottom}, ${midX} ${buttonBottom}, ${startX} ${buttonBottom}`,
		`Z`,
	].join(" ");

	return (
		<svg
			className="fixed inset-0 pointer-events-none z-40"
			width="100%"
			height="100%"
			aria-hidden="true"
		>
			<title>Move connector</title>
			<defs>
				<linearGradient id="ribbon-grad" x1="0" y1="0" x2="1" y2="0">
					<stop offset="0%" stopColor="white" stopOpacity="0.04" />
					<stop offset="100%" stopColor="white" stopOpacity="0.12" />
				</linearGradient>
			</defs>
			<path
				d={path}
				fill="url(#ribbon-grad)"
				stroke="white"
				strokeOpacity="0.18"
				strokeWidth="1"
			/>
		</svg>
	);
}
