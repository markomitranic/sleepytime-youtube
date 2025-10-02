import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "~/styles/globals.css";
import { AppProviders } from "./providers";
import { DevToolbar } from "~/components/DevToolbar";
import { AuroraBackground } from "./AuroraBackground";
import { Toaster } from "sonner";
import { BottomNav } from "~/components/BottomNav";

export const metadata: Metadata = {
  title: "Sleepytime-YouTube",
  description: "Play YouTube playlists one by one",
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


