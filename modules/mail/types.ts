/**
 * Mail Module — Multi-Alias Customer Email Inbox & Outbox
 */

export type EmailAliasId = 
  | 'support'
  | 'billing'
  | 'sales'
  | 'contact'
  | 'admin'
  | 'noreply'

export interface EmailAlias {
  id: EmailAliasId
  email: string
  name: string
  description: string
  color: string
  badgeBg: string
  badgeText: string
  defaultSignature: string
  quickTemplates: Array<{ title: string; subject: string; content: string }>
}

export type ThreadStatus = 'unread' | 'read' | 'replied' | 'archived' | 'spam'

export interface EmailMessage {
  id: string
  threadId: string
  direction: 'inbound' | 'outbound'
  fromEmail: string
  fromName: string
  toEmail: string
  toName?: string
  subject: string
  bodyHtml: string
  bodyText: string
  alias: string // e.g. 'support@kandes.shop'
  status: 'sent' | 'received' | 'failed'
  createdAt: string
  authorName?: string // For outbound replies (Admin/Staff name)
}

export interface EmailThread {
  id: string
  threadNumber: string
  subject: string
  customerEmail: string
  customerName: string
  alias: string // e.g. 'support@kandes.shop'
  status: ThreadStatus
  messageCount: number
  lastSnippet: string
  lastMessageAt: string
  createdAt: string
  updatedAt: string
  orderNumber?: string
  messages?: EmailMessage[]
}

export interface SendMailInput {
  threadId?: string
  aliasEmail: string
  toEmail: string
  toName?: string
  subject: string
  bodyHtml: string
  orderNumber?: string
}

export interface InboundMailInput {
  fromEmail: string
  fromName?: string
  toEmail: string
  subject: string
  bodyHtml?: string
  bodyText?: string
  headers?: Record<string, string>
}
