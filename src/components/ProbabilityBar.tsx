export default function ProbabilityBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value * 100))
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'

  return (
    <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct.toFixed(1)}%` }}
      />
    </div>
  )
}
