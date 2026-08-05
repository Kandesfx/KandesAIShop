export default function AdminLoading() {
  return (
    <div className="container-narrow py-10 space-y-6">
      <div className="h-3 w-32 skeleton" />
      <div className="h-10 w-1/3 skeleton" />
      <div className="border border-ink-400 bg-ink-800/40 p-6 space-y-4">
        <div className="h-3 w-24 skeleton" />
        <div className="h-3 w-3/4 skeleton" />
        <div className="h-3 w-2/3 skeleton" />
      </div>
      <div className="h-3 w-48 skeleton" />
    </div>
  )
}
