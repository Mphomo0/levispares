'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { motion } from 'motion/react'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Please enter a valid email'),
  message: z.string().min(1, 'Message cannot be empty').max(3000, 'Please keep your message under 3000 characters'),
})

type FormData = z.infer<typeof schema>

export default function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // Nothing is stored: this opens the visitor's email app with the message
  // ready to send to the store. (Swap for a server-side email send later.)
  const onSubmit = (data: FormData) => {
    // Hidden field that only bots fill in.
    if (document.getElementById('website')?.getAttribute('data-filled') === 'true') {
      reset()
      return
    }
    const subject = encodeURIComponent(`Website enquiry from ${data.name}`)
    const body = encodeURIComponent(`${data.message}\n\nFrom: ${data.name} (${data.email})`)
    window.location.assign(`mailto:info@levispares.co.za?subject=${subject}&body=${body}`)
    toast.success('Opening your email app. Press send there to reach us.', {
      description: 'Or call us on 012 770 3389.',
    })
    reset()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        viewport={{ once: true }}
      >
        <label
          htmlFor="name"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Your Name
        </label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className="input-styled"
          placeholder="John Doe"
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        viewport={{ once: true }}
      >
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Email Address
        </label>
        <input
          type="email"
          id="email"
          {...register('email')}
          className="input-styled"
          placeholder="john@example.com"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        viewport={{ once: true }}
      >
        <label
          htmlFor="message"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Message
        </label>
        <textarea
          id="message"
          {...register('message')}
          rows={6}
          className="input-styled resize-none"
          placeholder="How can we help you?"
        />
        {errors.message && (
          <p className="text-red-500 text-sm">{errors.message.message}</p>
        )}
      </motion.div>

      <input name="website"
        id="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        onChange={(e) => e.currentTarget.setAttribute('data-filled', e.currentTarget.value ? 'true' : 'false')}
      />

      <motion.button
        type="submit"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        viewport={{ once: true }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="btn-accent flex items-center gap-2 text-white"
      >
        <Send className="w-5 h-5 text-white" />
        Send Message
      </motion.button>
    </form>
  )
}
