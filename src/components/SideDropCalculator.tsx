import { useState, useMemo } from 'react'
import { sideDropProb, distributionTable } from '../lib/probability'
import ProbabilityBar from './ProbabilityBar'

interface Props {
  cardCount: number
  onCardCountChange: (v: number) => void
}

export default function SideDropCalculator({ cardCount, onCardCountChange }: Props) {
  const [deckSize, setDeckSize] = useState(60)
  const [atLeast, setAtLeast] = useState(1)

  const prob = useMemo(
    () => sideDropProb(deckSize, cardCount, atLeast),
    [deckSize, cardCount, atLeast]
  )

  const table = useMemo(
    () => distributionTable(deckSize, cardCount, 6),
    [deckSize, cardCount]
  )

  const probPercent = (prob * 100).toFixed(1)

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
        サイド6枚に特定カードが何枚落ちるかを計算します。
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm">設定</h2>

        <NumberInput
          label="デッキ枚数"
          value={deckSize}
          min={1}
          max={60}
          onChange={setDeckSize}
        />
        <NumberInput
          label="対象カードの枚数"
          value={cardCount}
          min={0}
          max={deckSize}
          onChange={onCardCountChange}
        />
        <NumberInput
          label="サイド落ちする枚数（以上）"
          value={atLeast}
          min={1}
          max={Math.min(cardCount, 6)}
          onChange={setAtLeast}
        />
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm">結果</h2>

        <div className="text-center py-2">
          <div className={`text-5xl font-bold ${probColor(prob)}`}>{probPercent}%</div>
          <p className="text-gray-500 text-xs mt-1">
            {atLeast}枚以上サイド落ちする確率
          </p>
        </div>

        <ProbabilityBar value={prob} />
      </section>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="font-semibold text-gray-700 text-sm mb-3">サイド落ち枚数別確率</h2>
        <div className="space-y-2">
          {table.map(({ count, prob: p }) => (
            <div key={count} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-14 shrink-0 text-right">
                {count === 0 ? '落ちない' : `${count}枚`}
              </span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-red-400 rounded-full transition-all"
                  style={{ width: `${(p * 100).toFixed(1)}%` }}
                />
              </div>
              <span className="text-xs font-mono text-gray-600 w-12 shrink-0">
                {(p * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function NumberInput({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-gray-600 shrink-0">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center active:bg-gray-200 select-none"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
          }}
          className="w-14 text-center text-sm font-mono border border-gray-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center active:bg-gray-200 select-none"
        >
          ＋
        </button>
      </div>
    </div>
  )
}

function probColor(prob: number): string {
  if (prob <= 0.2) return 'text-green-600'
  if (prob <= 0.4) return 'text-yellow-600'
  return 'text-red-500'
}
