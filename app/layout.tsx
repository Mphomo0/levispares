import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { MotionConfig } from 'motion/react'
import NavigationWrapper from '@/components/layout/NavigationWrapper'
import { CartProvider } from '@/lib/CartContext'
import { FavoritesProvider } from '@/lib/FavoritesContext'
import FavoritesMerge from '@/components/FavoritesMerge'

import { SITE_URL, SITE_NAME, SITE_DESCRIPTION, SITE_LOGO } from '@/lib/site'
import { Toaster } from 'sonner'
import { ConvexClientProvider } from '@/components/providers/ConvexClientProvider'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Truck & Commercial Vehicle Spare Parts`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_ZA',
    url: SITE_URL,
    title: `${SITE_NAME} | Truck & Commercial Vehicle Spare Parts`,
    description: SITE_DESCRIPTION,
    images: [{ url: SITE_LOGO }],
  },
  twitter: {
    card: 'summary',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [SITE_LOGO],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <MotionConfig reducedMotion="user">
          <ConvexClientProvider>
            <CartProvider>
              <FavoritesProvider>
                <FavoritesMerge />
                <NavigationWrapper>
                  {children}
                </NavigationWrapper>
              </FavoritesProvider>
            </CartProvider>
          </ConvexClientProvider>
        </MotionConfig>
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}
