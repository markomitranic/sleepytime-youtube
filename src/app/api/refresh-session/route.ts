import { auth } from "../../../../auth";

/**
 * Forces session refresh by reading the session server-side.
 * Returns the fresh access token or error if refresh failed.
 */
export async function GET() {
	const session = await auth();

	if (!session?.user) {
		return Response.json({ error: "Not authenticated" }, { status: 401 });
	}

	return Response.json({
		accessToken: (session as unknown as { accessToken?: string }).accessToken,
		error: (session as unknown as { error?: string }).error || null,
	});
}
