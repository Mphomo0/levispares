const IMAGEKIT_URL_ENDPOINT = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY!

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

async function imageKitApiCall(fileId: string, action: "delete" | "purge"): Promise<boolean> {
  try {
    const auth = btoa(`${IMAGEKIT_PRIVATE_KEY}:`)
    
    const response = await fetch(`https://api.imagekit.io/v1/files/${fileId}/${action}`, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
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

export async function deleteImage(url: string): Promise<boolean> {
  if (!url || !url.includes("ik.imagekit.io")) {
    return false
  }

  const fileId = extractFileIdFromUrl(url)
  if (!fileId) {
    console.warn("Could not extract file ID from URL:", url)
    return false
  }

  return await imageKitApiCall(fileId, "delete")
}

export async function deleteImages(urls: string[]): Promise<{ deleted: number; failed: number }> {
  let deleted = 0
  let failed = 0

  for (const url of urls) {
    const success = await deleteImage(url)
    if (success) {
      deleted++
    } else {
      failed++
    }
  }

  return { deleted, failed }
}

export async function purgeImageFromCache(url: string): Promise<boolean> {
  if (!url) return false

  try {
    const auth = btoa(`${IMAGEKIT_PRIVATE_KEY}:`)
    
    const response = await fetch("https://api.imagekit.io/v1/files/purge", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    })

    return response.ok
  } catch (error) {
    console.error("Failed to purge ImageKit cache:", error)
    return false
  }
}
