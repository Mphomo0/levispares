import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Shop Truck Spare Parts",
  description: "Browse and buy quality aftermarket truck spare parts by brand, model and category. Nationwide delivery across South Africa.",
  alternates: { canonical: "/shop" },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
