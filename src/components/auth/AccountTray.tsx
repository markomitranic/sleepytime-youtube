"use client";

import { ListMusic, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "~/components/auth/AuthContext";
import { DeckTray } from "~/components/playlist/DeckTray";
import { useUserPlaylists } from "~/lib/queries";

/**
 * The account bay: the signed-in user's card inside the same DeckTray door
 * as the playlists — avatar, name, playlist count, sign out.
 * @example <AccountTray open={open} onOpenChange={setOpen} />
 */
export function AccountTray({
	open,
	onOpenChange,
	className,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	className?: string;
}) {
	const auth = useAuth();
	const router = useRouter();
	const { data: userPlaylists } = useUserPlaylists();
	const playlistCount = userPlaylists?.length ?? 0;

	return (
		<DeckTray
			open={open}
			onOpenChange={onOpenChange}
			label="Account"
			className={className}
		>
			<div className="flex items-center gap-3 px-3 pt-1 pb-3">
				<div className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-black/60 bg-black/40">
					{auth.user?.image ? (
						// biome-ignore lint/performance/noImgElement: external Google avatar URL
						<img
							src={auth.user.image}
							alt={auth.user.name || "User avatar"}
							className="h-full w-full object-cover"
						/>
					) : (
						<div className="flex h-full w-full items-center justify-center">
							<User className="h-5 w-5 text-muted-foreground" />
						</div>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-medium text-[#d8cbb4] md:text-base">
						{auth.user?.name || "User"}
					</p>
					<p className="truncate text-xs text-[#8a7961] md:text-sm">
						{auth.user?.email || "No email"}
					</p>
				</div>
			</div>

			<div className="space-y-1">
				{playlistCount > 0 && (
					<TrayAction
						icon={<ListMusic />}
						label={`${playlistCount} ${playlistCount === 1 ? "playlist" : "playlists"}`}
						onClick={() => {
							onOpenChange(false);
							router.push("/playlists/manage");
						}}
					/>
				)}
				<TrayAction
					icon={<LogOut />}
					label="Sign out"
					onClick={() => auth.signOut()}
				/>
			</div>
		</DeckTray>
	);
}

/** One action row in the bay, styled like the playlist rows. */
function TrayAction({
	icon,
	label,
	onClick,
}: {
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-full items-center gap-3 rounded-[3px] px-3 py-2 text-left transition-colors hover:bg-white/[0.04]"
		>
			<span className="text-[#8a7961] [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
			<span className="text-sm font-medium text-[#d8cbb4] md:text-base">
				{label}
			</span>
		</button>
	);
}
