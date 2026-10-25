import { afterEach, describe, expect, it, vi } from 'vitest'
import { contactEmail, parseContactMessage } from '../../convex/lib/contactMessage'
import { setup } from './helpers'

const VALID = { name: 'Thabo', email: 'Thabo@Example.com', message: 'Do you have brake pads for a 2015 Hino 300?' }

describe('checking a contact message', () => {
  it('accepts a complete message and tidies the email', () => {
    expect(parseContactMessage(VALID)).toEqual({ message: { ...VALID, email: 'thabo@example.com' } })
  })

  it.each([
    ['no name', { ...VALID, name: '' }, 'your name'],
    ['a bad email', { ...VALID, email: 'thabo' }, 'valid email'],
    ['no message', { ...VALID, message: '   ' }, 'write a message'],
    ['a very long message', { ...VALID, message: 'x'.repeat(3001) }, 'under 3000'],
    ['the hidden bot field filled in', { ...VALID, website: 'spam.example' }, 'Invalid request'],
  ])('refuses %s', (_label, body, message) => {
    const result = parseContactMessage(body)
    expect('error' in result && result.error).toContain(message)
  })

  it('escapes what the visitor typed', () => {
    const email = contactEmail({ name: 'Thabo <b>', email: 't@example.com', message: 'Hi <script>' })
    expect(email.subject).toBe('Website enquiry from Thabo <b>: Hi <script>')
    expect(email.html).toContain('Thabo &lt;b&gt;')
    expect(email.html).toContain('Hi &lt;script&gt;')
    expect(email.html).not.toContain('<script>')
  })
})

describe('the contact endpoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
    delete process.env.ORDER_NOTIFY_EMAIL
  })

  const post = (t: ReturnType<typeof setup>, body: unknown) =>
    t.fetch('/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  it('emails the shop with the visitor as reply-to', async () => {
    const t = setup()
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Shop <orders@example.com>'
    process.env.ORDER_NOTIFY_EMAIL = 'info@example.com'
    const fetchMock = vi.fn(async () => new Response('{"id":"1"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await post(t, VALID)
    expect(res.status).toBe(200)
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body).toMatchObject({ to: ['info@example.com'], reply_to: 'thabo@example.com', tags: [{ name: 'category', value: 'contact' }] })
    expect(body.text).toContain('2015 Hino 300')
  })

  it('explains what is wrong, and gives another way to reach the shop when email fails', async () => {
    const t = setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await post(t, { ...VALID, message: '' })).status).toBe(400)
    const res = await post(t, VALID)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toContain('012 770 3389')

    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Shop <orders@example.com>'
    process.env.ORDER_NOTIFY_EMAIL = 'info@example.com'
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 500 })))
    expect((await post(t, VALID)).status).toBe(502)
  })
})
