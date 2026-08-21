import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { NotFoundError } from '@/lib/errors'
import { sendEmail, contactReceiptEmail, adminNewContactAlertEmail } from '@/lib/email'
import type { ContactStatus, ContactSubmissionView, CreateContactInput } from './types'

export const contactService = {
  /** Public — submit form. */
  async create(input: CreateContactInput): Promise<{ id: string }> {
    const row = await db.contactSubmission.create({
      data: {
        name: input.name,
        email: input.email,
        phone: input.phone ?? null,
        subject: input.subject,
        message: input.message,
        category: input.category ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        status: 'new',
      },
      select: { id: true },
    })

    // 1. Gửi email biên nhận xác nhận cho khách hàng
    try {
      const receiptTpl = contactReceiptEmail({
        customerName: input.name,
        subject: input.subject,
        message: input.message,
        ticketId: row.id.slice(-6).toUpperCase(),
      })
      void sendEmail({
        to: input.email,
        subject: receiptTpl.subject,
        html: receiptTpl.html,
        text: receiptTpl.text,
      }).catch((err) => {
        logger.error({ err, email: input.email }, 'Failed to send contact receipt email to customer')
      })
    } catch (err) {
      logger.error({ err }, 'Failed to prepare contact receipt email')
    }

    // 2. Gửi email thông báo cảnh báo cho Admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM_ADDRESS || 'contact@kandes.shop'
    try {
      const adminAlertTpl = adminNewContactAlertEmail({
        customerName: input.name,
        customerEmail: input.email,
        customerPhone: input.phone,
        subject: input.subject,
        message: input.message,
        submissionId: row.id,
      })
      void sendEmail({
        to: adminEmail,
        subject: adminAlertTpl.subject,
        html: adminAlertTpl.html,
        text: adminAlertTpl.text,
      }).catch((err) => {
        logger.error({ err, adminEmail }, 'Failed to send contact alert email to admin')
      })
    } catch (err) {
      logger.error({ err }, 'Failed to prepare admin contact alert email')
    }

    // Audit log (system event, no PII content)
    try {
      await db.auditLog.create({
        data: {
          actorType: 'anonymous',
          action: 'contact.submitted',
          resourceType: 'contact_submission',
          resourceId: row.id,
          ipAddress: input.ipAddress ?? null,
          payload: { emailDomain: input.email.split('@')[1] ?? null },
        },
      })
    } catch {
      // Audit fail không block — best-effort
    }

    logger.info(
      {
        id: row.id,
        emailDomain: input.email.split('@')[1] ?? null,
      },
      'contact: submission created'
    )
    return { id: row.id }
  },

  /** Admin list with filters. */
  async listAdmin(opts: {
    page: number
    limit: number
    status?: ContactStatus
  }): Promise<{ items: ContactSubmissionView[]; total: number; hasMore: boolean }> {
    const where: Record<string, unknown> = {}
    if (opts.status) where.status = opts.status
    const [rows, total] = await Promise.all([
      db.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (opts.page - 1) * opts.limit,
        take: opts.limit,
      }),
      db.contactSubmission.count({ where }),
    ])
    return {
      items: rows.map(toView),
      total,
      hasMore: opts.page * opts.limit < total,
    }
  },

  async getById(id: string): Promise<ContactSubmissionView> {
    const row = await db.contactSubmission.findUnique({ where: { id } })
    if (!row) throw new NotFoundError('Contact submission not found')
    return toView(row)
  },

  async updateStatus(
    id: string,
    status: ContactStatus,
    internalNotes?: string
  ): Promise<ContactSubmissionView> {
    const existing = await db.contactSubmission.findUnique({ where: { id }, select: { id: true } })
    if (!existing) throw new NotFoundError('Contact submission not found')
    const row = await db.contactSubmission.update({
      where: { id },
      data: {
        status,
        internalNotes: internalNotes ?? undefined,
      },
    })
    return toView(row)
  },
}

function toView(row: {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  category: string | null
  status: string
  ipAddress: string | null
  userAgent: string | null
  internalNotes: string | null
  assignedTo: string | null
  createdAt: Date
  updatedAt: Date
}): ContactSubmissionView {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    category: row.category,
    status: row.status as ContactStatus,
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    internalNotes: row.internalNotes,
    assignedTo: row.assignedTo,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}
