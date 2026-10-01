import Link from "next/link"

import { Logo } from "@/components/logo"
import { PostLink } from "@/components/post-link"
import { buttonVariants } from "@/components/ui/button"
import { navItem } from "@/lib/nav"
import { cn } from "@/lib/utils"

export function HeaderFallback() {
  const home = navItem("home")
  const post = navItem("post")
  const profile = navItem("profile")
  const HomeIcon = home.icon
  const ProfileIcon = profile.icon

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="grid min-h-14 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 md:h-16 md:grid-cols-[15.5rem_minmax(0,1fr)_auto] md:gap-0 md:px-0 md:py-0">
        <div className="shrink-0 md:flex md:h-16 md:items-center md:px-4">
          <Logo iconOnly className="xl:hidden" />
          <Logo className="hidden xl:flex" />
        </div>
        <div className="min-w-0 md:px-4">
          <div className="h-9 rounded-lg bg-muted/50 md:h-8" />
        </div>
        <Link
          href={profile.href}
          aria-label={profile.label}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-9 rounded-full md:hidden")}
        >
          <ProfileIcon />
          <span className="sr-only">{profile.label}</span>
        </Link>
        <nav aria-label={profile.label} className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-50 mx-auto flex max-w-md items-center justify-around rounded-2xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur md:static md:inset-auto md:ml-auto md:max-w-none md:gap-2 md:rounded-none md:border-0 md:bg-transparent md:pr-4 md:pl-2 md:shadow-none md:backdrop-blur-none">
          <Link
            href={home.href}
            aria-label={home.label}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "size-10 rounded-full md:hidden")}
          >
            <HomeIcon />
            <span className="sr-only">{home.label}</span>
          </Link>
          <PostLink className={cn(buttonVariants(), "h-10 rounded-full bg-primary px-4 text-primary-foreground md:h-8 md:px-3")} ariaLabel={post.shortLabel}>
            {post.shortLabel}
          </PostLink>
          <Link
            href={profile.href}
            aria-label={profile.label}
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "hidden rounded-full md:inline-flex")}
          >
            <ProfileIcon />
            <span className="sr-only">{profile.label}</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
