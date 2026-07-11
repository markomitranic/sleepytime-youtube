import { redirect } from "next/navigation";

/** The library now lives in the player's cassette tray; keep old links working. */
export default function PlaylistsPage() {
	redirect("/player");
}
