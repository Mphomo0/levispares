import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

const PRIVATE_PATHS = ['/admin', '/account', '/api', '/checkout', '/cart', '/unsubscribe', '/invoice']

// AI search and assistant crawlers, named so the choice to let them in is
// explicit. Remove a bot here (and add it with `disallow: '/'`) to block it.
const AI_CRAWLERS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: '/', disallow: PRIVATE_PATHS },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
