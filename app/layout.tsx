import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import NextTopLoader from "nextjs-toploader";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReactiGIF - AI-Powered Reaction GIF Generator",
  description: "Generate perfect reaction GIFs with 3 unique perspectives (emotional, literal, sarcastic) using AI. Find the ideal GIF for any situation.",
  icons: [{ rel: "icon", url: "/ReactiGIF.svg" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${spaceGrotesk.variable} font-sans antialiased`}>
        <Providers>
          <NextTopLoader
            color="oklch(0.68 0.14 195)"
            height={3}
            zIndex={1600}
            easing="ease"
            initialPosition={0.4}
            crawlSpeed={500}
            crawl={true}
            showSpinner={false}
            speed={500}
          />
          <SidebarProvider defaultOpen={true}>
            <AppSidebar />
            <SidebarInset>
              <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 px-4">
                <SidebarTrigger />
              </header>
              <main className="flex flex-1 flex-col">
                {children}
              </main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
