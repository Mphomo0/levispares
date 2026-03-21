'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { X, Upload, ImageIcon } from 'lucide-react'
import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from '@imagekit/next'

interface LogoUploadProps {
  value?: string
  onChange: (url: string | undefined) => void
  folder?: string
  label?: string
}

export default function LogoUpload({ value, onChange, folder = '/brands', label = 'Logo' }: LogoUploadProps) {
  const [preview, setPreview] = useState<string | undefined>(value)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const authenticator = async () => {
    const response = await fetch('/api/upload-auth')
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Auth failed: ${response.status}: ${errorText}`)
    }
    const data = await response.json()
    return data as { signature: string; expire: string; token: string; publicKey: string }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setProgress(0)

    try {
      const authParams = await authenticator()
      const { signature, expire, token, publicKey } = authParams

      const response = await upload({
        signature,
        expire: Number(expire),
        token,
        publicKey,
        file,
        fileName: file.name,
        folder,
        onProgress: (event) => {
          const pct = Math.round((event.loaded / event.total) * 100)
          setProgress(pct)
        },
      })

      if (response.url) {
        onChange(response.url)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      if (error instanceof ImageKitAbortError) {
        console.error('Upload aborted:', error.reason)
      } else if (error instanceof ImageKitInvalidRequestError) {
        console.error('Invalid request:', error.message)
      } else if (error instanceof ImageKitUploadNetworkError) {
        console.error('Network error:', error.message)
      } else if (error instanceof ImageKitServerError) {
        console.error('Server error:', error.message)
      }
      setPreview(value)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(undefined)
    onChange(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id="logo-upload"
      />
      
      {preview ? (
        <div className="relative w-32 h-32 rounded-lg border-2 border-dashed border-border overflow-hidden bg-muted">
          <img
            src={preview}
            alt="Logo preview"
            className="w-full h-full object-contain p-2"
          />
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="w-3/4 bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-orange-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor="logo-upload"
          className="flex flex-col items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-border bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
        >
          <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground">Upload</span>
        </label>
      )}
      
      <p className="text-sm text-muted-foreground">
        Recommended: Square image, PNG or JPG
      </p>
    </div>
  )
}
