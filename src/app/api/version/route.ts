export const dynamic = "force-dynamic";

/**
 * Returns the build marker of the live deployment.
 * Long-open clients poll this and hard-refresh when it changes.
 * @example GET /api/version // { "version": "e4f1c2a..." }
 */
export function GET() {
	return Response.json({ version: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" });
}
