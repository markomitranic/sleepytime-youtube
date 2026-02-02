import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "~/styles/globals.css";
import { AppProviders } from "./providers";
import { PlayerProvider } from "~/components/playlist/PlayerContext";
import { AuroraBackground } from "./AuroraBackground";
import { Toaster } from "sonner";
import { BottomNav } from "~/components/BottomNav";
import { CookieBanner } from "~/components/CookieBanner";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  minimumScale: 1,
};

export const metadata: Metadata = {
  title: "SleepyTime",
  description: "Play YouTube playlists one by one",
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
  themeColor: "#252525",
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="SleepyTime" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#252525" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={geist.className}>
        <AppProviders>
          <PlayerProvider>
            <AuroraBackground />
            {children}
            <BottomNav />
            <Toaster richColors position="bottom-center" closeButton />
            <CookieBanner />
          </PlayerProvider>
        </AppProviders>
      </body>
    </html>
  );
}
