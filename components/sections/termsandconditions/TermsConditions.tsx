'use client'

import { useState, useRef, useEffect } from 'react'

interface Section {
  id: string
  title: string
  content: string | React.ReactNode
}

export default function TermsConditions() {
  const [activeSection, setActiveSection] = useState('introduction')
  const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({})

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId)
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const handleScroll = () => {
      const sections = Object.keys(sectionRefs.current)
      for (const sectionId of sections) {
        const element = sectionRefs.current[sectionId]
        if (element) {
          const rect = element.getBoundingClientRect()
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(sectionId)
            break
          }
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const sections: Section[] = [
    {
      id: 'introduction',
      title: 'Introduction',
      content: (
        <p>
          Welcome to Levispares (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By accessing and using our website
          (levispares.co.za), you agree to be bound by these Terms and Conditions.
          If you do not agree to these terms, please do not use our website.
        </p>
      ),
    },
    {
      id: 'acceptance',
      title: 'Acceptance of Terms',
      content: (
        <p>
          By accessing our website, you acknowledge that you have read, understood, and agree
          to be bound by these Terms and Conditions. We reserve the right to update these
          terms at any time without prior notice. Your continued use of the website
          constitutes acceptance of any changes.
        </p>
      ),
    },
    {
      id: 'account',
      title: 'Account Registration',
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>You must be at least 18 years old to create an account</li>
          <li>You are responsible for maintaining the confidentiality of your account credentials</li>
          <li>You agree to provide accurate and complete information during registration</li>
          <li>You agree to notify us immediately of any unauthorized access to your account</li>
          <li>We reserve the right to suspend or terminate accounts that violate these terms</li>
        </ul>
      ),
    },
    {
      id: 'products',
      title: 'Products and Pricing',
      content: (
        <>
          <p className="mb-4">
            We strive to provide accurate product descriptions, pricing, and availability.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>All products are subject to availability</li>
            <li>Prices are subject to change without notice</li>
            <li>We reserve the right to refuse or cancel any order</li>
            <li>Product images are for illustration purposes only</li>
            <li>Vehicle compatibility information is provided as a guide only</li>
          </ul>
        </>
      ),
    },
    {
      id: 'orders',
      title: 'Orders and Payment',
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>All orders are subject to confirmation and availability</li>
          <li>We accept major credit cards, EFT, and other payment methods displayed at checkout</li>
          <li>Payment must be received before orders are processed</li>
          <li>You agree to pay all charges associated with your order</li>
          <li>Prices include VAT where applicable</li>
        </ul>
      ),
    },
    {
      id: 'shipping',
      title: 'Shipping and Delivery',
      content: (
        <>
          <p className="mb-4">
            We offer delivery across South Africa. Delivery times may vary based on location
            and product availability.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Delivery times are estimates and not guaranteed</li>
            <li>Shipping costs are calculated at checkout</li>
            <li>Free shipping may apply to orders above certain thresholds</li>
            <li>Risk of loss passes to you upon delivery to the carrier</li>
            <li>Please inspect packages upon delivery and report any damage</li>
          </ul>
        </>
      ),
    },
    {
      id: 'returns',
      title: 'Returns and Refunds',
      content: (
        <>
          <p className="mb-4">
            We want you to be completely satisfied with your purchase. Please review our
            return policy below.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Products must be unused, in original packaging, and with all tags attached</li>
            <li>Returns must be initiated within 30 days of purchase</li>
            <li>Certain items such as electrical parts may not be returnable</li>
            <li>Refunds are processed within 14 business days of receiving returned items</li>
            <li>Return shipping costs may be your responsibility unless the item is defective</li>
          </ul>
        </>
      ),
    },
    {
      id: 'warranty',
      title: 'Warranty Information',
      content: (
        <>
          <p className="mb-4">
            Warranty terms vary by product manufacturer and are provided with each item.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Manufacturer warranties are passed through to the customer</li>
            <li>Warranty claims must be submitted with proof of purchase</li>
            <li>Installation by a professional is required for warranty validity on certain parts</li>
            <li>Warranty does not cover damage from improper installation or misuse</li>
          </ul>
        </>
      ),
    },
    {
      id: 'intellectual',
      title: 'Intellectual Property',
      content: (
        <p>
          All content on this website, including logos, images, product descriptions, and
          software, is the property of Levispares or its suppliers and is protected by
          South African and international copyright laws. You may not reproduce, distribute,
          or modify any content without our written permission.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'Limitation of Liability',
      content: (
        <p>
          Levispares shall not be liable for any indirect, incidental, special, or
          consequential damages arising from your use of our website or products. Our
          liability is limited to the maximum extent permitted by law. We do not warrant
          that our website will be error-free or uninterrupted.
        </p>
      ),
    },
    {
      id: 'conduct',
      title: 'User Conduct',
      content: (
        <p>
          You agree not to: (i) use our website for any unlawful purpose; (ii) attempt to
          gain unauthorized access to any portion of the website; (iii) interfere with the
          proper operation of the website; (iv) transmit any viruses or other harmful code;
          or (v) engage in any activity that could damage or impair our services.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contact Information',
      content: (
        <p>
          If you have any questions about these Terms and Conditions, please contact us at:
          <br />
          <strong>Email:</strong> info@levispares.co.za
          <br />
          <strong>Phone:</strong> 012 770 3389
          <br />
          <strong>Address:</strong> Stand 11 Zambezi Auto Mart, Montana, Pretoria, 0182
        </p>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-wide mb-4 text-primary-foreground">
            TERMS & <span className="text-accent">CONDITIONS</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl">
            Please read our terms and conditions carefully before using our website
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <nav className="sticky top-24 space-y-2">
              <h3 className="font-semibold text-lg mb-4 text-foreground">Contents</h3>
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section.id)}
                  className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {section.title}
                </button>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-3">
            <div className="space-y-8">
              {sections.map((section) => (
                <section
                  key={section.id}
                  id={section.id}
                  ref={(el) => { sectionRefs.current[section.id] = el }}
                  className={`bg-card rounded-xl p-6 md:p-8 card-shadow transition-opacity duration-300 ${
                    activeSection === section.id ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  <h2 className="text-2xl font-bold text-foreground mb-4">{section.title}</h2>
                  <div className="text-muted-foreground space-y-2">{section.content}</div>
                </section>
              ))}
            </div>

            <div className="mt-12 p-6 bg-secondary rounded-xl">
              <h3 className="font-semibold text-lg mb-2 text-foreground">
                Questions about these terms?
              </h3>
              <p className="text-muted-foreground mb-4">
                If you have any questions or concerns, please contact our customer service team.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center justify-center btn-accent"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
