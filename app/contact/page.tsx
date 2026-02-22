'use client'

import { motion } from 'motion/react'
import ContactInfo from '@/components/sections/contact/ContactInfo'
import ContactForm from '@/components/sections/contact/ContactForm'
import Map from '@/components/sections/contact/Map'

export default function ContactPage() {
  const contactInfo = [
    {
      type: 'address' as const,
      title: 'Address',
      content: 'Stand 11 Zambezi Auto Mart,\nMontana , Pretoria , 0182',
    },
    {
      type: 'phone' as const,
      title: 'Phone',
      content: '012 770 3389',
      href: 'tel:+0127703389',
    },
    {
      type: 'email' as const,
      title: 'Email',
      content: 'info@levispares.co.za',
      href: 'mailto:info@levispares.co.za',
    },
    {
      type: 'hours' as const,
      title: 'Hours',
      content: 'Mon-Fri: 8am - 5pm\nSat: 8am - 1pm',
    },
  ]

  return (
    <>
      <div className="hero-gradient text-primary-foreground py-16 md:py-24">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-4xl md:text-5xl lg:text-6xl tracking-wide mb-6"
          >
            GET IN <span className="text-accent">TOUCH</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl"
          >
            Have questions about our products or need help finding the right
            parts? Our expert team is here to assist you.
          </motion.p>
        </div>
      </div>
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="section-title mb-6">Send us a Message</h2>
              <ContactForm />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <h2 className="section-title mb-6">Contact Information</h2>
              <ContactInfo info={contactInfo} />
              <Map />
            </motion.div>
          </div>
        </div>
      </section>
    </>
  )
}
