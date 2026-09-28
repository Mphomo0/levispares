import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "About Us",
  description: "Levi's Spares supplies quality aftermarket parts for Isuzu, Hino, Fuso, Nissan UD, FAW and more from our Montana, Pretoria store.",
  alternates: { canonical: "/about" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
