"use client";

import { useEffect, useState } from "react";
import { useAuth } from "~/components/auth/AuthContext";
import { useRouter } from "next/navigation";
import { fetchSubscriptionVideos, type YouTubeSubscriptionVideo } from "~/lib/youtube";
import { Button } from "~/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import { Loader2 } from "lucide-react";

export default function SubscriptionsPage() {
  const { isAuthenticated, accessToken, signIn, getTokenSilently } = useAuth();
  const router = useRouter();
  const [videos, setVideos] = useState<YouTubeSubscriptionVideo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial videos
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    async function loadVideos() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchSubscriptionVideos({
          accessToken: accessToken!,
          maxResults: 20,
          refreshToken: getTokenSilently,
        });
        setVideos(result.items);
        setNextPageToken(result.nextPageToken);
      } catch (err: any) {
        const message = err.message || "Failed to load subscription videos";
        setError(message);
        
        // If authentication failed, prompt user to sign in again
        if (err.status === 401 || err.needsReauth) {
          toast.error("Your session expired. Please sign in again.", {
            action: {
              label: "Sign In",
              onClick: () => signIn(),
            },
          });
        } else {
          toast.error(message);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadVideos();
  }, [isAuthenticated, accessToken, getTokenSilently]);

  async function handleLoadMore() {
    if (!accessToken || !nextPageToken || isLoadingMore) return;

    setIsLoadingMore(true);
    setError(null);
    try {
      const result = await fetchSubscriptionVideos({
        accessToken,
        pageToken: nextPageToken,
        maxResults: 20,
        refreshToken: getTokenSilently,
      });
      setVideos((prev) => [...prev, ...result.items]);
      setNextPageToken(result.nextPageToken);
    } catch (err: any) {
      const message = err.message || "Failed to load more videos";
      setError(message);
      
      // If authentication failed, prompt user to sign in again
      if (err.status === 401 || err.needsReauth) {
        toast.error("Your session expired. Please sign in again.", {
          action: {
            label: "Sign In",
            onClick: () => signIn(),
          },
        });
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleVideoClick(videoId: string) {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, "_blank");
  }

  // Show sign-in prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center px-[10px] py-6 pb-24">
        <div className="w-full max-w-[720px] space-y-6 text-center">
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <p className="text-lg text-muted-foreground">
            Sign in to view recent videos from your subscriptions
          </p>
          <Button onClick={signIn} className="px-8 py-6 text-lg">
            Sign In with Google
          </Button>
        </div>
      </main>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-start justify-center px-[10px] py-6 pb-24">
        <div className="w-full max-w-[1200px] space-y-6">
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </main>
    );
  }

  // Error state with no videos
  if (error && videos.length === 0) {
    return (
      <main className="flex min-h-screen items-start justify-center px-[10px] py-6 pb-24">
        <div className="w-full max-w-[1200px] space-y-6">
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // Empty state
  if (videos.length === 0) {
    return (
      <main className="flex min-h-screen items-start justify-center px-[10px] py-6 pb-24">
        <div className="w-full max-w-[1200px] space-y-6">
          <h1 className="text-3xl font-bold">Subscriptions</h1>
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              No recent videos from your subscriptions
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Main content
  return (
    <main className="flex min-h-screen items-start justify-center px-[10px] py-6 pb-24">
      <div className="w-full max-w-[1200px] space-y-6">
        <h1 className="text-3xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">
          Recent videos from channels you subscribe to
        </p>

        {/* Video Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video.videoId}
              video={video}
              onClick={() => handleVideoClick(video.videoId)}
            />
          ))}
        </div>

        {/* Load More Button */}
        {nextPageToken && (
          <div className="flex justify-center pt-4">
            <Button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="px-8 py-6 text-lg"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}

        {/* End of content message */}
        {!nextPageToken && videos.length > 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              You've reached the end of your subscription feed
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

type VideoCardProps = {
  video: YouTubeSubscriptionVideo;
  onClick: () => void;
};

function VideoCard({ video, onClick }: VideoCardProps) {
  const relativeTime = getRelativeTime(video.publishedAt);

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer space-y-2 rounded-lg overflow-hidden transition-transform hover:scale-105"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
        {video.thumbnailUrl ? (
          <Image
            src={video.thumbnailUrl}
            alt={video.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-muted-foreground text-sm">No thumbnail</span>
          </div>
        )}
      </div>

      {/* Video Info */}
      <div className="space-y-1">
        <h3 className="font-semibold text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        {video.channelTitle && (
          <p className="text-xs text-muted-foreground">{video.channelTitle}</p>
        )}
        <p className="text-xs text-muted-foreground">{relativeTime}</p>
      </div>
    </div>
  );
}

function getRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears > 0) {
    return `${diffYears} year${diffYears > 1 ? "s" : ""} ago`;
  }
  if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? "s" : ""} ago`;
  }
  if (diffWeeks > 0) {
    return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  }
  if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
  }
  return "Just now";
}

