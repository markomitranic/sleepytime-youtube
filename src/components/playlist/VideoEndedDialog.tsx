"use client";

import { Moon } from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef } from "react";
import type { YTPlayer } from "~/components/playlist/PlayerContext";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";
import { Button } from "~/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

export function VideoEndedDialog({
	open,
	onOpenChange,
	canEdit,
	onRemoveAndPlayNext,
	onPlayNext,
	onDismiss,
	playerInstanceRef,
	currentVideoId,
	sleepTimerIsActive,
	onShowDialog,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	canEdit: boolean;
	onRemoveAndPlayNext: () => void;
	onPlayNext: () => void;
	onDismiss: () => void;
	playerInstanceRef: RefObject<YTPlayer | null>;
	currentVideoId: string | undefined;
	sleepTimerIsActive: boolean;
	onShowDialog: (videoId: string) => void;
}) {
	const { isFadedOut } = useSleepyFadeout();
	const dialogShownForVideoRef = useRef<string | undefined>(undefined);
	const timeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

	// Show dialog 20s before video end (skip when sleep timer active)
	useEffect(() => {
		dialogShownForVideoRef.current = undefined;
		if (!playerInstanceRef.current || !currentVideoId) return;
		if (timeCheckIntervalRef.current)
			clearInterval(timeCheckIntervalRef.current);

		timeCheckIntervalRef.current = setInterval(() => {
			try {
				if (!playerInstanceRef.current?.getCurrentTime) return;
				const t = playerInstanceRef.current.getCurrentTime();
				const d = playerInstanceRef.current.getDuration();
				if (d > 0 && t > 0 && !sleepTimerIsActive) {
					const remaining = d - t;
					if (
						remaining <= 20 &&
						remaining > 0 &&
						dialogShownForVideoRef.current !== currentVideoId
					) {
						dialogShownForVideoRef.current = currentVideoId;
						onShowDialog(currentVideoId);
					}
				}
			} catch {}
		}, 1000);

		return () => {
			if (timeCheckIntervalRef.current)
				clearInterval(timeCheckIntervalRef.current);
		};
	}, [currentVideoId, sleepTimerIsActive, playerInstanceRef, onShowDialog]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="p-0 overflow-hidden transition-opacity">
				<div
					className={cn(
						"p-6 flex flex-col items-center text-center gap-4 transition-colors duration-1000",
						isFadedOut && "bg-black",
					)}
				>
					<div className="size-16 rounded-full bg-blue-500/10 flex items-center justify-center">
						<Moon className="size-8 text-blue-400" />
					</div>
					<DialogHeader
						className={cn(
							"p-0 transition-colors duration-1000",
							isFadedOut && "text-gray-500",
						)}
					>
						<DialogTitle>Sleepy yet?</DialogTitle>
						<DialogDescription
							className={cn(
								"transition-colors duration-1000",
								isFadedOut && "text-gray-700",
							)}
						>
							This is a good place to stop watching. Your phone will go to sleep
							unless you explicitly decide to continue.
						</DialogDescription>
					</DialogHeader>
				</div>
				<DialogFooter
					className={cn(
						"gap-8 p-4 flex-col transition-colors duration-1000",
						isFadedOut && "bg-black",
					)}
				>
					<Button
						className={cn(
							"border block w-full transition-colors duration-1000",
							isFadedOut && "bg-gray-900 text-gray-400  border-gray-500",
						)}
						onClick={() => {
							if (canEdit) {
								onPlayNext();
							} else {
								onRemoveAndPlayNext();
							}
						}}
					>
						{canEdit ? "Remove & Play Next" : "Play Next"}
					</Button>
					<Button
						className={"w-full block text-gray-500"}
						variant="ghost"
						onClick={onDismiss}
					>
						Dismiss
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
