import type { Metadata, Viewport } from "next";
import { Geist, Lora } from "next/font/google";
import "~/styles/globals.css";
import { Toaster } from "sonner";
import { BottomNav } from "~/components/BottomNav";
import { CookieBanner } from "~/components/CookieBanner";
import { PlayerProvider } from "~/components/playlist/PlayerContext";
import { StickyPlayerBar } from "~/components/playlist/StickyPlayerBar";
import { ServiceWorkerKillSwitch } from "~/components/ServiceWorkerKillSwitch";
import { SleepyFadeoutProvider } from "~/components/SleepyFadeoutContext";
import { AuroraBackground } from "./AuroraBackground";
import { AppProviders } from "./providers";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: "cover",
	minimumScale: 1,
	themeColor: "#252525",
};

export const metadata: Metadata = {
	title: "SleepyTime",
	description:
		"Fall asleep to YouTube playlists — with a sleep timer, no ads, and a screen that dims with you.",
	applicationName: "SleepyTime",
	manifest: "/manifest.json",
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "SleepyTime",
		startupImage: [
			{
				url: "/icon-512.png",
				media: "(device-width: 768px) and (device-height: 1024px)",
			},
		],
	},
	formatDetection: {
		telephone: false,
	},
	other: {
		"apple-mobile-web-app-capable": "yes",
		"apple-mobile-web-app-status-bar-style": "black-translucent",
		"apple-mobile-web-app-title": "SleepyTime",
		"mobile-web-app-capable": "yes",
		"msapplication-TileColor": "#252525",
		"msapplication-tap-highlight": "no",
	},
};

const geist = Geist({ subsets: ["latin"] });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="dark" suppressHydrationWarning>
			<head>
				<link rel="apple-touch-icon" href="/icon-180.png" />
				<link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
				<link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
				<link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
				<link rel="apple-touch-startup-image" href="/icon-512.png" />
			</head>
			<body className={`${geist.className} ${lora.variable}`}>
				<AppProviders>
					<PlayerProvider>
						<SleepyFadeoutProvider>
							<AuroraBackground />
							{children}
							<StickyPlayerBar />
							<BottomNav />
							<Toaster richColors position="bottom-center" closeButton />
							<CookieBanner />
							<ServiceWorkerKillSwitch />
						</SleepyFadeoutProvider>
					</PlayerProvider>
				</AppProviders>
			</body>
		</html>
	);
}
