import { afterEach, describe, expect, it, vi } from 'vitest'
import { parsePartRequest, partRequestEmail } from '../../convex/lib/partRequest'
import { setup } from './helpers'

const VALID = { name: 'Sam', email: 'Sam@Example.com', description: 'Front left headlamp', vehicle: 'Isuzu NPR 400' }
const PHOTO = { type: 'image/jpeg', data: 'aGVsbG8=' }

describe('checking a part request', () => {
  it('accepts a request with a description or a part number', () => {
    expect(parsePartRequest(VALID)).toMatchObject({ request: { name: 'Sam', email: 'sam@example.com', photos: [] } })
    expect(parsePartRequest({ name: 'Sam', email: 's@example.com', partNumber: '8-97309-927-0' })).toHaveProperty('request')
  })

  it.each([
    ['no name', { ...VALID, name: ' ' }, 'your name'],
    ['a bad email', { ...VALID, email: 'nope' }, 'valid email'],
    ['nothing about the part', { name: 'Sam', email: 's@example.com' }, 'which part'],
    ['a bad VIN', { ...VALID, vin: '123' }, '17 letters'],
    ['too many photos', { ...VALID, photos: [PHOTO, PHOTO, PHOTO, PHOTO] }, 'at most 3'],
    ['a file that is not an image', { ...VALID, photos: [{ type: 'application/pdf', data: 'aGVsbG8=' }] }, 'JPEG, PNG or WebP'],
    ['the hidden bot field filled in', { ...VALID, website: 'spam.example' }, 'Invalid request'],
  ])('refuses %s', (_label, body, message) => {
    const result = parsePartRequest(body)
    expect('error' in result && result.error).toContain(message)
  })

  it('attaches photos and escapes what the customer typed', () => {
    const parsed = parsePartRequest({ ...VALID, vin: 'jt1234567890abcde', description: '<b>lamp</b>', photos: [PHOTO] })
    if (!('request' in parsed)) throw new Error('expected a request')
    const email = partRequestEmail(parsed.request)
    expect(email.subject).toBe('Part request: <b>lamp</b> (Isuzu NPR 400)')
    expect(email.html).toContain('&lt;b&gt;lamp&lt;/b&gt;')
    expect(email.html).toContain('JT1234567890ABCDE')
    expect(email.attachments).toEqual([{ filename: 'part-photo-1.jpg', content: 'aGVsbG8=' }])
  })
})

describe('the part request endpoint', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
    delete process.env.ORDER_NOTIFY_EMAIL
  })

  const post = (t: ReturnType<typeof setup>, body: unknown) =>
    t.fetch('/part-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  it('emails the shop with the customer as reply-to', async () => {
    const t = setup()
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Shop <orders@example.com>'
    process.env.ORDER_NOTIFY_EMAIL = 'info@example.com'
    const fetchMock = vi.fn(async () => new Response('{"id":"1"}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await post(t, { ...VALID, photos: [PHOTO] })
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(body).toMatchObject({ to: ['info@example.com'], reply_to: 'sam@example.com', attachments: [{ filename: 'part-photo-1.jpg' }] })
  })

  it('explains what is wrong, and says so when email is not set up', async () => {
    const t = setup()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect((await post(t, { ...VALID, email: 'nope' })).status).toBe(400)
    const res = await post(t, VALID)
    expect(res.status).toBe(503)
    expect((await res.json()).error).toContain('info@levispares.co.za')
  })
})
