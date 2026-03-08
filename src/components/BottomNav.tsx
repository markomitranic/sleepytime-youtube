"use client";

import { Home, Play, User, UserCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { AccountDrawer } from "~/components/auth/AccountDrawer";
import { useAuth } from "~/components/auth/AuthContext";
import { Spinner } from "~/components/ui/spinner";
import { cn } from "~/lib/utils";

export function BottomNav() {
	const pathname = usePathname();
	const { isAuthenticated, user } = useAuth();
	const [isRedirecting, setIsRedirecting] = useState(false);

	return (
		<nav className="fixed inset-x-0 bottom-[0px] z-50 bg-linear-to-b from-black/80 to-black">
			<div className="flex items-center justify-center gap-8 h-16 max-w-3xl mx-auto px-2">
				<Link
					href="/"
					className={cn(
						"flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 min-w-18 text-muted-foreground hover:text-foreground hover:bg-secondary/50",
						pathname === "/" && "text-white bg-secondary",
					)}
				>
					<Home className="h-5 w-5" />
					<span className="text-xs font-medium">Home</span>
				</Link>
				<Link
					href="/player"
					className={cn(
						"flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 min-w-18 text-muted-foreground hover:text-foreground hover:bg-secondary/50",
						pathname === "/player" && "text-white bg-secondary",
					)}
				>
					<Play className="h-5 w-5" />
					<span className="text-xs font-medium">Player</span>
				</Link>
				{isAuthenticated ? (
					<AccountDrawer>
						<button
							type="button"
							className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-18 text-muted-foreground hover:text-foreground hover:bg-accent"
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
						className="flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-18 text-muted-foreground hover:text-foreground hover:bg-accent"
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
