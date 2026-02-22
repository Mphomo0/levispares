'use client'

import { useState, useRef, useEffect } from 'react'

interface Section {
  id: string
  title: string
  content: string | React.ReactNode
}

export default function PrivacyPolicy() {
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
          At Levispares (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), we
          are committed to protecting your privacy. This Privacy Policy explains
          how we collect, use, disclose, and safeguard your information when you
          visit our website (levispares.co.za).
        </p>
      ),
    },
    {
      id: 'collection',
      title: 'Information We Collect',
      content: (
        <>
          <p className="mb-4">We collect information in several ways:</p>
          <h4 className="font-semibold text-foreground mb-2">
            Personal Information
          </h4>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>Name and surname</li>
            <li>Email address</li>
            <li>Phone number</li>
            <li>Physical address (for delivery)</li>
            <li>Vehicle details (make, model, year)</li>
            <li>Payment information (processed securely)</li>
          </ul>
          <h4 className="font-semibold text-foreground mb-2">
            Automatically Collected Information
          </h4>
          <ul className="list-disc pl-6 space-y-2">
            <li>IP address and browser type</li>
            <li>Pages visited and time spent on site</li>
            <li>Referring/exit URLs</li>
            <li>Device information</li>
            <li>Cookies and tracking technologies</li>
          </ul>
        </>
      ),
    },
    {
      id: 'usage',
      title: 'How We Use Your Information',
      content: (
        <ul className="list-disc pl-6 space-y-2">
          <li>Process and fulfill your orders</li>
          <li>Provide customer support and respond to inquiries</li>
          <li>Send order confirmations and updates</li>
          <li>Recommend compatible parts for your vehicle</li>
          <li>Process payments securely</li>
          <li>Improve our website and services</li>
          <li>Send promotional emails (with your consent)</li>
          <li>Comply with legal obligations</li>
          <li>Prevent fraud and ensure security</li>
        </ul>
      ),
    },
    {
      id: 'sharing',
      title: 'Information Sharing',
      content: (
        <>
          <p className="mb-4">We may share your information with:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Service Providers:</strong> Shipping companies, payment
              processors, and IT service providers who assist in our operations
            </li>
            <li>
              <strong>Vehicle Compatibility:</strong> Information may be shared
              with third-party databases to verify vehicle compatibility
            </li>
            <li>
              <strong>Legal Requirements:</strong> When required by law or to
              protect our rights and safety
            </li>
            <li>
              <strong>Business Transfers:</strong> In the event of a merger or
              sale of business assets
            </li>
          </ul>
          <p className="mt-4">
            We do <strong>not</strong> sell or rent your personal information to
            third parties for marketing purposes.
          </p>
        </>
      ),
    },
    {
      id: 'cookies',
      title: 'Cookies and Tracking',
      content: (
        <>
          <p className="mb-4">
            We use cookies and similar tracking technologies to enhance your
            browsing experience and gather usage data.
          </p>
          <h4 className="font-semibold text-foreground mb-2">
            Types of Cookies We Use
          </h4>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Essential Cookies:</strong> Required for basic site
              functionality
            </li>
            <li>
              <strong>Analytics Cookies:</strong> Help us understand how
              visitors interact with our website
            </li>
            <li>
              <strong>Marketing Cookies:</strong> Used to track visitors across
              websites
            </li>
            <li>
              <strong>Preference Cookies:</strong> Remember your settings and
              preferences
            </li>
          </ul>
          <p className="mt-4">
            You can manage cookie preferences through your browser settings.
            However, disabling essential cookies may affect site functionality.
          </p>
        </>
      ),
    },
    {
      id: 'security',
      title: 'Data Security',
      content: (
        <>
          <p className="mb-4">
            We implement appropriate technical and organizational measures to
            protect your personal information:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>SSL encryption for all data transmissions</li>
            <li>Secure payment processing (PCI-DSS compliant)</li>
            <li>Regular security audits and updates</li>
            <li>Access controls for employee data access</li>
            <li>Secure data storage with encryption at rest</li>
          </ul>
          <p className="mt-4">
            While we strive to protect your information, no method of
            transmission over the internet is 100% secure. We cannot guarantee
            absolute security.
          </p>
        </>
      ),
    },
    {
      id: 'retention',
      title: 'Data Retention',
      content: (
        <p>
          We retain your personal information for as long as your account is
          active or as needed to provide you services. We will retain and use
          your information as necessary to: comply with our legal obligations,
          resolve disputes, and enforce our agreements. After account deletion,
          we may retain certain information in anonymized form for analytics
          purposes.
        </p>
      ),
    },
    {
      id: 'rights',
      title: 'Your Rights',
      content: (
        <>
          <p className="mb-4">
            Under the POPIA (Protection of Personal Information Act), you have
            the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Access:</strong> Request a copy of the personal
              information we hold about you
            </li>
            <li>
              <strong>Correction:</strong> Request correction of inaccurate
              personal data
            </li>
            <li>
              <strong>Deletion:</strong> Request deletion of your personal data
              (&quot;right to be forgotten&quot;)
            </li>
            <li>
              <strong>Objection:</strong> Object to processing of your personal
              data
            </li>
            <li>
              <strong>Restriction:</strong> Request restriction on how we
              process your data
            </li>
            <li>
              <strong>Portability:</strong> Request your data in a portable,
              machine-readable format
            </li>
            <li>
              <strong>Withdraw Consent:</strong> Withdraw consent at any time
              (where processing is based on consent)
            </li>
          </ul>
          <p className="mt-4">
            To exercise these rights, please contact us using the information
            provided below.
          </p>
        </>
      ),
    },
    {
      id: 'third-party',
      title: 'Third-Party Links',
      content: (
        <p>
          Our website may contain links to third-party websites, services, or
          applications that are not operated by us. We are not responsible for
          the privacy practices of these third parties. We encourage you to
          review the privacy policies of any third-party sites you visit.
        </p>
      ),
    },
    {
      id: 'children',
      title: "Children's Privacy",
      content: (
        <p>
          Our website is not intended for children under 18 years of age. We do
          not knowingly collect personal information from children. If you are a
          parent or guardian and believe your child has provided us with
          personal information, please contact us immediately.
        </p>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to This Policy',
      content: (
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of any changes by posting the new policy on this page and updating
          the &quot;Last Updated&quot; date. We encourage you to review this
          Privacy Policy periodically for any changes.
        </p>
      ),
    },
    {
      id: 'contact',
      title: 'Contact Information',
      content: (
        <>
          <p className="mb-4">
            If you have any questions about this Privacy Policy or wish to
            exercise your rights, please contact us:
          </p>
          <div className="bg-secondary rounded-lg p-4 space-y-2">
            <p>
              <strong>Email:</strong> info@levispares.co.za
            </p>
            <p>
              <strong>Phone:</strong> 012 770 3389
            </p>
            <p>
              <strong>Address:</strong> Stand 11 Zambezi Auto Mart, Montana,
              Pretoria, 0182
            </p>
          </div>
          <p className="mt-4">
            We will respond to your request within 30 days as required by POPIA.
          </p>
        </>
      ),
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="hero-gradient py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-wide mb-4 text-primary-foreground">
            PRIVACY <span className="text-accent">POLICY</span>
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl">
            Learn how we collect, use, and protect your personal information
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <nav className="sticky top-24 space-y-2">
              <h3 className="font-semibold text-lg mb-4 text-foreground">
                Contents
              </h3>
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
                  <h2 className="text-2xl font-bold text-foreground mb-4">
                    {section.title}
                  </h2>
                  <div className="text-muted-foreground space-y-2">
                    {section.content}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-12 p-6 bg-secondary rounded-xl">
              <h3 className="font-semibold text-lg mb-2 text-foreground">
                Questions about your privacy?
              </h3>
              <p className="text-muted-foreground mb-4">
                Our team is here to help with any privacy concerns or questions.
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
