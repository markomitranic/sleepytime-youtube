"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Play, UserCircle, User } from "lucide-react";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlayer } from "~/components/playlist/PlayerContext";
import { AccountDrawer } from "~/components/auth/AccountDrawer";
import { cn } from "~/lib/utils";

function AccountNavItem() {
  const { isAuthenticated, user, signIn } = useAuth();
  const pathname = usePathname();

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => signIn()}
        className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[72px] text-muted-foreground hover:text-foreground hover:bg-accent"
      >
        <UserCircle className="h-5 w-5" />
        <span className="text-xs font-medium">Sign In</span>
      </button>
    );
  }

  return (
    <AccountDrawer>
      <button className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[72px] text-muted-foreground hover:text-foreground hover:bg-accent">
        {user?.image ? (
          <div className="w-5 h-5 rounded-full overflow-hidden border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={user.image}
              alt={user.name || "User avatar"}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <User className="h-5 w-5" />
        )}
        <span className="text-xs font-medium">Account</span>
      </button>
    </AccountDrawer>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const isPlayerPage = pathname === "/player";
  const player = usePlayer();

  const isInactive = isPlayerPage && player.isInactive;

  return (
    <nav
      className={`fixed bottom-4 left-4 right-4 z-50 glass-panel-elevated rounded-2xl transition-opacity duration-500 ${isInactive ? "opacity-30" : ""}`}
    >
      <div className="flex items-center justify-center gap-8 h-16 max-w-screen-md mx-auto px-4">
        <NavItem href="/" icon={Home} label="Home" />
        <NavItem href="/player" icon={Play} label="Player" />
        <AccountNavItem />
      </div>
    </nav>
  );
}

type NavItemProps = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

function NavItem({ href, icon: Icon, label }: NavItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 min-w-[72px]",
        isActive
          ? "text-white bg-secondary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
      )}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs font-medium">{label}</span>
    </Link>
  );
}
