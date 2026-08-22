import { db } from '@/lib/db'
import type { EmailThread, EmailMessage, ThreadStatus } from './types'
import { getAliasByEmail } from './aliases'

// In-memory cache + persistent store for rich thread messages
const _threadsMap = new Map<string, EmailThread>()
const _messagesMap = new Map<string, EmailMessage[]>()

// Initialize with sample real-world threads if empty
function ensureInitialSeed() {
  if (_threadsMap.size > 0) return

  const sampleThreads: Array<{ thread: EmailThread; messages: EmailMessage[] }> = [
    {
      thread: {
        id: 'thr-support-101',
        threadNumber: 'EM-8921',
        subject: 'Cần hỗ trợ kích hoạt Claude Code Pro theo nhóm',
        customerEmail: 'dev.hoangnam@gmail.com',
        customerName: 'Hoàng Nam',
        alias: 'support@kandes.shop',
        status: 'unread',
        messageCount: 2,
        lastSnippet: 'Chào admin, mình vừa thanh toán gói Claude Code Pro 1 năm nhưng chưa rõ cách set token trên máy Ubuntu...',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        orderNumber: 'KDS-99824',
      },
      messages: [
        {
          id: 'msg-1',
          threadId: 'thr-support-101',
          direction: 'inbound',
          fromEmail: 'dev.hoangnam@gmail.com',
          fromName: 'Hoàng Nam',
          toEmail: 'support@kandes.shop',
          subject: 'Cần hỗ trợ kích hoạt Claude Code Pro theo nhóm',
          bodyHtml: '<p>Chào admin,</p><p>Mình vừa thanh toán gói Claude Code Pro 1 năm cho đơn hàng <strong>#KDS-99824</strong>. Mình đã nhận được mã bản quyền qua email nhưng chưa rõ cách cấu hình trên máy Ubuntu terminal.</p><p>Nhờ admin hướng dẫn giúp mình lệnh cài đặt với nhé. Cảm ơn shop!</p>',
          bodyText: 'Chào admin, Mình vừa thanh toán gói Claude Code Pro 1 năm cho đơn hàng #KDS-99824. Mình đã nhận được mã bản quyền qua email nhưng chưa rõ cách cấu hình trên máy Ubuntu terminal. Nhờ admin hướng dẫn giúp mình lệnh cài đặt với nhé. Cảm ơn shop!',
          alias: 'support@kandes.shop',
          status: 'received',
          createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        },
        {
          id: 'msg-2',
          threadId: 'thr-support-101',
          direction: 'outbound',
          fromEmail: 'support@kandes.shop',
          fromName: 'Kandes Support Team',
          toEmail: 'dev.hoangnam@gmail.com',
          subject: 'Re: Cần hỗ trợ kích hoạt Claude Code Pro theo nhóm',
          bodyHtml: '<p>Chào bạn Nam,</p><p>Kỹ thuật viên Kandes.shop xin hướng dẫn bạn kích hoạt trên Ubuntu:</p><pre style="background: #0B0F19; padding: 12px; border-radius: 6px; color: #00F0FF; font-family: monospace;">curl -sSL https://kandes.shop/install/claude/claude-config-kandes.sh | bash</pre><p>Sau đó bạn chỉ cần dán mã License Key đã nhận là hoàn tất nhé!</p>',
          bodyText: 'Chào bạn Nam, Kỹ thuật viên Kandes.shop xin hướng dẫn bạn kích hoạt trên Ubuntu: curl -sSL https://kandes.shop/install/claude/claude-config-kandes.sh | bash. Sau đó bạn chỉ cần dán mã License Key đã nhận là hoàn tất nhé!',
          alias: 'support@kandes.shop',
          status: 'sent',
          authorName: 'Admin Kandes',
          createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        },
      ],
    },
    {
      thread: {
        id: 'thr-billing-102',
        threadNumber: 'EM-8920',
        subject: 'Yêu cầu xuất hóa đơn GTGT cho đơn hàng KDS-99812',
        customerEmail: 'ketoan@techvina.io',
        customerName: 'Cty TNHH Công Nghệ TechVina',
        alias: 'billing@kandes.shop',
        status: 'unread',
        messageCount: 1,
        lastSnippet: 'Kính gửi Kandes Shop, công ty chúng tôi vừa mua 5 gói Cursor Pro...',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
        orderNumber: 'KDS-99812',
      },
      messages: [
        {
          id: 'msg-3',
          threadId: 'thr-billing-102',
          direction: 'inbound',
          fromEmail: 'ketoan@techvina.io',
          fromName: 'Cty TNHH Công Nghệ TechVina',
          toEmail: 'billing@kandes.shop',
          subject: 'Yêu cầu xuất hóa đơn GTGT cho đơn hàng KDS-99812',
          bodyHtml: '<p>Kính gửi Kandes Shop,</p><p>Công ty chúng tôi vừa hoàn tất thanh toán 5 gói bản quyền Cursor Pro (Mã đơn: #KDS-99812). Xin nhờ bộ phận kế toán xuất hóa đơn điện tử GTGT theo thông tin sau:</p><ul><li>Tên công ty: Công Ty TNHH Công Nghệ TechVina</li><li>MST: 0108998822</li><li>Địa chỉ: Cầu Giấy, Hà Nội</li><li>Email nhận HĐ: ketoan@techvina.io</li></ul><p>Xin trân trọng cảm ơn!</p>',
          bodyText: 'Kính gửi Kandes Shop, Công ty chúng tôi vừa hoàn tất thanh toán 5 gói bản quyền Cursor Pro (Mã đơn: #KDS-99812). Xin nhờ bộ phận kế toán xuất hóa đơn điện tử GTGT...',
          alias: 'billing@kandes.shop',
          status: 'received',
          createdAt: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
        },
      ],
    },
    {
      thread: {
        id: 'thr-sales-103',
        threadNumber: 'EM-8919',
        subject: 'Tư vấn mua bản quyền GitHub Copilot & ChatGPT Plus cho team 20 người',
        customerEmail: 'minhtri.cto@startupx.com',
        customerName: 'Minh Trí (CTO StartupX)',
        alias: 'sales@kandes.shop',
        status: 'replied',
        messageCount: 2,
        lastSnippet: 'Đã gửi bảng báo giá chiết khấu 25% cho team 20 developers...',
        lastMessageAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
        createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        updatedAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
      },
      messages: [
        {
          id: 'msg-4',
          threadId: 'thr-sales-103',
          direction: 'inbound',
          fromEmail: 'minhtri.cto@startupx.com',
          fromName: 'Minh Trí (CTO StartupX)',
          toEmail: 'sales@kandes.shop',
          subject: 'Tư vấn mua bản quyền GitHub Copilot & ChatGPT Plus cho team 20 người',
          bodyHtml: '<p>Chào shop, team mình hiện có khoảng 20 lập trình viên đang muốn trang bị AI coding tools. Shop có chính sách giá ưu đãi cho doanh nghiệp / team không?</p>',
          bodyText: 'Chào shop, team mình hiện có khoảng 20 lập trình viên đang muốn trang bị AI coding tools. Shop có chính sách giá ưu đãi cho doanh nghiệp / team không?',
          alias: 'sales@kandes.shop',
          status: 'received',
          createdAt: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        },
        {
          id: 'msg-5',
          threadId: 'thr-sales-103',
          direction: 'outbound',
          fromEmail: 'sales@kandes.shop',
          fromName: 'Kandes Sales Team',
          toEmail: 'minhtri.cto@startupx.com',
          subject: 'Re: Tư vấn mua bản quyền GitHub Copilot & ChatGPT Plus cho team 20 người',
          bodyHtml: '<p>Chào anh Trí,</p><p>Kandes.shop xin gửi anh bảng báo giá ưu đãi chiết khấu 25% kèm chính sách xuất hóa đơn GTGT đầy đủ cho gói 20 thành viên...</p>',
          bodyText: 'Chào anh Trí, Kandes.shop xin gửi anh bảng báo giá ưu đãi chiết khấu 25%...',
          alias: 'sales@kandes.shop',
          status: 'sent',
          authorName: 'Trưởng phòng Kinh doanh Kandes',
          createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
        },
      ],
    },
  ]

  for (const item of sampleThreads) {
    _threadsMap.set(item.thread.id, item.thread)
    _messagesMap.set(item.thread.id, item.messages)
  }
}

