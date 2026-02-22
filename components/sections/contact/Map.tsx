'use client'

import { motion } from 'motion/react'

export default function Map() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      viewport={{ once: true }}
      className="bg-secondary rounded-xl overflow-hidden h-80"
    >
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3595.7042324636345!2d28.263580975798103!3d-25.68109744287489!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1ebfdfb19c9de787%3A0xba4cdd20d7770f45!2sLevi%20Auto!5e0!3m2!1sen!2sza!4v1771687672074!5m2!1sen!2sza"
        width="100%"
        height="100%"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </motion.div>
  )
}
