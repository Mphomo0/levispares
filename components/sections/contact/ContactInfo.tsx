'use client'

import { motion } from 'motion/react'
import { MapPin, Phone, Mail, Clock } from 'lucide-react'

type ContactInfoProps = {
  info: {
    title: string
    content: string
    href?: string
    type?: 'address' | 'phone' | 'email' | 'hours'
  }[]
}

const iconMap = {
  address: MapPin,
  phone: Phone,
  email: Mail,
  hours: Clock,
}

export default function ContactInfo({ info }: ContactInfoProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-4 mb-8">
      {info.map(({ type = 'address', title, content, href }, index) => {
        const Icon = iconMap[type] || MapPin
        return (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            viewport={{ once: true }}
            className="bg-blue-200/20 rounded-xl p-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-1">{title}</h4>
                {href ? (
                  <a
                    href={href}
                    className="text-muted-foreground hover:text-accent transition-colors text-sm"
                  >
                    {content}
                  </a>
                ) : (
                  <p className="text-muted-foreground text-sm whitespace-pre-line">
                    {content}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
