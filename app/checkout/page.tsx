'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { useUser } from '@clerk/nextjs'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useCart } from '@/lib/CartContext'
import { toast } from 'sonner'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import type { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'

const STEPS = ['Address', 'Review', 'Payment'] as const
type Step = (typeof STEPS)[number]

const emptyAddressForm = {
  label: 'Home' as string,
  name: '',
  street: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'South Africa',
  phone: '',
  isDefault: false,
}

export default function CheckoutPage() {
  const router = useRouter()
  const { user, isLoaded: isUserLoaded } = useUser()
  const { items, totalPrice, clearCart } = useCart()
  const addresses = useQuery(
    api.addresses.listByUser,
    user?.id ? { userId: user.id as Id<'users'> } : 'skip'
  )
  const addAddress = useMutation(api.addresses.add)
  const createOrder = useMutation(api.orders.create)
  const storeSettings = useQuery(api.settings.get)
  const taxEnabled = storeSettings?.taxEnabled ?? false
  const taxRatePercent = storeSettings?.taxRate ?? 0
  const shippingRateSetting = storeSettings?.shippingRate ?? 250
  const freeShippingThreshold = storeSettings?.freeShippingThreshold ?? 750

  const [currentStep, setCurrentStep] = useState<Step>('Address')
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [addressForm, setAddressForm] = useState(emptyAddressForm)
  const [savingAddress, setSavingAddress] = useState(false)
  const [convexOrderId, setConvexOrderId] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const shipping = totalPrice >= freeShippingThreshold ? 0 : shippingRateSetting
  const tax = taxEnabled ? totalPrice * (taxRatePercent / 100) : 0
  const grandTotal = totalPrice + shipping + tax

  // Redirect if cart is empty or not logged in
  useEffect(() => {
    if (isUserLoaded && !user) {
      router.push('/login')
    }
  }, [isUserLoaded, user, router])

  useEffect(() => {
    if (items.length === 0 && isUserLoaded) {
      router.push('/cart')
    }
  }, [items.length, isUserLoaded, router])

  // Auto-select default address
  useEffect(() => {
    if (addresses && addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.isDefault)
      setSelectedAddressId(defaultAddr?._id ?? addresses[0]._id)
    }
  }, [addresses, selectedAddressId])

  // Show add form automatically if no addresses
  useEffect(() => {
    if (addresses && addresses.length === 0) {
      setShowAddForm(true)
    }
  }, [addresses])

  const selectedAddress = addresses?.find((a) => a._id === selectedAddressId)

  const handleSaveAddress = async () => {
    if (!user?.id) return
    const { name, street, city, province, postalCode, phone } = addressForm
    if (!name.trim() || !street.trim() || !city.trim() || !province.trim() || !postalCode.trim() || !phone.trim()) {
      toast.error('Please fill in all required fields.')
      return
    }
    setSavingAddress(true)
    try {
      const newId = await addAddress({
        userId: user.id as Id<'users'>,
        type: 'shipping' as const,
        ...addressForm,
        isDefault: (addresses?.length ?? 0) === 0,
      })
      setSelectedAddressId(newId)
      setShowAddForm(false)
      setAddressForm(emptyAddressForm)
      toast.success('Address saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save address')
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
      const orderId = await createOrder({
        userId: user.id as Id<'users'>,
        items: items.map((item) => ({
          productId: item._id as Id<'products'>,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          sku: '',
        })),
        shippingAddressId: selectedAddress._id as Id<'addresses'>,
        subtotal: totalPrice,
        shipping,
        tax,
        total: grandTotal,
      })
      setConvexOrderId(orderId)
      setCurrentStep('Payment')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order')
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
                  className={`flex items-center gap-2 transition-all ${
                    i <= stepIndex
                      ? 'text-primary-foreground'
                      : 'text-primary-foreground/40'
                  } ${i < stepIndex ? 'cursor-pointer hover:text-accent' : ''}`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      i < stepIndex
                        ? 'bg-accent text-accent-foreground'
                        : i === stepIndex
                          ? 'bg-primary-foreground text-primary'
                          : 'bg-primary-foreground/20 text-primary-foreground/50'
                    }`}
                  >
                    {i < stepIndex ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  addressForm={addressForm}
                  onUpdateForm={setAddressForm}
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
                  items={items}
                  shipping={shipping}
                  tax={tax}
                  grandTotal={grandTotal}
                  convexOrderId={convexOrderId!}
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
            <OrderSidebar items={items} totalPrice={totalPrice} shipping={shipping} tax={tax} taxEnabled={taxEnabled} taxRatePercent={taxRatePercent} freeShippingThreshold={freeShippingThreshold} grandTotal={grandTotal} />
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
    label: string
    name: string
    street: string
    city: string
    province: string
    postalCode: string
    country: string
    phone: string
    isDefault: boolean
  }>
  selectedAddressId: string | null
  onSelectAddress: (id: string) => void
  showAddForm: boolean
  onToggleAddForm: (show: boolean) => void
  addressForm: typeof emptyAddressForm
  onUpdateForm: (form: typeof emptyAddressForm) => void
  onSaveAddress: () => void
  savingAddress: boolean
  onContinue: () => void
}

function AddressStep({
  addresses,
  selectedAddressId,
  onSelectAddress,
  showAddForm,
  onToggleAddForm,
  addressForm,
  onUpdateForm,
  onSaveAddress,
  savingAddress,
  onContinue,
}: AddressStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-foreground mb-6">Delivery Address</h2>

      {/* Existing Addresses */}
      {addresses.length > 0 && (
        <div className="space-y-3 mb-6">
          {addresses.map((addr) => (
            <label
              key={addr._id}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
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

      {/* Add New Address */}
      {!showAddForm && addresses.length < 3 && (
        <button
          onClick={() => onToggleAddForm(true)}
          className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-accent/40 transition-colors text-muted-foreground hover:text-accent flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Address
        </button>
      )}

      {/* Inline Address Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-card rounded-xl p-6 card-shadow mb-6"
        >
          <h3 className="font-semibold text-lg text-foreground mb-4">New Address</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Label</label>
              <select
                value={addressForm.label}
                onChange={(e) => onUpdateForm({ ...addressForm, label: e.target.value })}
                className="input-styled"
              >
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
              <input
                type="text"
                value={addressForm.name}
                onChange={(e) => onUpdateForm({ ...addressForm, name: e.target.value })}
                placeholder="Full name"
                className="input-styled"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground mb-1">Street Address *</label>
            <input
              type="text"
              value={addressForm.street}
              onChange={(e) => onUpdateForm({ ...addressForm, street: e.target.value })}
              placeholder="123 Main Street, Apt 4B"
              className="input-styled"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">City *</label>
              <input
                type="text"
                value={addressForm.city}
                onChange={(e) => onUpdateForm({ ...addressForm, city: e.target.value })}
                placeholder="Johannesburg"
                className="input-styled"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Province *</label>
              <input
                type="text"
                value={addressForm.province}
                onChange={(e) => onUpdateForm({ ...addressForm, province: e.target.value })}
                placeholder="Gauteng"
                className="input-styled"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Postal Code *</label>
              <input
                type="text"
                value={addressForm.postalCode}
                onChange={(e) => onUpdateForm({ ...addressForm, postalCode: e.target.value })}
                placeholder="2000"
                className="input-styled"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone *</label>
              <input
                type="tel"
                value={addressForm.phone}
                onChange={(e) => onUpdateForm({ ...addressForm, phone: e.target.value })}
                placeholder="+27 12 345 6789"
                className="input-styled"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-foreground mb-1">Country</label>
            <input
              type="text"
              value={addressForm.country}
              onChange={(e) => onUpdateForm({ ...addressForm, country: e.target.value })}
              className="input-styled"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button
              onClick={onSaveAddress}
              disabled={savingAddress}
              className="btn-accent"
            >
              {savingAddress ? 'Saving...' : 'Save Address'}
            </button>
            {addresses.length > 0 && (
              <button
                onClick={() => onToggleAddForm(false)}
                className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </motion.div>
      )}

      {/* Continue Button */}
      <div className="mt-8">
        <button
          onClick={onContinue}
          disabled={!selectedAddressId}
          className="btn-accent w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          Continue to Review
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    </motion.div>
  )
}

/* ─── Review Step ─── */
interface ReviewStepProps {
  items: Array<{ _id: string; name: string; price: number; quantity: number; image: string; category: string }>
  selectedAddress: {
    label: string
    name: string
    street: string
    city: string
    province: string
    postalCode: string
    country: string
    phone: string
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
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Items ({items.length})
        </h3>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item._id} className="flex gap-4">
              <div className="w-16 h-16 bg-secondary rounded-lg overflow-hidden shrink-0">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
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
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={isProcessing}
          className="btn-accent flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-accent-foreground border-t-transparent rounded-full animate-spin" />
              Creating Order...
            </>
          ) : (
            <>
              Continue to Payment
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

/* ─── Payment Step ─── */
interface PaymentStepProps {
  items: Array<{ name: string; price: number; quantity: number }>
  shipping: number
  tax: number
  grandTotal: number
  convexOrderId: string
  onSuccess: () => void
  onBack: () => void
}

function PaymentStep({ items, shipping, tax, grandTotal, convexOrderId, onSuccess, onBack }: PaymentStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-foreground mb-2">Payment</h2>
      <p className="text-muted-foreground mb-6">
        Complete your payment securely with PayPal.
      </p>

      <div className="bg-card rounded-xl p-6 card-shadow mb-6">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none">
            <path d="M7.076 21.337H2.47a.641.641 0 01-.633-.74L4.944 2.78a.77.77 0 01.757-.644h5.554c2.098 0 3.632.496 4.559 1.475.434.458.718.96.863 1.533.152.6.187 1.315.103 2.126l-.013.097v.695l.542.306c.46.238.828.51 1.11.82.47.517.775 1.17.907 1.938.136.786.102 1.72-.098 2.774-.231 1.21-.607 2.264-1.117 3.133a6.45 6.45 0 01-1.81 2.025 6.06 6.06 0 01-2.355.996c-.844.189-1.785.283-2.797.283H10.3a.96.96 0 00-.948.82l-.043.243-.728 4.612-.033.174a.96.96 0 01-.949.82H7.076z" fill="#253B80"/>
            <path d="M19.252 7.912c-.015.097-.032.195-.052.296-.685 3.517-3.03 4.733-6.024 4.733H11.66a.741.741 0 00-.732.626l-.777 4.93-.22 1.396a.39.39 0 00.386.453h2.711a.65.65 0 00.642-.548l.027-.138.508-3.225.032-.178a.65.65 0 01.643-.548h.405c2.623 0 4.674-1.066 5.274-4.148.252-1.287.121-2.362-.543-3.118a2.596 2.596 0 00-.744-.548" fill="#179BD7"/>
            <path d="M18.375 7.548a5.472 5.472 0 00-.678-.15 8.655 8.655 0 00-1.374-.1h-4.17a.648.648 0 00-.642.548l-.887 5.626-.025.166a.741.741 0 01.732-.626h1.523c2.995 0 5.34-1.216 6.025-4.733.02-.104.037-.205.052-.303a3.603 3.603 0 00-.556-.239v-.189z" fill="#222D65"/>
          </svg>
          <div>
            <p className="font-semibold text-foreground">PayPal Checkout</p>
            <p className="text-sm text-muted-foreground">You&apos;ll be redirected to PayPal to complete payment</p>
          </div>
        </div>

        <PayPalScriptProvider
          options={{
            clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
            currency: 'ZAR',
            intent: 'capture',
          }}
        >
          <PayPalButtons
            style={{
              layout: 'vertical',
              color: 'gold',
              shape: 'rect',
              label: 'paypal',
              height: 50,
            }}
            createOrder={async () => {
              const response = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  items: items.map((item) => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                  })),
                  shipping,
                  tax,
                  totalAmount: grandTotal,
                }),
              })
              const data = await response.json()
              if (!response.ok) throw new Error(data.error)
              return data.id
            }}
            onApprove={async (data) => {
              const response = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  paypalOrderId: data.orderID,
                  convexOrderId,
                }),
              })
              const result = await response.json()
              if (!response.ok) {
                toast.error(result.error || 'Payment failed')
                return
              }
              toast.success('Payment successful!')
              onSuccess()
            }}
            onError={(err) => {
              console.error('PayPal error:', err)
              toast.error('Payment failed. Please try again.')
            }}
            onCancel={() => {
              toast('Payment cancelled', { description: 'You can try again when ready.' })
            }}
          />
        </PayPalScriptProvider>
      </div>

      <button
        onClick={onBack}
        className="px-6 py-3 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors flex items-center gap-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Review
      </button>
    </motion.div>
  )
}

/* ─── Order Sidebar ─── */
interface OrderSidebarProps {
  items: Array<{ _id: string; name: string; price: number; quantity: number; image: string }>
  totalPrice: number
  shipping: number
  tax: number
  taxEnabled: boolean
  taxRatePercent: number
  freeShippingThreshold: number
  grandTotal: number
}

function OrderSidebar({ items, totalPrice, shipping, tax, taxEnabled, taxRatePercent, freeShippingThreshold, grandTotal }: OrderSidebarProps) {
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
            <div className="w-12 h-12 bg-secondary rounded-lg overflow-hidden shrink-0">
              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
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

      <p className="text-center text-muted-foreground text-xs mt-4">
        Free shipping on orders over R{freeShippingThreshold.toFixed(2)}
      </p>

      <Link href="/cart" className="block mt-4 text-center text-sm text-accent hover:underline">
        ← Edit Cart
      </Link>
    </motion.div>
  )
}
