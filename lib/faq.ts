import { BRAND_LIST } from '@/lib/seo'

/**
 * Questions shown on /faq and given to search engines as FAQPage data.
 * Answers are plain text so the page and the structured data say the same thing.
 * Keep them in step with the terms and conditions.
 */
export const FAQS: { question: string; answer: string }[] = [
  {
    question: "What does Levi's Spares sell?",
    answer: `Levi's Spares sells quality aftermarket spare parts for trucks and commercial vehicles, including ${BRAND_LIST}.`,
  },
  {
    question: 'Where is Levi\'s Spares based?',
    answer:
      "Our store is at Stand 10 Zambezi, Montana, Pretoria, 0182. You can call us on 012 770 3389 or email info@levispares.co.za.",
  },
  {
    question: 'What are your opening hours?',
    answer: 'We are open Monday to Friday from 8am to 5pm, and Saturday from 8am to 1pm.',
  },
  {
    question: 'Do you deliver across South Africa?',
    answer:
      'Yes. We deliver nationwide across South Africa. The delivery fee is shown at checkout before you pay, and delivery times depend on your location and stock availability.',
  },
  {
    question: 'How do I find the right part for my truck?',
    answer:
      "In the shop, choose your truck's brand, then narrow it down by model and variant. You can also search by part name or part number. If you're not sure a part fits, call or email us with your vehicle details and we'll check for you.",
  },
  {
    question: 'Do I need an account to order?',
    answer:
      'No. You can check out as a guest with just your email address and delivery details. Creating an account lets you save addresses, view past orders and keep a list of favourite parts.',
  },
  {
    question: 'How can I pay?',
    answer:
      'You pay securely online through PayPal at checkout. Prices are in South African rand and include VAT where applicable. Orders are processed once payment is received.',
  },
  {
    question: 'Can I return a part?',
    answer:
      'Yes, within 30 days of purchase, as long as the part is unused and in its original packaging. Some items, such as electrical parts, may not be returnable. Refunds are processed within 14 business days of us receiving the return.',
  },
  {
    question: 'Do your parts come with a warranty?',
    answer:
      'Warranty terms depend on the manufacturer and are passed on to you. Keep your proof of purchase for any claim. Some parts need professional installation for the warranty to apply.',
  },
  {
    question: 'Are your parts genuine or aftermarket?',
    answer:
      'We specialise in quality aftermarket parts. Where we have it, the product page lists the part number so you can match it to your old part.',
  },
]
