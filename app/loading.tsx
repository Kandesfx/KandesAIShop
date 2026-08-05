export default function Loading() {
  return (
    <div className="container-narrow py-16 space-y-6 animate-fade-in">
      <div className="h-3 w-32 skeleton" />
      <div className="h-12 w-2/3 skeleton" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-ink-400 border border-ink-400">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-ink-800 p-6 space-y-3">
            <div className="h-3 w-1/3 skeleton" />
            <div className="aspect-[4/3] skeleton" />
            <div className="h-3 w-3/4 skeleton" />
            <div className="h-3 w-1/2 skeleton" />
          </div>
        ))}
      </div>
    </div>
  )
}