/**
 * Sync contact submissions from DB into email threads
 */
export async function syncContactSubmissions(): Promise<void> {
  ensureInitialSeed()
  try {
    const submissions = await db.contactSubmission.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    })

    for (const sub of submissions) {
      const threadId = `contact-sub-${sub.id}`
      if (!_threadsMap.has(threadId)) {
        const thread: EmailThread = {
          id: threadId,
          threadNumber: `WEB-${sub.id.slice(0, 6).toUpperCase()}`,
          subject: sub.subject || 'Liên hệ từ website Kandes.shop',
          customerEmail: sub.email,
          customerName: sub.name || 'Khách hàng',
          alias: 'contact@kandes.shop',
          status: sub.status === 'new' ? 'unread' : 'read',
          messageCount: 1,
          lastSnippet: sub.message.slice(0, 100),
          lastMessageAt: sub.createdAt.toISOString(),
          createdAt: sub.createdAt.toISOString(),
          updatedAt: sub.updatedAt.toISOString(),
        }

        const message: EmailMessage = {
          id: `msg-sub-${sub.id}`,
          threadId,
          direction: 'inbound',
          fromEmail: sub.email,
          fromName: sub.name || 'Khách hàng',
          toEmail: 'contact@kandes.shop',
          subject: sub.subject || 'Liên hệ từ website Kandes.shop',
          bodyHtml: `<p>${sub.message.replace(/\n/g, '<br/>')}</p>${sub.phone ? `<p style="color: #94A3B8; font-size: 12px;">Số điện thoại: ${sub.phone}</p>` : ''}`,
          bodyText: sub.message,
          alias: 'contact@kandes.shop',
          status: 'received',
          createdAt: sub.createdAt.toISOString(),
        }

        _threadsMap.set(threadId, thread)
        _messagesMap.set(threadId, [message])
      }
    }
  } catch {
    // DB sync error fallback gracefully to memory store
  }
}

