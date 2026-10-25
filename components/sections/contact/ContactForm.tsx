'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { CircleCheck, Send } from 'lucide-react'
import { motion } from 'motion/react'
import { convexSiteUrl } from '@/lib/convexSite'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Please enter a valid email'),
  message: z.string().min(1, 'Message cannot be empty').max(3000, 'Please keep your message under 3000 characters'),
  // Hidden from people; bots fill it in.
  website: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function ContactForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })
  const [sentTo, setSentTo] = useState<string | null>(null)

  // Emailed to the shop (info@) with the visitor as the reply-to address.
  const onSubmit = async (data: FormData) => {
    try {
      const res = await fetch(convexSiteUrl('/contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(result.error || 'Something went wrong')
      setSentTo(data.email)
      reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't send your message.", {
        description: 'You can also call us on 012 770 3389.',
      })
    }
  }

  if (sentTo) {
    return (
      <div className="rounded-xl bg-green-50 p-6 text-green-900" role="status">
        <p className="flex items-center gap-2 font-semibold">
          <CircleCheck className="h-5 w-5" aria-hidden="true" />
          Thanks, your message has been sent
        </p>
        <p className="mt-2 text-sm">We&apos;ll reply to {sentTo}, usually within one working day.</p>
        <button type="button" onClick={() => setSentTo(null)} className="mt-4 text-sm font-medium text-accent hover:underline">
          Send another message
        </button>
      </div>
    )
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

      {/* Hidden from people; bots fill it in. */}
      <input
        id="website"
        {...register('website')}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <motion.button
        type="submit"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        viewport={{ once: true }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isSubmitting}
        className="btn-accent flex items-center gap-2 text-white disabled:opacity-60"
      >
        <Send className="w-5 h-5 text-white" />
        {isSubmitting ? 'Sending…' : 'Send Message'}
      </motion.button>
    </form>
  )
}
