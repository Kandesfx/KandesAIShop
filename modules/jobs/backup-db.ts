/**
 * Database backup job — P7-04.
 *
 * Cron: runs daily via Vercel Cron (POST /api/cron/db-backup).
 * Flow:
 *   1. pg_dump (Postgres) -> compressed custom format
 *   2. Upload to S3 (AWS SDK v3)
 *   3. Prune old backups exceeding retention (30-day default)
 *   4. Notify admin on failure
 *
 * Requires env:
 *   - AWS_ACCESS_KEY_ID
 *   - AWS_SECRET_ACCESS_KEY
 *   - AWS_REGION
 *   - S3_BUCKET
 *   - BACKUP_RETENTION_DAYS (default 30)
 *
 * Out of scope: S3 lifecycle rule (configure on S3 console).
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { logger } from '@/lib/logger'
import { notify } from '@/modules/notification'

export type BackupResult = {
  ok: boolean
  uploadedKey?: string | null
  sizeBytes?: number
  prunedCount?: number
  error?: string
}

const BACKUP_PREFIX = 'kandes-db-backup/'
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS ?? '30', 10)

export async function runBackup(): Promise<BackupResult> {
  const now = new Date()
  const timestamp = now.toISOString().replace(/[:.]/g, '-')
  const filename = `kandes-${timestamp}.sql.gz`
  const s3Key = `${BACKUP_PREFIX}${filename}`

  const s3Configured =
    Boolean(process.env.AWS_ACCESS_KEY_ID) &&
    Boolean(process.env.AWS_SECRET_ACCESS_KEY) &&
    Boolean(process.env.S3_BUCKET)

  if (!s3Configured) {
    logger.warn('backup: S3 not configured, skipping S3 upload')
    return { ok: true, uploadedKey: null }
  }

  // pg_dump
  let dumpBuffer: Buffer
  try {
    const { spawn } = await import('child_process')
    const pgDump = spawn(
      process.env.PG_DUMP_PATH ?? 'pg_dump',
      [
        '--dbname',
        process.env.DATABASE_URL ?? 'postgresql://localhost/kandes_shop',
        '--format=custom',
        '--compress=6',
        '--no-owner',
        '--no-acl',
      ],
      { shell: true }
    )

    dumpBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = []
      pgDump.stdout.on('data', (c: Buffer) => chunks.push(c))
      pgDump.on('error', reject)
      pgDump.on('close', (code: number | null) => {
        if (code === 0) resolve(Buffer.concat(chunks))
        else reject(new Error(`pg_dump exited with code ${code}`))
      })
    })
  } catch (err) {
    const msg = `pg_dump failed: ${(err as Error).message}`
    logger.error({ err: msg }, 'backup: pg_dump failed')
    await sendBackupFailure(msg)
    return { ok: false, error: msg }
  }

  // Upload to S3
  try {
    const s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: s3Key,
        Body: dumpBuffer,
        ContentType: 'application/x-gzip',
        Metadata: {
          'backup-timestamp': now.toISOString(),
          'created-by': 'kandes-cron',
        },
        StorageClass: 'STANDARD',
      })
    )
    logger.info({ s3Key, sizeBytes: dumpBuffer.length }, 'backup: uploaded')
  } catch (err) {
    const msg = `S3 upload failed: ${(err as Error).message}`
    logger.error({ err: msg }, 'backup: S3 upload failed')
    await sendBackupFailure(msg)
    return { ok: false, error: msg }
  }

  // Prune old backups
  let prunedCount = 0
  try {
    const cutoff = new Date(now.getTime() - RETENTION_DAYS * 86_400_000)
    const s3 = new S3Client({
      region: process.env.AWS_REGION ?? 'ap-southeast-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
    const listResp = await s3.send(
      new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET!, Prefix: BACKUP_PREFIX })
    )
    for (const obj of listResp.Contents ?? []) {
      if (obj.Key && obj.LastModified && obj.LastModified < cutoff) {
        await s3.send(
          new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET!, Key: obj.Key })
        )
        prunedCount++
      }
    }
    if (prunedCount > 0) {
      logger.info({ prunedCount }, 'backup: pruned old backups')
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'backup: prune step failed (non-fatal)')
  }

  return { ok: true, uploadedKey: s3Key, sizeBytes: dumpBuffer.length, prunedCount }
}

async function sendBackupFailure(error: string): Promise<void> {
  try {
    await notify({
      event: 'order.created',
      recipient: { email: 'admin@kandes.shop' },
      data: {
        orderNumber: 'BACKUP-FAIL',
        totalCents: '0',
        currency: 'USD',
        items: [],
        reason: `[Kandes] Database backup failed: ${error}`,
      },
    })
  } catch {
    // non-fatal
  }
}

export const dbBackupJob = { runBackup }