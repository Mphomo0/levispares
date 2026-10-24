import { ConvexHttpClient } from 'convex/browser'
import { api } from '@/convex/_generated/api'
import { SITE_ADDRESS, SITE_DESCRIPTION, SITE_EMAIL, SITE_NAME, SITE_URL } from '@/lib/site'
import { brandPath, categoryPath } from '@/lib/shopUrl'
import { tidyName } from '@/lib/seo'
import { FAQS } from '@/lib/faq'

export const revalidate = 3600

/** A plain-text guide to the site for AI assistants (https://llmstxt.org). */
export async function GET() {
  let categories: { name: string; slug: string }[] = []
  let brands: { name: string; slug: string }[] = []
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)
    ;[categories, brands] = await Promise.all([
      convex.query(api.categories.listTopLevel, {}),
      convex.query(api.brands.list, {}),
    ])
  } catch (error) {
    // Still serve the rest of the guide if the catalogue can't be read.
    console.error('llms.txt: failed to load catalogue', error)
  }

  const links = (items: { name: string; href: string }[]) =>
    items.map(({ name, href }) => `- [${name}](${SITE_URL}${href})`).join('\n')

  const sections = [
    `# ${SITE_NAME}`,
    `> ${SITE_DESCRIPTION}`,
    `${SITE_NAME} is a truck and commercial vehicle spare parts store at ${SITE_ADDRESS.street}, ${SITE_ADDRESS.locality}, ${SITE_ADDRESS.postalCode}, South Africa. Phone 012 770 3389, email ${SITE_EMAIL}. Open Monday to Friday 8am to 5pm and Saturday 8am to 1pm. Prices are in South African rand (ZAR).`,
    `## Main pages\n${links([
      { name: 'Shop all parts', href: '/shop' },
      { name: 'Frequently asked questions', href: '/faq' },
      { name: 'About us', href: '/about' },
      { name: 'Contact', href: '/contact' },
      { name: 'Terms and conditions', href: '/terms-conditions' },
    ])}`,
  ]
  if (brands.length) {
    sections.push(
      `## Parts by truck brand\n${links(brands.map((b) => ({ name: `${tidyName(b.name)} parts`, href: brandPath(b.slug) })))}`,
    )
  }
  if (categories.length) {
    sections.push(
      `## Parts by category\n${links(categories.map((c) => ({ name: tidyName(c.name), href: categoryPath(c.slug) })))}`,
    )
  }
  sections.push(`## FAQ\n${FAQS.map(({ question, answer }) => `### ${question}\n${answer}`).join('\n\n')}`)

  return new Response(sections.join('\n\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
