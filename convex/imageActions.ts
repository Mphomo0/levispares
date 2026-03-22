import { action } from "./_generated/server"
import { v } from "convex/values"

function extractFileIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/")
    const fileName = pathParts[pathParts.length - 1]
    const fileId = fileName.split(".")[0]
    return fileId || null
  } catch {
    return null
  }
}

async function imageKitApiCall(fileId: string, actionType: "delete" | "purge", purgeUrl?: string): Promise<boolean> {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
    if (!privateKey) {
      console.error("IMAGEKIT_PRIVATE_KEY is not set")
      return false
    }
    const auth = btoa(`${privateKey}:`)
    
    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
    }
    
    let url = `https://api.imagekit.io/v1/files/${fileId}`
    let method = "DELETE"
    let body: string | undefined
    
    if (actionType === "purge") {
      headers["Content-Type"] = "application/json"
      method = "POST"
      body = JSON.stringify({ url: purgeUrl })
      url = `https://api.imagekit.io/v1/files/purge`
    }
    
    const response = await fetch(url, {
      method,
      headers,
      body,
    })

    if (response.ok) {
      return true
    }

    if (response.status === 404) {
      console.warn(`File not found in ImageKit: ${fileId}`)
      return false // Return false so fallback can try finding real fileId
    }

    const errorText = await response.text()
    console.error(`ImageKit API error (${response.status}):`, errorText)
    return false
  } catch (error) {
    console.error("Failed to call ImageKit API:", error)
    return false
  }
}

async function getFileIdByUrl(url: string): Promise<string | null> {
  try {
    const urlObj = new URL(url)
    // ImageKit URLs are typically like: https://ik.imagekit.io/your_id/path/to/file.jpg
    // Or with transformations: https://ik.imagekit.io/your_id/tr:w-500/path/to/file.jpg
    // We want to extract the original path without transformations
    let pathname = urlObj.pathname
    
    // Remove transformation prefixes like tr:xxx
    pathname = pathname.replace(/\/tr:[^/]+/g, '')
    
    const pathParts = pathname.split("/")
    // pathParts[0] is "", pathParts[1] is the ImageKit ID (xxx)
    const path = pathParts.slice(2).join("/")

    if (!path) return null

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY
    if (!privateKey) {
      console.error("IMAGEKIT_PRIVATE_KEY is not set")
      return null
    }
    const auth = btoa(`${privateKey}:`)

    // Use the list endpoint with type filter and search query
    const filename = path.split('/').pop() || ''
    
    // Try to find the file by listing files in the directory and matching the filename
    const dirPath = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
    
    const listUrl = dirPath 
      ? `https://api.imagekit.io/v1/files?path=/${dirPath}&type=file`
      : `https://api.imagekit.io/v1/files?type=file`

    const response = await fetch(listUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    })

    if (response.ok) {
      const files = await response.json()
      if (Array.isArray(files)) {
        // Find the file that matches our URL
        for (const file of files) {
          if (file.url === url || file.name === filename) {
            return file.fileId
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error("Failed to get fileId by URL:", error)
    return null
  }
}

export async function deleteImageHelper(url: string): Promise<boolean> {
  if (!url || !url.includes("ik.imagekit.io")) {
    console.log("Invalid ImageKit URL:", url)
    return false
  }

  // First attempt: extract fileId from URL (works if fileId is the filename)
  let fileId = extractFileIdFromUrl(url)
  
  // Try to delete with extracted fileId
  if (fileId) {
    const success = await imageKitApiCall(fileId, "delete")
    if (success) return true
  }

  // Second attempt: find real fileId by searching with path
  console.log("Attempting to find fileId by path for:", url)
  fileId = await getFileIdByUrl(url)
  if (fileId) {
    console.log("Found real fileId:", fileId)
    return await imageKitApiCall(fileId, "delete")
  }

  return false
}

export const deleteImage = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const success = await deleteImageHelper(args.url)
    return { success }
  },
})

export const deleteImageByFileId = action({
  args: { fileId: v.string() },
  handler: async (ctx, args) => {
    try {
      const success = await imageKitApiCall(args.fileId, "delete")
      return { success }
    } catch (error) {
      console.error("Failed to delete image by fileId:", error)
      return { success: false }
    }
  },
})

export const deleteImages = action({
  args: { urls: v.array(v.string()) },
  handler: async (ctx, args) => {
    let deleted = 0
    let failed = 0

    for (const url of args.urls) {
      const success = await deleteImageHelper(url)
      if (success) {
        deleted++
      } else {
        failed++
      }
    }

    return { deleted, failed }
  },
})

export const purgeImageFromCache = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    if (!args.url) return { success: false }

    try {
      const success = await imageKitApiCall("", "purge", args.url)
      return { success }
    } catch (error) {
      console.error("Failed to purge ImageKit cache:", error)
      return { success: false }
    }
  },
})
