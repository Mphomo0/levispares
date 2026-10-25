import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Can't Find Your Part?",
  description:
    "Tell us the truck part you need, with your VIN, part number or a photo, and Levi's Spares will find it for you.",
  alternates: { canonical: '/part-request' },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