export async function getAllThreads(filter?: {
  alias?: string
  status?: ThreadStatus | 'all'
  search?: string
}): Promise<EmailThread[]> {
  await syncContactSubmissions()

  let list = Array.from(_threadsMap.values())

  if (filter?.alias && filter.alias !== 'all') {
    const target = filter.alias.toLowerCase().trim()
    list = list.filter((t) => t.alias.toLowerCase().includes(target))
  }

  if (filter?.status && filter.status !== 'all') {
    list = list.filter((t) => t.status === filter.status)
  }

  if (filter?.search) {
    const q = filter.search.toLowerCase().trim()
    list = list.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.customerEmail.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        t.lastSnippet.toLowerCase().includes(q) ||
        t.threadNumber.toLowerCase().includes(q) ||
        (t.orderNumber && t.orderNumber.toLowerCase().includes(q))
    )
  }

  return list.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  )
}

export async function getThreadById(id: string): Promise<{ thread: EmailThread; messages: EmailMessage[] } | null> {
  await syncContactSubmissions()
  const thread = _threadsMap.get(id)
  if (!thread) return null
  const messages = _messagesMap.get(id) || []
  return { thread, messages }
}

export function saveInboundMessage(input: {
  fromEmail: string
  fromName?: string
  toEmail: string
  subject: string
  bodyHtml?: string
  bodyText?: string
}): { thread: EmailThread; message: EmailMessage } {
  ensureInitialSeed()

  const normalizedTo = input.toEmail.toLowerCase().trim()
  const aliasObj = getAliasByEmail(normalizedTo)
  const customerEmail = input.fromEmail.toLowerCase().trim()
  const customerName = input.fromName || customerEmail.split('@')[0] || 'Khách hàng'

  // Look for existing thread with same customer & alias
  let targetThread: EmailThread | undefined
  for (const t of _threadsMap.values()) {
    if (t.customerEmail.toLowerCase() === customerEmail && t.alias.toLowerCase() === aliasObj.email.toLowerCase()) {
      targetThread = t
      break
    }
  }

  const now = new Date().toISOString()
  const textContent = input.bodyText || input.bodyHtml?.replace(/<[^>]+>/g, '') || ''
  const htmlContent = input.bodyHtml || `<p>${textContent.replace(/\n/g, '<br/>')}</p>`

  if (!targetThread) {
    const threadId = `thr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const threadNumber = `EM-${Math.floor(1000 + Math.random() * 9000)}`
    targetThread = {
      id: threadId,
      threadNumber,
      subject: input.subject,
      customerEmail,
      customerName,
      alias: aliasObj.email,
      status: 'unread',
      messageCount: 1,
      lastSnippet: textContent.slice(0, 120),
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    }
    _threadsMap.set(threadId, targetThread)
    _messagesMap.set(threadId, [])
  } else {
    targetThread.status = 'unread'
    targetThread.lastSnippet = textContent.slice(0, 120)
    targetThread.lastMessageAt = now
    targetThread.updatedAt = now
    targetThread.messageCount += 1
  }

  const message: EmailMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    threadId: targetThread.id,
    direction: 'inbound',
    fromEmail: customerEmail,
    fromName: customerName,
    toEmail: aliasObj.email,
    subject: input.subject,
    bodyHtml: htmlContent,
    bodyText: textContent,
    alias: aliasObj.email,
    status: 'received',
    createdAt: now,
  }

  const list = _messagesMap.get(targetThread.id) || []
  list.push(message)
  _messagesMap.set(targetThread.id, list)

  return { thread: targetThread, message }
}

export function saveOutboundMessage(input: {
  threadId: string
  aliasEmail: string
  aliasName: string
  toEmail: string
  subject: string
  bodyHtml: string
  bodyText: string
  authorName: string
}): EmailMessage {
  ensureInitialSeed()
  const thread = _threadsMap.get(input.threadId)
  const now = new Date().toISOString()

  const message: EmailMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    threadId: input.threadId,
    direction: 'outbound',
    fromEmail: input.aliasEmail,
    fromName: input.aliasName,
    toEmail: input.toEmail,
    subject: input.subject,
    bodyHtml: input.bodyHtml,
    bodyText: input.bodyText,
    alias: input.aliasEmail,
    status: 'sent',
    authorName: input.authorName,
    createdAt: now,
  }

  if (thread) {
    thread.status = 'replied'
    thread.lastSnippet = input.bodyText.slice(0, 120)
    thread.lastMessageAt = now
    thread.updatedAt = now
    thread.messageCount += 1
  }

  const list = _messagesMap.get(input.threadId) || []
  list.push(message)
  _messagesMap.set(input.threadId, list)

  return message
}

export function updateStatus(threadId: string, status: ThreadStatus): boolean {
  const thread = _threadsMap.get(threadId)
  if (!thread) return false
  thread.status = status
  thread.updatedAt = new Date().toISOString()
  return true
}
