import { Card } from '@/components/ui/card'
import ModelCheckerClient from './ModelCheckerClient'

export const metadata = {
  title: 'Model Checker · Kandes AI API',
  description: 'Kiem tra models co san tu NCC Pro va test xem model nao hoat dong voi API key cua ban.',
}

export default function ModelCheckerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="mx-auto max-w-4xl px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Model Checker</h1>
          <p className="text-slate-600">
            Kiem tra models co san tu NCC Pro va test xem model nao hoat dong voi key cua ban.
          </p>
        </div>

        {/* How it works */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-3">Cach su dung</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
            <li>
              Nhap API key cua ban (Kandes <code className="bg-slate-100 px-1 rounded">ks-*</code> hoac NCC{' '}
              <code className="bg-slate-100 px-1 rounded">sk-jy-cc-*</code>)
            </li>
            <li>Nhan <strong>Fetch Models</strong> de xem danh sach models co san</li>
            <li>
              Nhan <strong>Test</strong> ben canh model de kiem tra model do co hoat dong khong
            </li>
          </ol>
        </Card>

        {/* Checker Component */}
        <Card className="p-6">
          <ModelCheckerClient />
        </Card>
      </div>
    </div>
  )
}