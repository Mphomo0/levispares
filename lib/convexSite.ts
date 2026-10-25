/**
 * Address of one of the Convex deployment's HTTP endpoints (on its
 * .convex.site domain), e.g. convexSiteUrl('/contact').
 */
export function convexSiteUrl(path: string) {
  const base =
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL!.replace('.convex.cloud', '.convex.site')
  return `${base}${path}`
}
