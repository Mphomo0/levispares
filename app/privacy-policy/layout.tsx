import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Levi's Spares collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy-policy" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
