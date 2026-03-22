const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY

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

async function imageKitApiCall(fileId: string): Promise<boolean> {
  try {
    if (!IMAGEKIT_PRIVATE_KEY) {
      console.error("IMAGEKIT_PRIVATE_KEY is not set")
      return false
    }
    const auth = btoa(`${IMAGEKIT_PRIVATE_KEY}:`)
    
    const url = `https://api.imagekit.io/v1/files/${fileId}`
    const method = "DELETE"
    
    const response = await fetch(url, {
      method,
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
      return false
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
    if (!IMAGEKIT_PRIVATE_KEY) {
      console.error("IMAGEKIT_PRIVATE_KEY is not set")
      return null
    }
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/")
    const path = pathParts.slice(2).join("/")

    if (!path) return null

    // Try both with and without leading slash, as ImageKit may store path with leading slash
    const pathsToTry = [path]
    if (!path.startsWith("/")) {
      pathsToTry.unshift(`/${path}`)
    }

    const auth = btoa(`${IMAGEKIT_PRIVATE_KEY}:`)

    for (const p of pathsToTry) {
      const response = await fetch(`https://api.imagekit.io/v1/files?path=${encodeURIComponent(p)}`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      })

      if (response.ok) {
        const files = await response.json()
        if (Array.isArray(files) && files.length > 0) {
          return files[0].fileId
        }
      }
    }

    return null
  } catch (error) {
    console.error("Failed to get fileId by URL:", error)
    return null
  }
}

export async function deleteImage(url: string): Promise<boolean> {
  if (!url || !url.includes("ik.imagekit.io")) {
    return false
  }

  // First attempt: extract fileId from URL
  let fileId = extractFileIdFromUrl(url)
  
  if (fileId) {
    const success = await imageKitApiCall(fileId)
    if (success) return true
  }

  // Second attempt: find real fileId by searching with path
  fileId = await getFileIdByUrl(url)
  if (fileId) {
    return await imageKitApiCall(fileId)
  }

  return false
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
