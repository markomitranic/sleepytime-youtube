"use client";

import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "~/components/auth/AuthContext";
import { NeomorphicIconButton } from "~/components/ui/NeomorphicIconButton";
import { useRateVideo, useVideoRating } from "~/lib/queries";
import { cn } from "~/lib/utils";

/**
 * Round like/unlike toggle for the currently playing video.
 *
 * Self-contained: reads auth state internally and renders nothing when
 * signed out or when there's no video to rate. Toggles optimistically via
 * useRateVideo and toasts on failure.
 * @example <LikeButton videoId={currentItem?.videoId ?? null} />
 */
export function LikeButton({ videoId }: { videoId: string | null }) {
	const auth = useAuth();
	const { data: rating } = useVideoRating(videoId);
	const rateVideoMutation = useRateVideo();

	if (!auth.isAuthenticated || !videoId) return null;

	const isLiked = rating === "like";

	const handleClick = async () => {
		try {
			await rateVideoMutation.mutateAsync({
				videoId,
				rating: isLiked ? "none" : "like",
			});
		} catch (e) {
			toast.error((e as Error)?.message ?? "Failed to update rating.");
		}
	};

	return (
		<NeomorphicIconButton
			isActive={isLiked}
			onClick={handleClick}
			ariaPressed={isLiked}
			ariaLabel={isLiked ? "Unlike video" : "Like video"}
		>
			<ThumbsUp className={cn("h-5 w-5", isLiked && "fill-current")} />
		</NeomorphicIconButton>
	);
}
