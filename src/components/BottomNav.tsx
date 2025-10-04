"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FolderKanban, Play } from "lucide-react";
import { useAuth } from "~/components/auth/useAuth";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { cn } from "~/lib/utils";

export function BottomNav() {
  const { isAuthenticated } = useAuth();
  const playlist = usePlaylist();
  const hasPlaylist = Boolean(playlist.playlistId);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-screen-md mx-auto px-4">
        <NavItem href="/" icon={Home} label="Home" />
        <NavItem href="/player" icon={Play} label="Player" disabled={!isAuthenticated || !hasPlaylist} isPlayerButton />
        <NavItem href="/organize" icon={FolderKanban} label="Organize" disabled={!isAuthenticated} />
      </div>
    </nav>
  );
}

type NavItemProps = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isPlayerButton?: boolean;
  disabled?: boolean;
};

function NavItem({ href, icon: Icon, label, isPlayerButton = false, disabled = false }: NavItemProps) {
  const pathname = usePathname();
  
  // Player button is "active" when it's enabled and we're on the /player page
  // Other buttons match based on pathname
  const isActive = pathname === href;

  // If disabled, render as a non-interactive button
  if (disabled) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg min-w-[72px]",
          "text-muted-foreground/40 cursor-not-allowed opacity-50"
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[72px]",
        isActive
          ? "text-white bg-gray-600"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}

