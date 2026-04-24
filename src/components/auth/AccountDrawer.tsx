"use client";

import { ListMusic, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "~/components/auth/AuthContext";
import { Button } from "~/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "~/components/ui/drawer";
import { useUserPlaylists } from "~/lib/queries";

type AccountDrawerProps = {
	children: React.ReactNode;
};

export function AccountDrawer({ children }: AccountDrawerProps) {
	const auth = useAuth();
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);

	const { data: userPlaylists } = useUserPlaylists();

	const playlistCount = userPlaylists?.length ?? 0;

	return (
		<Drawer direction="bottom" open={isOpen} onOpenChange={setIsOpen}>
			<DrawerTrigger asChild>{children}</DrawerTrigger>
			<DrawerContent>
				<div className="mx-auto w-full max-w-sm">
					<DrawerHeader>
						<DrawerTitle>Account</DrawerTitle>
					</DrawerHeader>

					<div className="flex flex-col items-center gap-4 px-4 pb-6">
						<div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-muted">
							{auth.user?.image ? (
								// biome-ignore lint/performance/noImgElement: external Google avatar URL
								<img
									src={auth.user.image}
									alt={auth.user.name || "User avatar"}
									className="h-full w-full object-cover"
								/>
							) : (
								<div className="flex h-full w-full items-center justify-center">
									<User className="h-6 w-6 text-muted-foreground" />
								</div>
							)}
						</div>

						<div className="text-center">
							<p className="text-base font-medium">
								{auth.user?.name || "User"}
							</p>
							<p className="text-sm text-muted-foreground">
								{auth.user?.email || "No email"}
							</p>
						</div>

						{playlistCount > 0 ? (
							<Button
								variant="ghost"
								size="sm"
								className="h-8 text-sm text-muted-foreground hover:text-foreground"
								onClick={() => {
									setIsOpen(false);
									router.push("/playlists/manage");
								}}
							>
								<ListMusic className="h-4 w-4" />
								{playlistCount} {playlistCount === 1 ? "playlist" : "playlists"}
							</Button>
						) : (
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<ListMusic className="h-4 w-4" />
								<span>
									{playlistCount}{" "}
									{playlistCount === 1 ? "playlist" : "playlists"}
								</span>
							</div>
						)}

						<div className="mt-2 flex w-full flex-col gap-2">
							<Button
								variant="outline"
								className="w-full"
								onClick={() => auth.signOut()}
							>
								<LogOut className="mr-2 h-4 w-4" />
								Sign out
							</Button>
						</div>
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
