import { NextRequest, NextResponse } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getR2Client, getR2BucketName } from '@/lib/storage-r2'

export const dynamic = 'force-dynamic'

/**
 * GET /api/media/[...key] — Media Proxy & Streamer
 * Streams media directly from Cloudflare R2 if client cannot access r2.dev domain directly.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { key: string[] } }
) {
  try {
    const key = params.key.join('/')
    if (!key) {
      return new NextResponse('Key not found', { status: 400 })
    }

    const client = getR2Client()
    const bucket = getR2BucketName()

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })

    const response = await client.send(command)

    if (!response.Body) {
      return new NextResponse('File body empty', { status: 404 })
    }

    const contentType = response.ContentType || 'application/octet-stream'
    const headers = new Headers()
    headers.set('Content-Type', contentType)
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    if (response.ContentLength) {
      headers.set('Content-Length', response.ContentLength.toString())
    }

    // Convert AWS SDK Stream to Web ReadableStream
    const stream = response.Body.transformToWebStream()
    return new NextResponse(stream, {
      status: 200,
      headers,
    })
  } catch (err) {
    return new NextResponse('Media not found', { status: 404 })
  }
}
