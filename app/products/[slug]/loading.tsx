export default function Loading() {
  return (
    <div className="container-narrow py-12 space-y-6 animate-fade-in">
      <div className="h-3 w-48 skeleton" />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <div className="aspect-square skeleton" />
          <div className="mt-6 grid grid-cols-3 gap-px">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-ink-800 p-3 h-20 skeleton" />
            ))}
          </div>
        </div>
        <div className="lg:col-span-7 space-y-6">
          <div className="h-3 w-32 skeleton" />
          <div className="h-12 w-3/4 skeleton" />
          <div className="h-3 w-full skeleton" />
          <div className="h-24 w-full skeleton" />
          <div className="h-40 w-full skeleton" />
        </div>
      </div>
    </div>
  )
}
