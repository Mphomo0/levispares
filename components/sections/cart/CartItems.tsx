'use client'

import { Trash2, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import { CartItem } from '@/lib/CartContext'
import SmartImage from '@/components/ui/SmartImage'

interface CartItemsProps {
  items: CartItem[]
  removeFromCart: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
}

const CartItems = ({ items, removeFromCart, updateQuantity }: CartItemsProps) => {

  return (
    <>
      {items.map((item) => (
        <div
          key={item._id}
          className="bg-card rounded-xl p-4 md:p-6 card-shadow flex flex-col sm:flex-row gap-4"
        >
          <Link
            href={`/products/${item._id}`}
            className="relative w-full sm:w-32 h-32 bg-secondary rounded-lg overflow-hidden shrink-0"
          >
            <SmartImage
              src={item.image || '/images/spares.webp'}
              alt={item.name}
              fill
              sizes="(min-width: 640px) 128px, 100vw"
              className="object-cover"
            />
          </Link>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-accent font-medium uppercase tracking-wide">
                  {item.category}
                </span>
                <Link
                  href={`/products/${item._id}`}
                  className="block font-semibold text-foreground text-lg hover:text-accent transition-colors"
                >
                  {item.name}
                </Link>
              </div>
              <button
                onClick={() => removeFromCart(item._id)}
                aria-label={`Remove ${item.name} from cart`}
                className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-auto pt-4 flex items-center justify-between">
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => updateQuantity(item._id, item.quantity - 1)}
                  aria-label={`Decrease quantity of ${item.name}`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center hover:bg-secondary transition-colors"
                >
                  <Minus className="w-4 h-4" aria-hidden="true" />
                </button>
                <span className="px-4 font-medium" aria-live="polite">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item._id, item.quantity + 1)}
                  disabled={item.stockQty !== undefined && item.quantity >= item.stockQty}
                  aria-label={`Increase quantity of ${item.name}`}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <span className="text-lg font-bold text-foreground">
                R{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export default CartItems
