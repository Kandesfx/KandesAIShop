import { CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react'

interface NotificationLog {
  id: string
  event: string
  channel: string
  recipient: string
  status: string
  attempts: number
  error: string | null
  createdAt: Date
  sentAt: Date | null
}

export function RecentEmailLogs({ logs }: { logs: NotificationLog[] }) {
  return (
    <div className="space-y-3 rounded-lg border border-ink-400 bg-ink-800/40 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-wide text-ink-50">
          Nhật ký gửi Email gần đây (Audit Log)
        </h3>
        <span className="text-[11px] font-mono text-ink-200">
          Hiển thị 10 bản ghi gần nhất
        </span>
      </div>

      {logs.length === 0 ? (
        <div className="py-6 text-center text-xs text-ink-200">
          Chưa có nhật ký gửi email nào được ghi nhận trong cơ sở dữ liệu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-ink-400 text-ink-200 font-mono uppercase tracking-wider text-[10px]">
                <th className="pb-2">Sự kiện</th>
                <th className="pb-2">Người nhận</th>
                <th className="pb-2">Trạng thái</th>
                <th className="pb-2">Thử lại</th>
                <th className="pb-2">Thời gian</th>
                <th className="pb-2">Chi tiết / Lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-400/50">
              {logs.map((log) => {
                const isSent = log.status === 'sent'
                const isFailed = log.status === 'failed'
                const isQueued = log.status === 'queued'

                return (
                  <tr key={log.id} className="hover:bg-ink-700/30">
                    <td className="py-2.5 font-mono text-electric">{log.event}</td>
                    <td className="py-2.5 font-mono text-ink-100">{log.recipient}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                          isSent
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                            : isFailed
                            ? 'bg-red-500/10 text-red-300 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        {isSent && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                        {isFailed && <XCircle className="h-3 w-3 text-red-400" />}
                        {isQueued && <Clock className="h-3 w-3 text-amber-400" />}
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-ink-200">{log.attempts}</td>
                    <td className="py-2.5 text-ink-200 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </td>
                    <td className="py-2.5 max-w-xs truncate text-[11px]">
                      {log.error ? (
                        <span className="text-red-400" title={log.error}>
                          {log.error}
                        </span>
                      ) : isSent ? (
                        <span className="text-emerald-400/80">Đã gửi thành công</span>
                      ) : (
                        <span className="text-ink-300">Đang chờ xử lý</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
