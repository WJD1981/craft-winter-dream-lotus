/** Opens the phone’s default maps app with driving directions. */

export function mapsDirectionsUrl(destination: string, origin?: string) {
  const dest = destination.trim();
  const start = origin?.trim() || "";
  if (typeof navigator !== "undefined" && /iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const query = new URLSearchParams({ daddr: dest, dirflg: "d" });
    if (start) query.set("saddr", start);
    return `https://maps.apple.com/?${query.toString()}`;
  }
  const query = new URLSearchParams({ api: "1", destination: dest, travelmode: "driving" });
  if (start) query.set("origin", start);
  return `https://www.google.com/maps/dir/?${query.toString()}`;
}
