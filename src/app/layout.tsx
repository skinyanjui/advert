import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"

import { HeaderFallback, SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ThemeSync } from "@/components/theme-choices"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/lib/auth"
import { MarketplaceProvider } from "@/lib/marketplace"
import { themeBootScript } from "@/lib/theme"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "africa classifieds",
    template: "%s · africa classifieds",
  },
  description:
    "Buy and sell across Africa. Cars, houses, jobs, electronics, and everything in between.",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background font-sans text-foreground">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <ThemeSync />
        <MarketplaceProvider>
          <AuthProvider>
            <Suspense fallback={<HeaderFallback />}>
              <SiteHeader />
            </Suspense>
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <Toaster />
          </AuthProvider>
        </MarketplaceProvider>
      </body>
    </html>
  )
}
