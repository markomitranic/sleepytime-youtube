"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "~/lib/utils";

/** Knob rests this many px inside the track walls */
const TRACK_PAD = 5;
/** Dragging past this fraction of full travel counts as an unlock */
const UNLOCK_AT = 0.92;

/**
 * The child lock: a case clamped shut over the deck, deaf everywhere.
 *
 * Two parts. An invisible full-viewport blanket swallows every click and
 * drag — video included — and a capture-phase window listener eats keyboard
 * events (deck spacebar included), so the app registers nothing while the
 * video plays on. The visible part is a clamshell over the deck only: two
 * molded black-plastic lips slide over the hardware and meet at its
 * waistline — the box closing over the machine, not the screen. The one
 * live control is the slide-to-unlock riding the seam, a straight lift of
 * the first iPhone's: recessed track, glossy metal knob, shimmering gray
 * legend that fades as you drag. Must be mounted inside the deck's
 * relative container (it sizes itself to it), and stays mounted while
 * closed so the lips can animate back out.
 * @example <LockScreen open={locked} onUnlock={() => setLocked(false)} />
 */
export function LockScreen({
	open,
	onUnlock,
}: {
	open: boolean;
	onUnlock: () => void;
}) {
	const rootRef = useRef<HTMLDivElement>(null);
	const trackRef = useRef<HTMLDivElement>(null);
	const knobRef = useRef<HTMLButtonElement>(null);
	// Full travel is measured lazily (when a drag starts), so 1 keeps the
	// progress math safe before the first interaction
	const maxRef = useRef(1);
	const grabRef = useRef(0);
	const [dragX, setDragX] = useState(0);
	const [dragging, setDragging] = useState(false);

	const measureTravel = () => {
		const track = trackRef.current;
		const knob = knobRef.current;
		if (!track || !knob) return 1;
		return Math.max(1, track.clientWidth - knob.offsetWidth - TRACK_PAD * 2);
	};

	// Fresh lock (or unlock) resets the knob; focus lands on the only live
	// control so keyboard users aren't stranded
	useEffect(() => {
		setDragX(0);
		setDragging(false);
		if (open) knobRef.current?.focus({ preventScroll: true });
	}, [open]);

	// Locked means deaf: eat keyboard events at the capture phase before any
	// app handler (deck spacebar etc.) runs. Keys aimed at the clamshell
	// itself pass (the knob's arrow keys), as do browser combos like reload.
	useEffect(() => {
		if (!open) return;
		const swallow = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey) return;
			const target = e.target as Node | null;
			if (target && rootRef.current?.contains(target)) return;
			e.preventDefault();
			e.stopPropagation();
		};
		window.addEventListener("keydown", swallow, true);
		window.addEventListener("keyup", swallow, true);
		return () => {
			window.removeEventListener("keydown", swallow, true);
			window.removeEventListener("keyup", swallow, true);
		};
	}, [open]);

	const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
		maxRef.current = measureTravel();
		grabRef.current = e.clientX - dragX;
		setDragging(true);
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
		if (!dragging) return;
		setDragX(
			Math.min(Math.max(0, e.clientX - grabRef.current), maxRef.current),
		);
	};

	const handlePointerEnd = () => {
		if (!dragging) return;
		setDragging(false);
		if (dragX >= maxRef.current * UNLOCK_AT) onUnlock();
		else setDragX(0);
	};

	const handleKnobKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
		e.preventDefault();
		maxRef.current = measureTravel();
		const step = maxRef.current / 4;
		if (e.key === "ArrowLeft") {
			setDragX((x) => Math.max(0, x - step));
			return;
		}
		const next = Math.min(dragX + step, maxRef.current);
		if (next >= maxRef.current) onUnlock();
		else setDragX(next);
	};

	const progress = dragX / maxRef.current;
	const lipClass =
		"lock-lip absolute inset-x-0 transition-transform duration-700 ease-[cubic-bezier(0.7,0,0.3,1)]";

	return (
		<>
			{/* The blanket: invisible, viewport-wide, eats every click and drag
			    aimed at the video or anything else while the box is shut */}
			<div
				aria-hidden
				className={cn(
					"fixed inset-0 z-[90] [touch-action:none]",
					!open && "hidden",
				)}
			/>

			{/* The clamshell: sized to the deck by its relative parent; above
			    the blanket so the slider stays live */}
			<div
				ref={rootRef}
				aria-hidden={!open}
				className="pointer-events-none absolute inset-0 z-[110] select-none overflow-hidden"
			>
				{/* Bottom lip first in the DOM so the top lip clamps down over it */}
				<div
					className={cn(
						lipClass,
						"lock-lip-bottom bottom-0 h-1/2",
						open ? "pointer-events-auto" : "translate-y-[115%]",
					)}
				/>
				<div
					className={cn(
						lipClass,
						"lock-lip-top top-0 h-[calc(50%+1px)]",
						open ? "pointer-events-auto" : "-translate-y-[115%]",
					)}
				/>

				{/* Slide to unlock, mounted on the seam; shows once the box has shut */}
				<div
					className={cn(
						"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-300",
						open ? "pointer-events-auto opacity-100 delay-500" : "opacity-0",
					)}
				>
					<div
						ref={trackRef}
						className="lock-slide-track relative h-14 w-[min(78vw,300px)]"
					>
						<span
							className="lock-slide-text pointer-events-none absolute inset-0 grid place-items-center pl-9 text-[19px]"
							style={{ opacity: Math.max(0, 1 - progress * 1.8) }}
						>
							slide to unlock
						</span>
						<button
							ref={knobRef}
							type="button"
							role="slider"
							aria-label="Slide to unlock"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={Math.round(progress * 100)}
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerEnd}
							onPointerCancel={handlePointerEnd}
							onKeyDown={handleKnobKeyDown}
							onBlur={() => !dragging && setDragX(0)}
							className="lock-slide-knob absolute inset-y-[5px] left-[5px] grid w-16 cursor-grab place-items-center [touch-action:none] active:cursor-grabbing"
							style={{
								transform: `translateX(${dragX}px)`,
								transition: dragging
									? "none"
									: "transform 300ms cubic-bezier(0.2, 0.8, 0.3, 1)",
							}}
						>
							<ChevronRight
								className="h-6 w-6 text-[#8b8f96]"
								strokeWidth={2.75}
								aria-hidden
							/>
						</button>
					</div>
				</div>
			</div>
		</>
	);
}
