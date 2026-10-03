'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useCart } from '@/lib/CartContext'
import { toast } from 'sonner'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { SignInButton, SignUpButton } from '@clerk/nextjs'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import SmartImage from '@/components/ui/SmartImage'
import { toPayPalAmounts, type PayPalAmounts } from '@/lib/currency'
import { getErrorMessage } from '@/lib/errors'

const PAYPAL_CURRENCY = process.env.NEXT_PUBLIC_PAYPAL_CURRENCY || 'USD'

// The PayPal SDK is only needed on the final step, so it's kept out of the
// checkout page's initial bundle and fetched when the user reaches Payment.
const PaymentStep = dynamic(() => import('./PaymentStep'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  ),
})

export interface PaymentInfo {
  /** Order total in rand. */
  total: number
  /** Rand per US$1 frozen onto the order. */
  rate?: number
  /** What PayPal will charge, or null when no exchange rate is set. */
  amounts: PayPalAmounts | null
}

const STEPS = ['Address', 'Review', 'Payment'] as const
type Step = (typeof STEPS)[number]

const addressSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  name: z.string().min(2, 'Full name is required'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  province: z.string().min(2, 'Province is required'),
  postalCode: z.string().min(4, 'Valid postal code is required'),
  country: z.string().min(2, 'Country is required'),
  phone: z.string().min(7, 'Valid phone number is required'),
})

type AddressFormData = z.infer<typeof addressSchema>

const defaultAddressValues: AddressFormData = {
  label: 'Home',
  name: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'South Africa',
  phone: '',
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const { items, totalPrice, clearCart } = useCart()
  const addresses = useQuery(api.addresses.listByUser)
  const addAddress = useMutation(api.addresses.add)
  const createOrder = useMutation(api.orders.create)
  const storeSettings = useQuery(api.settings.get)
const taxEnabled = storeSettings?.taxEnabled ?? false
const taxRatePercent = storeSettings?.taxRate ?? 0
const shippingRateSetting = storeSettings?.shippingRate ?? 250

const [currentStep, setCurrentStep] = useState<Step>('Address')
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)
  const [convexOrderId, setConvexOrderId] = useState<string | null>(null)
  const [payment, setPayment] = useState<PaymentInfo | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

