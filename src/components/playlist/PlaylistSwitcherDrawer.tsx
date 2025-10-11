"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { fetchUserPlaylists } from "~/lib/youtube";
import { useBuiltinPlaylists } from "~/lib/queries";
import { Lock, Globe, Link as LinkIcon, ChevronDown, Play } from "lucide-react";

type PlaylistSwitcherDrawerProps = {
  children: React.ReactNode;
};

export function PlaylistSwitcherDrawer({ children }: PlaylistSwitcherDrawerProps) {
  const auth = useAuth();
  const router = useRouter();
  const playlist = usePlaylist();
  const [isOpen, setIsOpen] = useState(false);

  const { data: userPlaylists } = useQuery({
    queryKey: ["userPlaylists", auth.accessToken],
    queryFn: async () => {
      if (!auth.isAuthenticated || !auth.accessToken) return [];
      try {
        return await fetchUserPlaylists({ accessToken: auth.accessToken, refreshToken: auth.getTokenSilently });
      } catch {
        return [];
      }
    },
    enabled: Boolean(auth.isAuthenticated && auth.accessToken),
    staleTime: 1000 * 60,
  });

  const { data: builtinPlaylists } = useBuiltinPlaylists(true);

  const handlePlaylistSelect = async (playlistId: string) => {
    console.log('Playlist selected:', playlistId);
    setIsOpen(false); // Close the drawer
    
    try {
      // Use the playlist context to load the new playlist
      await playlist.loadByPlaylistId(playlistId);
      console.log('Playlist loaded successfully');
    } catch (error) {
      console.error('Failed to load playlist:', error);
      // Fallback to URL navigation if context loading fails
      router.push(`/player?list=${playlistId}`);
    }
  };

  const getVisibilityBadge = (privacyStatus?: string) => {
    switch (privacyStatus) {
      case "private":
        return (
          <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-5 text-xs">
            <Lock className="h-3 w-3" />
            Private
          </Badge>
        );
      case "public":
        return (
          <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-5 text-xs">
            <Globe className="h-3 w-3" />
            Public
          </Badge>
        );
      case "unlisted":
        return (
          <Badge variant="secondary" className="gap-1 px-2 py-0.5 h-5 text-xs">
            <LinkIcon className="h-3 w-3" />
            Unlisted
          </Badge>
        );
      default:
        return null;
    }
  };

  const isCurrentPlaylist = (playlistId: string) => {
    return playlist.playlistId === playlistId;
  };

  return (
    <Drawer direction="top" open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh] w-full lg:w-1/3 lg:ml-auto lg:mr-0 lg:rounded-l-lg lg:rounded-r-none">
        <DrawerHeader>
          <DrawerTitle>Switch Playlist</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-4 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* User Playlists */}
          {auth.isAuthenticated && userPlaylists && userPlaylists.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Your Playlists
              </h3>
              <div className="space-y-2">
                {userPlaylists.map((playlistItem) => (
                  <button
                    key={playlistItem.id}
                    onClick={() => handlePlaylistSelect(playlistItem.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      isCurrentPlaylist(playlistItem.id) 
                        ? "bg-accent border-accent-foreground/20" 
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0">
                      {playlistItem.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={playlistItem.thumbnailUrl} 
                          alt="thumbnail" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{playlistItem.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {playlistItem.itemCount} videos
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        {getVisibilityBadge(playlistItem.privacyStatus)}
                        {isCurrentPlaylist(playlistItem.id) && (
                          <Badge variant="outline" className="gap-1 px-2 py-0.5 h-5 text-xs bg-green-700/20 border border-green-600 text-green-300">
                            <Play className="h-3 w-3" />
                            Playing now
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Separator */}
          {auth.isAuthenticated && userPlaylists && userPlaylists.length > 0 && builtinPlaylists && builtinPlaylists.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border"></div>
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Try These
                </h3>
                <div className="flex-1 h-px bg-border"></div>
              </div>
            </div>
          )}

          {/* Built-in Playlists */}
          {builtinPlaylists && builtinPlaylists.length > 0 && (
            <div className="space-y-3">
              {(!auth.isAuthenticated || !userPlaylists || userPlaylists.length === 0) && (
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Try These
                </h3>
              )}
              <div className="space-y-2">
                {builtinPlaylists.map((playlistItem) => (
                  <button
                    key={playlistItem.id}
                    onClick={() => handlePlaylistSelect(playlistItem.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      isCurrentPlaylist(playlistItem.id) 
                        ? "bg-accent border-accent-foreground/20" 
                        : "hover:bg-accent"
                    }`}
                  >
                    <div className="w-12 h-8 rounded overflow-hidden flex-shrink-0">
                      {playlistItem.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                          src={playlistItem.thumbnailUrl} 
                          alt="thumbnail" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{playlistItem.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {playlistItem.itemCount} videos
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        {isCurrentPlaylist(playlistItem.id) ? (
                          <Badge variant="outline" className="gap-1 px-2 py-0.5 h-5 text-xs bg-green-700/20 border border-green-600 text-green-300">
                            <Play className="h-3 w-3" />
                            Playing now
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 px-2 py-0.5 h-5 text-xs bg-green-700/20 border border-green-600 text-green-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Try it
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {(!userPlaylists || userPlaylists.length === 0) && (!builtinPlaylists || builtinPlaylists.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No playlists available</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
