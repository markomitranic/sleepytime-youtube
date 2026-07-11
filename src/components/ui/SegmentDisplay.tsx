import { cn } from "~/lib/utils";

/* Seven-segment digit geometry: 58x100 units, 11-unit stroke, skewed -6deg
 * like real display glass. Each digit renders a ghost "8" underneath the lit
 * segments — the tell that this is a display, not a font. Colors come from
 * the --phosphor* tokens so day/night themes switch for free. */
const SEG_MAP: Record<string, string> = {
	"0": "ABCDEF",
	"1": "BC",
	"2": "ABDEG",
	"3": "ABCDG",
	"4": "BCFG",
	"5": "ACDFG",
	"6": "ACDEFG",
	"7": "ABC",
	"8": "ABCDEFG",
	"9": "ABCDFG",
	"-": "G",
};

const W = 58;
const H = 100;
const T = 11;

function hSeg(x: number, y: number, w: number): string {
	const t = T;
	const g = 1;
	return `${x + g},${y} ${x + g + t / 2},${y - t / 2} ${x + w - g - t / 2},${y - t / 2} ${x + w - g},${y} ${x + w - g - t / 2},${y + t / 2} ${x + g + t / 2},${y + t / 2}`;
}

function vSeg(x: number, y: number, l: number): string {
	const t = T;
	const g = 1;
	return `${x},${y + g} ${x + t / 2},${y + g + t / 2} ${x + t / 2},${y + l - g - t / 2} ${x},${y + l - g} ${x - t / 2},${y + l - g - t / 2} ${x - t / 2},${y + g + t / 2}`;
}

const SEGS: Record<string, string> = {
	A: hSeg(0, T / 2, W),
	G: hSeg(0, H / 2, W),
	D: hSeg(0, H - T / 2, W),
	F: vSeg(T / 2, T / 2, H / 2),
	B: vSeg(W - T / 2, T / 2, H / 2),
	E: vSeg(T / 2, H / 2, H / 2),
	C: vSeg(W - T / 2, H / 2, H / 2),
};

const ALL_SEGS = "ABCDEFG".split("");

/**
 * Formats seconds as a display clock string.
 * @example formatClock(83); // "1:23"
 * @example formatClock(3690); // "1:01:30"
 */
function formatClock(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	const mm = String(m).padStart(2, "0");
	const ss = String(sec).padStart(2, "0");
	return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

function Digit({ ch, height }: { ch: string; height: number }) {
	const lit = SEG_MAP[ch] ?? "";
	return (
		<svg
			viewBox="-12 0 70 100"
			width={height * 0.7}
			height={height}
			aria-hidden="true"
		>
			<g transform="skewX(-6)">
				<g>
					{ALL_SEGS.map((s) => (
						<polygon key={s} points={SEGS[s]} fill="var(--phosphor-ghost)" />
					))}
				</g>
				<g style={{ filter: "drop-shadow(0 0 3px var(--phosphor-glow))" }}>
					{lit.split("").map((s) => (
						<polygon key={s} points={SEGS[s]} fill="var(--phosphor)" />
					))}
				</g>
			</g>
		</svg>
	);
}

function Colon({ height }: { height: number }) {
	return (
		<svg
			viewBox="-8 0 32 100"
			width={height * 0.32}
			height={height}
			aria-hidden="true"
		>
			<g
				transform="skewX(-6)"
				style={{ filter: "drop-shadow(0 0 3px var(--phosphor-glow))" }}
			>
				<rect
					x="6"
					y="30"
					width="11"
					height="11"
					rx="1.5"
					fill="var(--phosphor)"
				/>
				<rect
					x="6"
					y="64"
					width="11"
					height="11"
					rx="1.5"
					fill="var(--phosphor)"
				/>
			</g>
		</svg>
	);
}

/**
 * True seven-segment clock readout with ghost 88:88 behind the live digits.
 *
 * Renders `seconds` as m:ss (or h:mm:ss past the hour), prefixed with a minus
 * segment when `negative` — the classic "remaining time" readout.
 * @example <SevenSegmentTime seconds={playerTime} />
 * @example <SevenSegmentTime seconds={remaining} negative height={20} />
 */
export function SevenSegmentTime({
	seconds,
	negative = false,
	height = 20,
	className,
}: {
	seconds: number;
	negative?: boolean;
	height?: number;
	className?: string;
}) {
	const str = (negative ? "-" : "") + formatClock(seconds);
	return (
		<span role="img" aria-label={str} className={cn("flex gap-0.5", className)}>
			{[...str].map((ch, i) =>
				ch === ":" ? (
					// biome-ignore lint/suspicious/noArrayIndexKey: static positional glyphs
					<Colon key={i} height={height} />
				) : (
					// biome-ignore lint/suspicious/noArrayIndexKey: static positional glyphs
					<Digit key={i} ch={ch} height={height} />
				),
			)}
		</span>
	);
}

/**
 * Still segment progress bar: a row of phosphor cells, lit up to `progress`.
 *
 * Unlit cells stay visible as ghost segments so the bar reads as hardware.
 * @example <SegmentBar progress={0.4} />
 */
export function SegmentBar({
	progress,
	cells = 30,
	className,
}: {
	/** 0..1 playback progress */
	progress: number;
	cells?: number;
	className?: string;
}) {
	const lit = Math.round(Math.min(1, Math.max(0, progress)) * cells);
	return (
		<span aria-hidden className={cn("flex h-[9px] gap-[3px]", className)}>
			{Array.from({ length: cells }, (_, i) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: static positional cells
					key={i}
					className="flex-1 rounded-[1px]"
					style={
						i < lit
							? {
									background: "var(--phosphor)",
									boxShadow: "0 0 4px var(--phosphor-glow)",
									opacity: 0.92,
								}
							: { background: "var(--phosphor-ghost)" }
					}
				/>
			))}
		</span>
	);
}
