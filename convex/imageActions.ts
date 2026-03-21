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
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY!
    const auth = btoa(`${privateKey}:`)
    
    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
    }
    
    let url = `https://api.imagekit.io/v1/files/${fileId}/${actionType}`
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
      return true
    }

    const errorText = await response.text()
    console.error(`ImageKit API error (${response.status}):`, errorText)
    return false
  } catch (error) {
    console.error("Failed to call ImageKit API:", error)
    return false
  }
}

export async function deleteImageHelper(url: string): Promise<boolean> {
  if (!url || !url.includes("ik.imagekit.io")) {
    console.log("Invalid ImageKit URL:", url)
    return false
  }

  const fileId = extractFileIdFromUrl(url)
  if (!fileId) {
    console.log("Could not extract file ID from URL:", url)
    return false
  }

  console.log("Deleting ImageKit file:", fileId)
  return await imageKitApiCall(fileId, "delete")
}

export const deleteImage = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const success = await deleteImageHelper(args.url)
    return { success }
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
