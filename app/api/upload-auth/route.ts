import { getUploadAuthParams } from "@imagekit/next/server"
import { auth } from "@clerk/nextjs/server"

export async function GET() {
  const { userId, sessionClaims } = await auth()

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role =
    (sessionClaims?.metadata as { role?: string })?.role ||
    (sessionClaims as { publicMetadata?: { role?: string } })?.publicMetadata?.role
  if (role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { token, expire, signature } = getUploadAuthParams({
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string,
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY as string,
  })

  return Response.json({
    token,
    expire,
    signature,
    publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
  })
}
