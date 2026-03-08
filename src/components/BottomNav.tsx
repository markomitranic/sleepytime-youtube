"use client";

import { Home, Library, Play, User, UserCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { AccountDrawer } from "~/components/auth/AccountDrawer";
import { useAuth } from "~/components/auth/AuthContext";
import { usePlaylist } from "~/components/playlist/PlaylistContext";
import { useSleepyFadeout } from "~/components/SleepyFadeoutContext";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";

const navItemClass =
	"flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 min-w-18";

export function BottomNav() {
	const pathname = usePathname();
	const { isAuthenticated, user } = useAuth();
	const playlist = usePlaylist();
	const [isRedirecting, setIsRedirecting] = useState(false);
	const { isFadedOut } = useSleepyFadeout();

	const hasPlaylist = Boolean(playlist.playlistId && playlist.items.length > 0);

	return (
		<nav
			className={cn(
				"fixed inset-x-0 bottom-[0px] z-50 bg-linear-to-b from-black/80 to-black transition-opacity duration-1000",
				isFadedOut && "opacity-0",
			)}
		>
			<div className="flex items-center justify-center gap-8 h-16 max-w-3xl mx-auto px-2 pb-[env(safe-area-inset-bottom)]">
				<Link
					href="/"
					className={cn(
						navItemClass,
						"text-muted-foreground hover:text-foreground hover:bg-secondary/50",
						pathname === "/" && "text-white bg-secondary",
					)}
				>
					<Home className="h-5 w-5" />
					<span className="text-xs font-medium">Home</span>
				</Link>

				{hasPlaylist ? (
					<Link
						href="/player"
						className={cn(
							navItemClass,
							"text-muted-foreground hover:text-foreground hover:bg-secondary/50",
							pathname === "/player" && "text-white bg-secondary",
						)}
					>
						<Play className="h-5 w-5" />
						<span className="text-xs font-medium">Player</span>
					</Link>
				) : (
					<span
						className={cn(
							navItemClass,
							"text-muted-foreground/40 cursor-not-allowed",
						)}
					>
						<Play className="h-5 w-5" />
						<span className="text-xs font-medium">Player</span>
					</span>
				)}

				<Link
					href="/playlists"
					className={cn(
						navItemClass,
						"text-muted-foreground hover:text-foreground hover:bg-secondary/50",
						pathname === "/playlists" && "text-white bg-secondary",
					)}
				>
					<Library className="h-5 w-5" />
					<span className="text-xs font-medium">Playlists</span>
				</Link>

				{isAuthenticated ? (
					<AccountDrawer>
						<button
							type="button"
							className={cn(
								navItemClass,
								"text-muted-foreground hover:text-foreground hover:bg-accent",
							)}
						>
							{user?.image ? (
								<div className="w-5 h-5 rounded-full overflow-hidden border border-border">
									<Image
										src={user.image}
										alt={user.name || "User avatar"}
										className="w-full h-full object-cover"
										width={24}
										height={24}
									/>
								</div>
							) : (
								<User className="h-5 w-5" />
							)}
							<span className="text-xs font-medium">Account</span>
						</button>
					</AccountDrawer>
				) : (
					<button
						type="button"
						onClick={() => {
							setIsRedirecting(true);
							signIn("google");
						}}
						className={cn(
							navItemClass,
							"text-muted-foreground hover:text-foreground hover:bg-accent",
						)}
					>
						{isRedirecting ? (
							<Spinner className="h-5 w-5" />
						) : (
							<UserCircle className="h-5 w-5" />
						)}
						<span className="text-xs font-medium">Sign In</span>
					</button>
				)}
			</div>
		</nav>
	);
}
