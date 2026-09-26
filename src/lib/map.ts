export function osmLinks(lat: number, lng: number, pad = 0.08): { embed: string; external: string } {
  const bbox = `${lng - pad},${lat - pad},${lng + pad},${lat + pad}`
  return {
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`,
    external: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=12/${lat}/${lng}`,
  }
}
