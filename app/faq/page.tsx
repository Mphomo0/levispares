import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import JsonLd from '@/components/seo/JsonLd'
import { breadcrumbJsonLd, faqJsonLd } from '@/lib/seo'
import { FAQS } from '@/lib/faq'

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    "Answers about ordering truck spare parts from Levi's Spares: nationwide delivery, payment, returns, warranty, opening hours and finding the right part.",
  alternates: { canonical: '/faq' },
}

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(FAQS)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', href: '/' },
          { name: 'FAQ', href: '/faq' },
        ])}
      />
      <div className="hero-gradient text-primary-foreground py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-wide mb-6">
            FREQUENTLY ASKED <span className="text-accent">QUESTIONS</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl">
            Everything you need to know about ordering parts, delivery, payment and returns.
          </p>
        </div>
      </div>
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="divide-y divide-border border-y border-border">
            {FAQS.map(({ question, answer }) => (
              <details key={question} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-foreground [&::-webkit-details-marker]:hidden">
                  <h2 className="text-lg">{question}</h2>
                  <ChevronDown className="w-5 h-5 shrink-0 text-accent transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-muted-foreground leading-relaxed">{answer}</p>
              </details>
            ))}
          </div>
          <p className="mt-10 text-muted-foreground">
            Still have a question?{' '}
            <Link href="/contact" className="text-accent font-medium hover:underline">
              Get in touch
            </Link>{' '}
            and our team will help.
          </p>
        </div>
      </section>
    </>
  )
}
