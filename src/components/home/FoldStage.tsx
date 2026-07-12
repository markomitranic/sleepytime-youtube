"use client";

import { usePathname } from "next/navigation";
import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { AuroraBackground } from "~/app/AuroraBackground";
import { HomeContent } from "~/components/home/HomeContent";
import { Player } from "~/components/playlist/Player";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { cn } from "~/lib/utils";

type Stage = "home" | "folding" | "player";

/** Total fold duration — three beats: unlatch, deck rise, wind-down. */
const FOLD_MS = 1750;
/** Deck travel: fast launch, decisive settle, no bounce. */
const RISE_EASE = "cubic-bezier(0.19, 1, 0.22, 1)";
/** Page wind-down: slow engage, sustained travel, hard seat. */
const WIND_EASE = "cubic-bezier(0.65, 0, 0.15, 1)";
/** The initial unlatch pop. */
const POP_EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
/** Matches the screen glass's rounded-sm corners. */
const SCREEN_RADIUS_PX = 4;

/**
 * The homepage-to-player fold. `/` runs a three-stage machine:
 *
 *   home    — the homepage as a fullscreen scrollable sheet
 *   folding — a strictly mechanical keyframe sequence, no fades:
 *             1. the page unlatches (small pop inward)
 *             2. the whole player scene slides up from the bottom OVER the
 *                page; its screen glass is transparent mid-fold, so the page
 *                stays visible through the bezel
 *             3. seen through the glass, the page winds down until it fits
 *                exactly inside it (FLIP against the measured glass rect)
 *   player  — only after the sequence lands does the screen go live: the
 *             sheet unmounts and the glass shows the embed / menu channel
 *
 * The URL flips to /player via history.pushState at fold start — Next syncs
 * usePathname without remounting, and Back returns to `/`, which unfolds.
 * Reduced-motion users get an instant swap.
 * @example <FoldStage /> // the whole homepage
 */
