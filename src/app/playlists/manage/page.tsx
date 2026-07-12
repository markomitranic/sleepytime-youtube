import { redirect } from "next/navigation";

/** Playlist management moved into the deck's trays; keep old links working. */
export default function PlaylistsManagePage() {
	redirect("/player");
}
