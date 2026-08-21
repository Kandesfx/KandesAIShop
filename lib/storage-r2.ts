/**
 * Cloudflare R2 Storage Service — Kandes.shop
 * 
 * Quản lý kho lưu trữ tệp tin (hình ảnh, video, tài liệu) không giới hạn băng thông qua Cloudflare R2.
 */

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { env } from '@/lib/env'

export interface UploadResult {
  key: string
  url: string
  size: number
  contentType: string
  filename: string
}

export interface R2FileItem {
  key: string
  url: string
  size: number
  lastModified?: Date
  filename: string
  fileType: 'image' | 'video' | 'audio' | 'document' | 'other'
}

let _r2Client: S3Client | null = null

export function getR2Client(): S3Client {
  if (_r2Client) return _r2Client

  const accountId = env.R2_ACCOUNT_ID || process.env.R2_ACCOUNT_ID
  const accessKeyId = env.R2_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 chưa được cấu hình: Thiếu R2_ACCOUNT_ID, R2_ACCESS_KEY_ID hoặc R2_SECRET_ACCESS_KEY')
  }

  _r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return _r2Client
}

export function getR2BucketName(): string {
  return env.R2_BUCKET_NAME || env.R2_BUCKET || process.env.R2_BUCKET_NAME || process.env.R2_BUCKET || 'kandes-assets'
}

export function getR2PublicUrl(): string {
  const url = env.R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || 'https://pub-a09dd25ae7cb4460a662ce4ec5868d17.r2.dev'
  return url.replace(/\/$/, '')
}

/**
 * Phân loại định dạng tệp tin dựa vào phần mở rộng
 */
export function getFileType(filename: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico', 'avif'].includes(ext)) {
    return 'image'
  }
  if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext)) {
    return 'video'
  }
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return 'audio'
  }
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'zip', 'rar', '7z', 'json'].includes(ext)) {
    return 'document'
  }
  return 'other'
}

/**
 * Tải file lên Cloudflare R2
 */
export async function uploadToR2({
  buffer,
  filename,
  contentType,
  folder = 'uploads',
}: {
  buffer: Buffer
  filename: string
  contentType?: string
  folder?: string
}): Promise<UploadResult> {
  const client = getR2Client()
  const bucket = getR2BucketName()
  const publicBaseUrl = getR2PublicUrl()

  // Clean filename: remove special chars, keep extension
  const parts = filename.split('.')
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() : ''
  const baseName = parts.join('.')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'file'

  const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '/') // vd: 2026/08
  const uniqueSuffix = Math.random().toString(36).substring(2, 8)
  const finalFilename = ext ? `${baseName}-${uniqueSuffix}.${ext}` : `${baseName}-${uniqueSuffix}`
  const key = folder ? `${folder}/${datePrefix}/${finalFilename}` : `${datePrefix}/${finalFilename}`

  const resolvedContentType = contentType || getMimeType(ext || '') || 'application/octet-stream'

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: resolvedContentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

  const url = `${publicBaseUrl}/${key}`

  return {
    key,
    url,
    size: buffer.length,
    contentType: resolvedContentType,
    filename: finalFilename,
  }
}

/**
 * Liệt kê danh sách file trong R2 bucket
 */
export async function listR2Files({
  prefix,
  limit = 100,
}: {
  prefix?: string
  limit?: number
} = {}): Promise<R2FileItem[]> {
  const client = getR2Client()
  const bucket = getR2BucketName()
  const publicBaseUrl = getR2PublicUrl()

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      MaxKeys: limit,
    })
  )

  const contents = response.Contents || []

  return contents
    .filter((item) => Boolean(item.Key && !item.Key.endsWith('/')))
    .map((item) => {
      const key = item.Key!
      const filename = key.split('/').pop() || key
      return {
        key,
        url: `${publicBaseUrl}/${key}`,
        size: item.Size || 0,
        lastModified: item.LastModified,
        filename,
        fileType: getFileType(filename),
      }
    })
    .sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0))
}

/**
 * Xóa một file khỏi R2
 */
export async function deleteFromR2(key: string): Promise<boolean> {
  const client = getR2Client()
  const bucket = getR2BucketName()

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  )

  return true
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    gif: 'image/gif',
    avif: 'image/avif',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mov: 'video/quicktime',
    pdf: 'application/pdf',
    zip: 'application/zip',
    json: 'application/json',
    txt: 'text/plain',
  }
  return map[ext] || 'application/octet-stream'
}
