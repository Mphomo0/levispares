import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions for buying from Levi's Spares.",
  alternates: { canonical: "/terms-conditions" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
