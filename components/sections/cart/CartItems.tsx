'use client'

import { Trash2, Minus, Plus } from 'lucide-react'
import Link from 'next/link'
import { CartItem } from '@/lib/CartContext'

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
          key={item.id}
          className="bg-card rounded-xl p-4 md:p-6 card-shadow flex flex-col sm:flex-row gap-4"
        >
          <Link
            href={`/product/${item.id}`}
            className="w-full sm:w-32 h-32 bg-secondary rounded-lg overflow-hidden shrink-0"
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </Link>

          <div className="flex-1 flex flex-col">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-accent font-medium uppercase tracking-wide">
                  {item.category}
                </span>
                <Link
                  href={`/product/${item.id}`}
                  className="block font-semibold text-foreground text-lg hover:text-accent transition-colors"
                >
                  {item.name}
                </Link>
              </div>
              <button
                onClick={() => removeFromCart(item.id)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-auto pt-4 flex items-center justify-between">
              <div className="flex items-center border border-border rounded-lg">
                <button
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="p-2 hover:bg-secondary transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="p-2 hover:bg-secondary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <span className="text-lg font-bold text-foreground">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}

export default CartItems
