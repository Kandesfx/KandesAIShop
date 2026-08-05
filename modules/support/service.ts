/**
 * Support ticket service — P7-05.
 *
 * Ticket lifecycle: OPEN → IN_PROGRESS → RESOLVED / CLOSED
 * Uses existing schema from P4-11 (SupportTicket + SupportMessage).
 *
 * Priority: low / normal / high / urgent
 * Category: order, payment, delivery, ai_key, technical, refund, account, other
 *
 * SLA: first response within 24h (logged, not enforced).
 */

import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import { serialize } from '@/lib/serialize'
import type { CreateTicketInput, ReplyTicketInput } from './validators'

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type TicketCategory = 'order' | 'payment' | 'delivery' | 'ai_key' | 'technical' | 'refund' | 'account' | 'other'

export type TicketView = Awaited<ReturnType<typeof db.supportTicket.findUnique>> &
  Awaited<ReturnType<typeof db.supportTicket.findUnique>> extends infer T | null
  ? T extends { user?: { name: string | null; email: string | null } | null }
    ? T
    : never
  : never

/** Generate unique ticket number. */
function generateTicketNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `KDSS-${date}-${random}`
}

/** Create a new support ticket (user-facing). */
export async function createTicket(
  userId: string,
  input: CreateTicketInput
): Promise<{ ticketId: string; ticketNumber: string }> {
  const ticket = await db.supportTicket.create({
    data: {
      ticketNumber: generateTicketNumber(),
      userId,
      subject: input.subject,
      category: input.category,
      priority: input.priority,
      orderId: input.orderId ?? null,
      status: 'open',
    },
    select: { id: true, ticketNumber: true },
  })

  // First message is the ticket body
  await db.supportMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: userId,
      isAdmin: false,
      content: input.body,
    },
  })

  logger.info(
    { ticketId: ticket.id, ticketNumber: ticket.ticketNumber, userId, priority: input.priority },
    'support: ticket created'
  )

  return { ticketId: ticket.id, ticketNumber: ticket.ticketNumber }
}

/** List tickets (admin: all; user: own only). */
export async function listTickets(opts: {
  userId?: string
  userRole: string
  status?: TicketStatus
  priority?: TicketPriority
  category?: TicketCategory
  page?: number
  pageSize?: number
}): Promise<{ tickets: Awaited<ReturnType<typeof db.supportTicket.findMany>>; total: number }> {
  const page = Math.max(1, opts.page ?? 1)
  const pageSize = Math.min(100, opts.pageSize ?? 20)

  const where: Record<string, unknown> = {}
  if (opts.status) where.status = opts.status
  if (opts.priority) where.priority = opts.priority
  if (opts.category) where.category = opts.category
  // Customers see only their own tickets
  if (opts.userRole === 'customer' && opts.userId) where.userId = opts.userId

  const [tickets, total] = await Promise.all([
    db.supportTicket.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.supportTicket.count({ where }),
  ])

  return { tickets: serialize(tickets) as never, total }
}

/** Get a single ticket with messages. */
export async function getTicketById(ticketId: string): Promise<{
  ticket: Awaited<ReturnType<typeof db.supportTicket.findUnique>>
  messages: Awaited<ReturnType<typeof db.supportMessage.findMany>>
} | null> {
  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      order: { select: { id: true, orderNumber: true } },
    },
  })
  if (!ticket) return null

  const messages = await db.supportMessage.findMany({
    where: { ticketId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  return { ticket: serialize(ticket) as never, messages: serialize(messages) as never }
}

/** User reply to ticket. */
export async function replyToTicket(
  ticketId: string,
  userId: string,
  input: ReplyTicketInput
): Promise<{ messageId: string }> {
  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) throw new Error('Ticket not found')

  const msg = await db.supportMessage.create({
    data: {
      ticketId,
      authorId: userId,
      isAdmin: false,
      content: input.body,
    },
  })

  // Reopen if was resolved or closed
  if (ticket.status === 'resolved' || ticket.status === 'closed') {
    await db.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'open' },
    })
  }

  logger.info({ ticketId, messageId: msg.id }, 'support: user replied')

  return { messageId: msg.id }
}

/** Admin reply to ticket (internal note optionally). */
export async function adminReplyToTicket(
  ticketId: string,
  adminId: string,
  input: ReplyTicketInput & { isInternal?: boolean }
): Promise<{ messageId: string }> {
  const ticket = await db.supportTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) throw new Error('Ticket not found')

  const msg = await db.supportMessage.create({
    data: {
      ticketId,
      authorId: adminId,
      isAdmin: true,
      content: input.body,
    },
  })

  // Set first_response_at if not set
  if (!ticket.assignedTo) {
    await db.supportTicket.update({
      where: { id: ticketId },
      data: {
        assignedTo: adminId,
        status: 'in_progress',
      },
    })
  }

  logger.info({ ticketId, messageId: msg.id, adminId }, 'support: admin replied')

  return { messageId: msg.id }
}

/** Close a ticket (admin). */
export async function closeTicket(ticketId: string): Promise<void> {
  await db.supportTicket.update({
    where: { id: ticketId },
    data: { status: 'closed', closedAt: new Date() },
  })
  logger.info({ ticketId }, 'support: ticket closed')
}