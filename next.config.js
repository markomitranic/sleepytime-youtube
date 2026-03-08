/** @type {import("next").NextConfig} */
const config = {
	reactStrictMode: true,
	images: {
		minimumCacheTTL: 31536000,
		remotePatterns: [
			{
				protocol: "https",
				hostname: "i.ytimg.com",
			},
		],
	},
};

export default config;
