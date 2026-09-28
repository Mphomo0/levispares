import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Levi's Spares: Stand 10 Zambezi, Montana, Pretoria. Call 012 770 3389 or email info@levispares.co.za.",
  alternates: { canonical: "/contact" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
