"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { DeckTray } from "~/components/playlist/DeckTray";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { Button } from "~/components/ui/button";

/**
 * The sleep bay: timer controls inside the same DeckTray door as the
 * playlists and account bays. Pick minutes with the +/- keys, arm or stop
 * the timer; confirming shuts the door.
 * @example <SleepTray open={open} onOpenChange={setOpen} />
 */
export function SleepTray({
	open,
	onOpenChange,
	className,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	className?: string;
}) {
	const playlist = usePlaylist();
	const [tempMinutes, setTempMinutes] = useState(
		playlist.sleepTimer.durationMinutes,
	);

	// Opening the door re-reads the armed duration
	useEffect(() => {
		if (open) setTempMinutes(playlist.sleepTimer.durationMinutes);
	}, [open, playlist.sleepTimer.durationMinutes]);

	const handleAdjust = (adjustment: number) => {
		setTempMinutes((prev) => Math.max(5, Math.min(180, prev + adjustment)));
	};

	const handleConfirm = () => {
		playlist.setSleepTimer(tempMinutes);
		onOpenChange(false);
	};

	const handleDeactivate = () => {
		playlist.deactivateSleepTimer();
		onOpenChange(false);
	};

	return (
		<DeckTray
			open={open}
			onOpenChange={onOpenChange}
			label="Sleep Timer"
			className={className}
		>
			<div className="px-3 pb-2">
				<div className="flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="icon"
						className="h-8 w-8 shrink-0 rounded-full"
						onClick={() => handleAdjust(-5)}
						disabled={tempMinutes <= 5}
					>
						<Minus />
						<span className="sr-only">Decrease</span>
					</Button>
					<div className="flex-1 text-center">
						<div className="text-6xl font-bold tracking-tighter text-[#d8cbb4]">
							{tempMinutes}
						</div>
						<div className="text-[0.70rem] uppercase text-[#8a7961]">
							minutes
						</div>
					</div>
					<Button
						variant="outline"
						size="icon"
						className="h-8 w-8 shrink-0 rounded-full"
						onClick={() => handleAdjust(5)}
						disabled={tempMinutes >= 180}
					>
						<Plus />
						<span className="sr-only">Increase</span>
					</Button>
				</div>
				<div className="mt-4 text-center">
					<p className="text-sm text-[#8a7961]">
						Timer will stop playback after {tempMinutes} minute
						{tempMinutes !== 1 ? "s" : ""}
					</p>
					{playlist.sleepTimer.isActive && (
						<p className="mt-1 text-xs text-(--phosphor)">
							Current timer:{" "}
							{Math.ceil((playlist.sleepTimer.remainingSeconds || 0) / 60)}{" "}
							minutes remaining
						</p>
					)}
				</div>
				<div className="mt-4 flex flex-col gap-2">
					<Button onClick={handleConfirm}>
						{playlist.sleepTimer.isActive ? "Update Timer" : "Start Timer"}
					</Button>
					{playlist.sleepTimer.isActive && (
						<Button variant="outline" onClick={handleDeactivate}>
							Stop Timer
						</Button>
					)}
				</div>
			</div>
		</DeckTray>
	);
}
