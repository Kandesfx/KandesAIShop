import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Kiểm tra API Key · Kandes Tools',
  description:
    'Dán API key (ks-xxx) để kiểm tra trạng thái, quota còn lại, thông tin gói — hoàn toàn miễn phí.',
}

export default function KeyCheckerLayout({ children }: { children: React.ReactNode }) {
  return children
}
