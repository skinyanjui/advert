import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Suspense } from "react"

import { CategorySidebar } from "@/components/category-top-nav"
import { HeaderFallback, SiteHeader } from "@/components/site-header"
import { ThemeSync } from "@/components/theme-choices"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/lib/auth"
import { MarketplaceProvider } from "@/lib/marketplace"
import { site, siteTitleTemplate } from "@/lib/site"
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
  metadataBase: new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "adverts-murex.vercel.app"}`),
  title: {
    default: site.name,
    template: siteTitleTemplate(),
  },
  description: site.tagline,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background pb-[calc(env(safe-area-inset-bottom)+6rem)] font-sans text-foreground md:pb-0">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <ThemeSync />
        <MarketplaceProvider>
          <AuthProvider>
            <SidebarProvider defaultOpen className="min-h-svh flex-1 flex-col">
              <Suspense fallback={<HeaderFallback />}>
                <SiteHeader />
              </Suspense>
              <div className="flex min-h-0 w-full flex-1">
                <CategorySidebar />
                <SidebarInset className="min-w-0">
                  <div className="flex-1">{children}</div>
                </SidebarInset>
              </div>
              <Toaster />
            </SidebarProvider>
          </AuthProvider>
        </MarketplaceProvider>
      </body>
    </html>
  )
}
