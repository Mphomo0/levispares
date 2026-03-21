'use client'

import { useEffect, useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { products, categories } from '@/lib/products'
import { useUser } from '@clerk/nextjs'

export default function SeedData() {
  const seed = useMutation((api as any).products.seed)
  const setAdmin = useMutation((api as any).users.setAdmin)
  const { user } = useUser()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    async function runSeed() {
      if (status !== 'idle') return
      setStatus('loading')
      try {
        await seed({ products, categories })
        setStatus('success')
      } catch (error) {
        console.error('Seeding failed:', error)
        setStatus('error')
      }
    }
    runSeed()
  }, [seed, status])

  const handleMakeAdmin = async () => {
    if (!user) return
    try {
      await setAdmin({ clerkId: user.id })
      alert('You have been marked as admin in Convex. Note: You still need to set "role": "admin" in Clerk Public Metadata for the middleware to pick it up.')
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="p-4 border rounded shadow-sm bg-white fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <h3 className="font-bold">Database Seeding</h3>
      <p className="text-sm">Status: {status}</p>
      {status === 'success' && <p className="text-green-500 text-xs">Seeding complete!</p>}
      
      <button 
        onClick={handleMakeAdmin}
        className="bg-accent text-white px-3 py-1 rounded text-xs font-medium hover:brightness-110"
      >
        Make Me Admin
      </button>
    </div>
  )
}
