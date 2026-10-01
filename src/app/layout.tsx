import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Suspense, type ReactNode } from "react"

import { CategorySidebar } from "@/components/category-top-nav"
import { HeaderFallback } from "@/components/header-fallback"
import { SiteHeader } from "@/components/site-header"
import { MobileLegalLinks } from "@/components/mobile-legal-links"
import { LanguageSync, PrefsProvider } from "@/components/prefs-provider"
import { TermsReacceptDialog } from "@/components/terms-reaccept-dialog"
import { ThemeSync } from "@/components/theme-choices"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/lib/auth"
import { MarketplaceProvider } from "@/lib/marketplace"
import { languageBootScript } from "@/lib/prefs"
import { site, siteTitleTemplate } from "@/lib/site"
import { themeBootScript } from "@/lib/theme"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background pb-[calc(env(safe-area-inset-bottom)+6rem)] font-sans text-foreground md:pb-0">
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: languageBootScript }} />
        <ThemeSync />
        <PrefsProvider>
          <LanguageSync />
          <AuthProvider>
            <MarketplaceProvider>
              <SidebarProvider defaultOpen className="min-h-svh flex-1 flex-col">
                <Suspense fallback={<HeaderFallback />}>
                  <SiteHeader />
                </Suspense>
                <div className="flex min-h-0 flex-1">
                  <CategorySidebar />
                  <SidebarInset className="min-w-0 flex-1">{children}</SidebarInset>
                </div>
                <MobileLegalLinks />
              </SidebarProvider>
              <TermsReacceptDialog />
              <Toaster />
            </MarketplaceProvider>
          </AuthProvider>
        </PrefsProvider>
      </body>
    </html>
  )
}