export function FoldStage() {
	const [stage, setStage] = useState<Stage>("home");
	const sheetRef = useRef<HTMLDivElement>(null);
	const layerRef = useRef<HTMLElement>(null);
	const backdropRef = useRef<HTMLDivElement>(null);
	const playlist = usePlaylist();
	const pathname = usePathname();

	// Mirror for the stable fold callback — pushState must run in the event
	// handler, never inside a state updater (Router updates mid-render throw)
	const stageRef = useRef<Stage>(stage);
	stageRef.current = stage;

	const fold = useCallback(() => {
		if (stageRef.current !== "home") return;
		window.history.pushState(null, "", "/player");
		const reduceMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		setStage(reduceMotion ? "player" : "folding");
	}, []);

	// Back button or the deck's HOME lamp lands on "/" — unfold to the sheet
	useEffect(() => {
		if (pathname === "/") setStage("home");
	}, [pathname]);

	// The fold itself: measure the screen glass, then run the keyframe
	// sequence before first paint so the deck never flashes at its final spot
	useLayoutEffect(() => {
		if (stage !== "folding") return;
		const sheet = sheetRef.current;
		const layer = layerRef.current;
		const backdrop = backdropRef.current;
		const screen = layer?.querySelector<HTMLElement>("[data-player-screen]");
		if (!sheet || !layer || !backdrop || !screen) {
			setStage("player");
			return;
		}

		const rect = screen.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		// Punch a hole in the machine's backdrop where the glass sits (an
		// SVG evenodd mask — a child's transparency can't pierce a parent's
		// paint). The hole rides up with the rising layer, so the page below
		// stays visible through the bezel for the whole fold.
		const holePath = `M0 0H${vw}V${vh}H0Z M${rect.left} ${rect.top}h${rect.width}v${rect.height}h${-rect.width}Z`;
		const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${vw}" height="${vh}"><path fill-rule="evenodd" fill="#fff" d="${holePath}"/></svg>`;
		const mask = `url('data:image/svg+xml;utf8,${encodeURIComponent(maskSvg)}')`;
		backdrop.style.maskImage = mask;
		backdrop.style.maskSize = `${vw}px ${vh}px`;

		// Fit-width landing: the page's left/right borders converge exactly
		// onto the glass edges; the overflow below the glass is swallowed by
		// the closing bottom clip (the page sinks into the screen slot)
		const scale = rect.width / vw;
		const tx = rect.left + rect.width / 2 - vw / 2;
		const ty = rect.top;
		const clipBottom = Math.max(0, vh - rect.height / scale);
		const radius = SCREEN_RADIUS_PX / scale;

		const unlatched = `translate(0px, ${vh * 0.03}px) scale(0.94)`;
		const seated = `translate(${tx}px, ${ty}px) scale(${scale})`;
		const openClip = "inset(0px 0px 0px 0px round 0px)";
		const seatedClip = `inset(0px 0px ${clipBottom}px 0px round ${radius}px)`;

		// If the page was scrolled, rewind it during the early beats so the
		// top of the page is what lands on the glass
		sheet.scrollTo({ top: 0, behavior: "smooth" });

		// Beat 2: the deck slides in from below the viewport (fill backwards
		// keeps it parked offscreen through its stagger delay)
		const rise = layer.animate(
			[{ transform: "translateY(100%)" }, { transform: "translateY(0px)" }],
			{
				duration: 740,
				delay: 60,
				easing: RISE_EASE,
				fill: "backwards",
			},
		);

		// Beats 1 + 3: unlatch pop (0–10%), hold while the deck climbs
		// (10–23%), then wind the borders down onto the glass (23–100%).
		// No opacity anywhere — the final frame IS the seated page, and the
		// swap to the live screen is a hard cut when this finishes.
		const shrink = sheet.animate(
			[
				{
					transform: "translate(0px, 0px) scale(1)",
					clipPath: openClip,
					easing: POP_EASE,
				},
				{
					transform: unlatched,
					clipPath: openClip,
					offset: 0.1,
					easing: "linear",
				},
				{
					transform: unlatched,
					clipPath: openClip,
					offset: 0.23,
					easing: WIND_EASE,
				},
				{ transform: seated, clipPath: seatedClip },
			],
			{ duration: FOLD_MS, easing: "linear", fill: "forwards" },
		);
		shrink.onfinish = () => setStage("player");
		return () => {
			rise.cancel();
			shrink.cancel();
			// Landing seals the hole: the glass is opaque-live from here on
			backdrop.style.maskImage = "";
			backdrop.style.maskSize = "";
		};
	}, [stage]);

	const selectAndFold = useCallback(
		(playlistId: string) => {
			void playlist.loadByPlaylistId(playlistId);
			fold();
		},
		[playlist.loadByPlaylistId, fold],
	);

	return (
		<>
			{stage !== "home" && (
				// Same sizing contract as /player's page: iPad Pro landscape cap.
				// Sits ABOVE the sheet: the machine slides in over the page, which
				// stays visible only through the transparent screen glass. Carries
				// its own opaque scene (bg + aurora) so it truly covers the page.
				<main
					ref={layerRef}
					className="fixed inset-0 z-30 flex lg:items-center justify-center pt-[env(safe-area-inset-top)] overflow-hidden"
				>
					{/* The machine's own scene: opaque aurora backdrop that covers the
					    page as the layer rises — masked with a hole at the glass */}
					<div
						ref={backdropRef}
						className="aurora-background absolute inset-0"
						aria-hidden
					/>
					<div className="h-full max-h-[1024px] w-full max-w-[1366px]">
						{/* The embed stays dark until the fold seats — the screen goes
						    live only after the whole keyframe sequence is done */}
						<Player screenLive={stage === "player"} />
					</div>
				</main>
			)}
			{stage !== "player" && (
				<div
					ref={sheetRef}
					className={cn(
						// Opaque bg is load-bearing: the page must read as a solid
						// panel while the deck is behind it, never bleed through
						"fixed inset-0 z-20 overflow-y-auto overscroll-contain bg-background will-change-transform",
						stage === "folding" && "pointer-events-none overflow-y-hidden",
					)}
					style={{ transformOrigin: "50% 0" }}
				>
					{/* The sheet carries its own aurora: the transform makes the sheet
					    its containing block, so the whole scene shrinks into the glass */}
					<AuroraBackground />
					<HomeContent
						variant="page"
						onSelectPlaylist={selectAndFold}
						onGoToPlayer={fold}
					/>
				</div>
			)}
		</>
	);
}