const shipping = shippingRateSetting
const tax = taxEnabled ? totalPrice * (taxRatePercent / 100) : 0
  const grandTotal = totalPrice + shipping + tax

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0 && isUserLoaded) {
      router.push('/cart')
    }
  }, [items.length, isUserLoaded, router])

  // Auto-select a default address, or show the add form, once addresses load.
  // Adjusting state during render (rather than in an effect) avoids an extra
  // cascading render.
  const [prevAddresses, setPrevAddresses] = useState(addresses)
  if (addresses !== prevAddresses) {
    setPrevAddresses(addresses)
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.isDefault)
      setSelectedAddressId(defaultAddr?._id ?? addresses[0]._id)
    }
    if (addresses && addresses.length === 0) {
      setShowAddForm(true)
    }
  }

  const selectedAddress = addresses?.find((a) => a._id === selectedAddressId)

  const handleSaveAddress = async (data: AddressFormData) => {
    if (!user?.id) return
    setSavingAddress(true)
    try {
      const newId = await addAddress({
        type: 'shipping' as const,
        ...data,
        isDefault: (addresses?.length ?? 0) === 0,
      })
      setSelectedAddressId(newId)
      setShowAddForm(false)
      toast.success('Address saved')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save address'))
    } finally {
      setSavingAddress(false)
    }
  }

  const handleContinueToReview = () => {
    if (!selectedAddressId || !selectedAddress) {
      toast.error('Please select a delivery address.')
      return
    }
    setCurrentStep('Review')
  }

  const handleContinueToPayment = async () => {
    if (!user?.id || !selectedAddress) return
    setIsProcessing(true)
    try {
      // Send only what was chosen: the server prices the order itself.
      const created = await createOrder({
        items: items.map((item) => ({
          productId: item._id as Id<'products'>,
          quantity: item.quantity,
        })),
        shippingAddressId: selectedAddress._id as Id<'addresses'>,
      })
      if (Math.abs(created.total - grandTotal) >= 0.01) {
        toast.warning(
          `Prices have been updated. Your order total is R${created.total.toFixed(2)}.`,
        )
      }
      setConvexOrderId(created.orderId)
      setPayment({
        total: created.total,
        rate: created.exchangeRate,
        amounts: toPayPalAmounts(
          {
            items: created.items,
            shipping: created.shipping,
            tax: created.tax,
            exchangeRate: created.exchangeRate,
          },
          PAYPAL_CURRENCY,
        ),
      })
      setCurrentStep('Payment')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create order'))
    } finally {
      setIsProcessing(false)
    }
  }

  const stepIndex = STEPS.indexOf(currentStep)

  if (!isUserLoaded || items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        <div className="hero-gradient text-primary-foreground py-12 md:py-16">
          <div className="container mx-auto px-4">
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl tracking-wide mb-2">
              CHECKOUT
            </h1>
            <p className="text-primary-foreground/70">
              Sign in to complete your order
            </p>
          </div>
        </div>
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg aria-hidden="true" className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Sign in to checkout</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in or create an account to complete your purchase.
            </p>
            <div className="flex flex-col gap-3">
              <SignInButton mode="modal" forceRedirectUrl="/checkout">
                <button className="w-full bg-accent text-white px-6 py-3 rounded-lg font-medium transition hover:brightness-110">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal" forceRedirectUrl="/checkout">
                <button className="w-full border border-accent text-accent px-6 py-3 rounded-lg font-medium transition hover:bg-accent/5">
                  Create Account
                </button>
              </SignUpButton>
            </div>
            <Link href="/cart" className="block mt-6 text-sm text-muted-foreground hover:text-accent transition-colors">
              &larr; Back to Cart
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="hero-gradient text-primary-foreground py-12 md:py-16">
        <div className="container mx-auto px-4">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-3xl md:text-4xl lg:text-5xl tracking-wide mb-4"
          >
            CHECKOUT
          </motion.h1>

          {/* Step Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-2 md:gap-4"
          >
            {STEPS.map((step, i) => (
              <div key={step} className="flex items-center gap-2 md:gap-4">
                <button
                  onClick={() => {
                    if (i < stepIndex) setCurrentStep(step)
                  }}
                  disabled={i > stepIndex}
                  className={`flex items-center gap-2 transition ${
                    i <= stepIndex
                      ? 'text-primary-foreground'
                      : 'text-primary-foreground/40'
                  } ${i < stepIndex ? 'cursor-pointer hover:text-accent' : ''}`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                      i < stepIndex
                        ? 'bg-accent text-accent-foreground'
                        : i === stepIndex
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-primary-foreground/20 text-primary-foreground/50'
                    }`}
                  >
                    {i < stepIndex ? (
                      <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="hidden sm:inline font-medium">{step}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`w-8 md:w-16 h-0.5 transition-colors ${
                      i < stepIndex ? 'bg-accent' : 'bg-primary-foreground/20'
                    }`}
                  />
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {currentStep === 'Address' && (
                <AddressStep
                  key="address"
                  addresses={addresses ?? []}
                  selectedAddressId={selectedAddressId}
                  onSelectAddress={setSelectedAddressId}
                  showAddForm={showAddForm}
                  onToggleAddForm={setShowAddForm}
                  onSaveAddress={handleSaveAddress}
                  savingAddress={savingAddress}
                  onContinue={handleContinueToReview}
                />
              )}
              {currentStep === 'Review' && (
                <ReviewStep
                  key="review"
                  items={items}
                  selectedAddress={selectedAddress!}
                  shipping={shipping}
                  tax={tax}
                  taxEnabled={taxEnabled}
                  taxRatePercent={taxRatePercent}
                  grandTotal={grandTotal}
                  totalPrice={totalPrice}
                  onBack={() => setCurrentStep('Address')}
                  onContinue={handleContinueToPayment}
                  isProcessing={isProcessing}
                />
              )}
              {currentStep === 'Payment' && (
                <PaymentStep
                  key="payment"
                  convexOrderId={convexOrderId!}
                  payment={payment}
                  onSuccess={() => {
                    clearCart()
                    router.push(`/checkout/success?orderId=${convexOrderId}`)
                  }}
                  onBack={() => setCurrentStep('Review')}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <OrderSidebar items={items} totalPrice={totalPrice} shipping={shipping} tax={tax} taxEnabled={taxEnabled} taxRatePercent={taxRatePercent} grandTotal={grandTotal} />
          </div>
        </div>
      </div>
    </>
  )
}

/* ─── Address Step ─── */
interface AddressStepProps {
  addresses: Array<{
    _id: string
    label?: string
    name: string
    street: string
    city: string
    province?: string
    postalCode: string
    country: string
    phone?: string
    isDefault?: boolean
  }>
  selectedAddressId: string | null
  onSelectAddress: (id: string) => void
  showAddForm: boolean
  onToggleAddForm: (show: boolean) => void
  onSaveAddress: (data: AddressFormData) => Promise<void>
  savingAddress: boolean
  onContinue: () => void
}

function AddressStep({
  addresses,
  selectedAddressId,
  onSelectAddress,
  showAddForm,
  onToggleAddForm,
  onSaveAddress,
  savingAddress,
  onContinue,
}: AddressStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: defaultAddressValues,
  })

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-foreground mb-6">Delivery Address</h2>

      {addresses.length > 0 && (
        <div className="space-y-3 mb-6">
          {addresses.map((addr) => (
            <label
              key={addr._id}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition ${
                selectedAddressId === addr._id
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-accent/40'
              }`}
            >
              <input
                type="radio"
                name="address"
                checked={selectedAddressId === addr._id}
                onChange={() => onSelectAddress(addr._id)}
                className="mt-1 h-4 w-4 text-accent accent-[oklch(0.75_0.183_47.752)]"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="bg-accent/10 text-accent text-xs px-2 py-0.5 rounded-full font-medium">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-foreground">{addr.name}</p>
                <p className="text-sm text-muted-foreground">{addr.street}</p>
                <p className="text-sm text-muted-foreground">
                  {addr.city}, {addr.province} {addr.postalCode}
                </p>
                <p className="text-sm text-muted-foreground">{addr.phone}</p>
              </div>
            </label>
          ))}
        </div>
      )}

      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-card rounded-xl p-6 card-shadow mb-6"
        >
          <h3 className="font-semibold text-lg text-foreground mb-4">New Address</h3>
          <form onSubmit={handleSubmit(onSaveAddress)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkout-label" className="block text-sm font-medium text-foreground mb-1">Label</label>
                <select id="checkout-label" {...register('label')} className="input-styled">
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="checkout-name" className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
                <input
                  id="checkout-name" autoComplete="name" {...register('name')}
                  placeholder="Full name"
                  aria-invalid={errors.name ? true : undefined} className={`input-styled ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.name && <p role="alert" className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="checkout-street" className="block text-sm font-medium text-foreground mb-1">Street Address *</label>
              <input
                id="checkout-street" autoComplete="street-address" {...register('street')}
                placeholder="123 Main Street, Apt 4B"
                aria-invalid={errors.street ? true : undefined} className={`input-styled ${errors.street ? 'border-red-500 focus:border-red-500' : ''}`}
              />
              {errors.street && <p role="alert" className="text-xs text-red-600 mt-1">{errors.street.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkout-city" className="block text-sm font-medium text-foreground mb-1">City *</label>
                <input
                  id="checkout-city" autoComplete="address-level2" {...register('city')}
                  placeholder="Johannesburg"
                  aria-invalid={errors.city ? true : undefined} className={`input-styled ${errors.city ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.city && <p role="alert" className="text-xs text-red-600 mt-1">{errors.city.message}</p>}
              </div>
              <div>
                <label htmlFor="checkout-province" className="block text-sm font-medium text-foreground mb-1">Province *</label>
                <input
                  id="checkout-province" autoComplete="address-level1" {...register('province')}
                  placeholder="Gauteng"
                  aria-invalid={errors.province ? true : undefined} className={`input-styled ${errors.province ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.province && <p role="alert" className="text-xs text-red-600 mt-1">{errors.province.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="checkout-postalCode" className="block text-sm font-medium text-foreground mb-1">Postal Code *</label>
                <input
                  id="checkout-postalCode" autoComplete="postal-code" {...register('postalCode')}
                  placeholder="2000"
                  aria-invalid={errors.postalCode ? true : undefined} className={`input-styled ${errors.postalCode ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.postalCode && <p role="alert" className="text-xs text-red-600 mt-1">{errors.postalCode.message}</p>}
              </div>
              <div>
                <label htmlFor="checkout-phone" className="block text-sm font-medium text-foreground mb-1">Phone *</label>
                <input
                  id="checkout-phone" autoComplete="tel" {...register('phone')}
                  type="tel"
                  placeholder="+27 12 345 6789"
                  aria-invalid={errors.phone ? true : undefined} className={`input-styled ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.phone && <p role="alert" className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
              </div>
            </div>
            <div>
              <label htmlFor="checkout-country" className="block text-sm font-medium text-foreground mb-1">Country</label>
              <input
                id="checkout-country" autoComplete="country-name" {...register('country')}
                className="input-styled"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={savingAddress}
                className="btn-accent w-full md:w-auto text-white disabled:opacity-50"
              >
                {savingAddress ? 'Saving...' : 'Save Address'}
              </button>
              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => onToggleAddForm(false)}
                  className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors w-full md:w-auto"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </motion.div>
      )}

      <div className="mt-8 flex flex-col lg:flex-row gap-4">
        {!showAddForm && addresses.length < 3 && (
          <button
            onClick={() => onToggleAddForm(true)}
            className="p-4 rounded-xl border-2 border-dashed border-border hover:border-accent/40 transition-colors text-muted-foreground hover:text-accent flex items-center justify-center gap-2"
          >
            <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New Address
          </button>
        )}
        <button
          onClick={onContinue}
          disabled={!selectedAddressId}
          className="btn-accent text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Continue to Review
          <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

/* ─── Review Step ─── */
interface ReviewStepProps {
  items: Array<{ _id: string; name: string; price: number; quantity: number; image?: string; category?: string }>
  selectedAddress: {
    label?: string
    name: string
    street: string
    city: string
    province?: string
    postalCode: string
    country: string
    phone?: string
  }
  shipping: number
  tax: number
  taxEnabled: boolean
  taxRatePercent: number
  grandTotal: number
  totalPrice: number
  onBack: () => void
  onContinue: () => void
  isProcessing: boolean
}

function ReviewStep({
  items,
  selectedAddress,
  shipping,
  tax,
  taxEnabled,
  taxRatePercent,
  grandTotal,
  totalPrice,
  onBack,
  onContinue,
  isProcessing,
}: ReviewStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-foreground mb-6">Review Your Order</h2>

      {/* Delivery Address */}
      <div className="bg-card rounded-xl p-5 card-shadow mb-6">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <svg aria-hidden="true" className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Delivering To
        </h3>
        <p className="font-medium text-foreground">{selectedAddress.name}</p>
        <p className="text-sm text-muted-foreground">{selectedAddress.street}</p>
        <p className="text-sm text-muted-foreground">
          {selectedAddress.city}, {selectedAddress.province} {selectedAddress.postalCode}
        </p>
        <p className="text-sm text-muted-foreground">{selectedAddress.phone}</p>
      </div>

      {/* Items */}
      <div className="bg-card rounded-xl p-5 card-shadow mb-6">
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <svg aria-hidden="true" className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Items ({items.length})
        </h3>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item._id} className="flex gap-4">
              <div className="relative w-16 h-16 bg-secondary rounded-lg overflow-hidden shrink-0">
                <SmartImage src={item.image || '/images/spares.webp'} alt={item.name} fill sizes="64px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{item.name}</p>
                <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
              </div>
              <p className="font-semibold text-foreground whitespace-nowrap">
                R{(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Price Breakdown */}
      <div className="bg-card rounded-xl p-5 card-shadow mb-8">
        <div className="space-y-2">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>R{totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : `R${shipping.toFixed(2)}`}</span>
          </div>
        {taxEnabled && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tax ({taxRatePercent}%)</span>
            <span>R{tax.toFixed(2)}</span>
          </div>
        )}
          <div className="border-t border-border pt-2 mt-2">
            <div className="flex justify-between text-foreground">
              <span className="font-semibold text-lg">Total</span>
              <span className="font-bold text-xl">R{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2 w-full md:w-auto"
        >
          <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={isProcessing}
          className="btn-accent flex items-center justify-center gap-2 disabled:opacity-50 text-white w-full md:w-auto"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
              Creating Order...
            </>
          ) : (
            <>
              Continue to Payment
              <svg aria-hidden="true" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

/* ─── Order Sidebar ─── */
interface OrderSidebarProps {
  items: Array<{ _id: string; name: string; price: number; quantity: number; image?: string }>
  totalPrice: number
  shipping: number
  tax: number
  taxEnabled: boolean
  taxRatePercent: number
  grandTotal: number
}

function OrderSidebar({ items, totalPrice, shipping, tax, taxEnabled, taxRatePercent, grandTotal }: OrderSidebarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="bg-card rounded-xl p-6 card-shadow sticky top-24"
    >
      <h3 className="font-semibold text-lg text-foreground mb-4">Order Summary</h3>

      <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
        {items.map((item) => (
          <div key={item._id} className="flex gap-3">
            <div className="relative w-12 h-12 bg-secondary rounded-lg overflow-hidden shrink-0">
              <SmartImage src={item.image || '/images/spares.webp'} alt={item.name} fill sizes="48px" className="object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              <p className="text-xs text-muted-foreground">x{item.quantity}</p>
            </div>
            <p className="text-sm font-semibold text-foreground whitespace-nowrap">
              R{(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>R{totalPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Shipping</span>
          <span>{shipping === 0 ? 'Free' : `R${shipping.toFixed(2)}`}</span>
        </div>
        {taxEnabled && (
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Tax ({taxRatePercent}%)</span>
            <span>R{tax.toFixed(2)}</span>
          </div>
        )}
        <div className="border-t border-border pt-2 mt-2">
          <div className="flex justify-between text-foreground">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-lg">R{grandTotal.toFixed(2)}</span>
</div>
</div>
</div>

<Link href="/cart" className="block mt-4 text-center text-sm text-accent hover:underline">
        ← Edit Cart
      </Link>
    </motion.div>
  )
}
