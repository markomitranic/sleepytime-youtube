"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "~/components/ui/drawer";
import { useAuth } from "~/components/auth/AuthContext";
import { fetchUserPlaylists } from "~/lib/youtube";
import { LogOut, User, X } from "lucide-react";

type AccountDrawerProps = {
  children: React.ReactNode;
};

export function AccountDrawer({ children }: AccountDrawerProps) {
  const auth = useAuth();
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
    enabled: Boolean(auth.isAuthenticated && auth.accessToken && isOpen),
    staleTime: 1000 * 60,
  });

  const playlistCount = userPlaylists?.length ?? 0;

  return (
    <Drawer direction="bottom" open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        {children}
      </DrawerTrigger>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Account</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-6 space-y-6">
          {/* Hero section with curved background */}
          <div className="relative -mx-4 -mt-4 mb-6">
            <div className="h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-t-lg"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/80 via-purple-500/80 to-pink-500/80 rounded-t-lg"></div>
            
            {/* Avatar and user info */}
            <div className="relative -mt-16 px-6 pb-6">
              <div className="flex flex-col items-center text-center space-y-4">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full border-4 border-background shadow-lg overflow-hidden bg-background">
                  {auth.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={auth.user.image} 
                      alt={auth.user.name || "User avatar"} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                {/* User details */}
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {auth.user?.name || "User"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {auth.user?.email || "No email"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Account stats */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <p className="text-sm font-medium">Playlists</p>
                <p className="text-xs text-muted-foreground">Your YouTube playlists</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{playlistCount}</p>
                <p className="text-xs text-muted-foreground">
                  {playlistCount === 1 ? "playlist" : "playlists"}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
              <div className="space-y-1">
                <p className="text-sm font-medium">Privacy</p>
                <p className="text-xs text-muted-foreground">Your data stays private</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium">Secure</span>
                </div>
                <p className="text-xs text-muted-foreground">Client-side only</p>
              </div>
            </div>
          </div>

          {/* Sign out button */}
          <button 
            onClick={() => auth.signOut()}
            className="w-full text-red-500 hover:text-red-600 transition-colors py-3 text-base font-medium"
          >
            <LogOut className="h-4 w-4 mr-2 inline" />
            Sign Out
          </button>

          {/* Close button */}
          <DrawerClose asChild>
            <Button 
              variant="outline"
              size="lg"
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DrawerClose>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
