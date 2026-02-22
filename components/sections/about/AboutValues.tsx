'use client'

import { motion } from 'motion/react'
import { Target, Heart, Award, Users } from 'lucide-react'

const values = [
  {
    icon: Target,
    title: 'Quality First',
    description:
      'We source only the highest quality parts that meet or exceed OEM specifications.',
  },
  {
    icon: Heart,
    title: 'Customer Focus',
    description:
      'Your satisfaction is our priority. We provide expert support every step of the way.',
  },
  {
    icon: Award,
    title: 'Trusted Brand',
    description:
      'Over 15 years of experience serving automotive enthusiasts and professionals.',
  },
  {
    icon: Users,
    title: 'Expert Team',
    description:
      'Our team of certified technicians ensures you get the right parts for your vehicle.',
  },
]

export default function AboutValues() {
  return (
    <section className="py-16 md:py-24 bg-blue-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="section-title">Our Values</h2>
          <p className="section-subtitle">
            The principles that drive everything we do
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, index) => (
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-6 text-center card-shadow"
            >
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-accent/10 flex items-center justify-center">
                <value.icon className="w-7 h-7 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">
                {value.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {value.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
