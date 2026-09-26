export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200/80 bg-white">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-2 px-4 py-6 text-xs leading-5 text-neutral-500 md:flex-row md:items-center md:justify-between md:px-6">
        <p>africa classifieds · sample listings for a pan-African board.</p>
        <p className="max-w-xl md:text-right">
          Countries are ISO 3166 from an open snapshot. Cities and zones are GeoNames and IANA. Currency and language names are Unicode CLDR. Maps use OpenStreetMap. Photos: Unsplash, Pexels, and Wikimedia Commons (Toyota HiAce by Lawrence Ruiz; generator by Biswarup Ganguly, CC BY-SA). Ads you post are stored in the board database. Saved ads and messages stay with this browser.
        </p>
      </div>
    </footer>
  )
}
