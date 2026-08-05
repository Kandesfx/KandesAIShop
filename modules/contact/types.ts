export type ContactStatus = 'new' | 'in_progress' | 'resolved' | 'closed'

export interface ContactSubmissionView {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  category: string | null
  status: ContactStatus
  ipAddress: string | null
  userAgent: string | null
  internalNotes: string | null
  assignedTo: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateContactInput {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  category?: string
  ipAddress?: string
  userAgent?: string
}
