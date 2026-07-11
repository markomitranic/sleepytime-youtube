/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	env: {
		// One marker per deploy; /api/version serves the live one so a long-open
		// client can notice a new deployment and refresh itself
		NEXT_PUBLIC_BUILD_ID: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
	},
	images: {
		minimumCacheTTL: 31536000,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "i.ytimg.com",
			},
			{
				protocol: "https",
				hostname: "*.googleusercontent.com",
			},
		],
	},
};

export default config;
