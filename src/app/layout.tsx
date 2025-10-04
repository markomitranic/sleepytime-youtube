import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "~/styles/globals.css";
import { AppProviders } from "./providers";
import { DevToolbar } from "~/components/DevToolbar";
import { AuroraBackground } from "./AuroraBackground";
import { Toaster } from "sonner";
import { BottomNav } from "~/components/BottomNav";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Sleepytime-YouTube",
  description: "Play YouTube playlists one by one",
  applicationName: "Sleepytime-YouTube",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Sleepytime-YouTube",
  },
  formatDetection: {
    telephone: false,
  },
  themeColor: "#252525",
};

const geist = Geist({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={geist.className}>
        <AppProviders>
          <AuroraBackground />
          {children}
          <BottomNav />
          <DevToolbar />
          <Toaster richColors position="bottom-center" closeButton />
        </AppProviders>
      </body>
    </html>
  );
}


