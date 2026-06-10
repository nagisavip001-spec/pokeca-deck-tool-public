import { useState } from 'react'
import {
  type SavedDeck,
  getDecks,
  deleteDeck,
  formatSavedAt,
} from '../lib/deckStorage'

const CATEGORY_ORDER = [
  'ポケモン',
  'グッズ',
  'ポケモンのどうぐ',
  'テクニカルマシン',
  'サポート',
  'スタジアム',
  'エネルギー',
]

interface Props {
  onLoadDeck: (deck: SavedDeck) => void
}

export default function DeckList({ onLoadDeck }: Props) {
  const [decks, setDecks] = useState<SavedDeck[]>(() => getDecks())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  function handleDelete(id: string) {
    deleteDeck(id)
    setDecks(getDecks())
    setExpandedId(null)
    setConfirmDeleteId(null)
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
    setConfirmDeleteId(null)
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 px-4">
        <p className="text-4xl">📭</p>
        <p className="text-gray-700 text-sm font-medium">デッキが保存されていません</p>
        <p className="text-gray-400 text-xs leading-relaxed">
          「デッキ読込」タブでデッキを読み込み、<br />保存してからお試しください。
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400 text-right">{decks.length} / 15 件</p>

      {decks.map((deck) => {
        const isExpanded = expandedId === deck.id
        const isConfirming = confirmDeleteId === deck.id

        // カテゴリ別グループ
        const grouped: { label: string; cards: SavedDeck['cards'] }[] = []
        const catMap = new Map<string, SavedDeck['cards']>()
        for (const card of deck.cards) {
          const cat = card.category || 'その他'
          if (!catMap.has(cat)) catMap.set(cat, [])
          catMap.get(cat)!.push(card)
        }
        for (const cat of CATEGORY_ORDER) {
          if (catMap.has(cat)) grouped.push({ label: cat, cards: catMap.get(cat)! })
        }
        for (const [cat, cards] of catMap) {
          if (!CATEGORY_ORDER.includes(cat)) grouped.push({ label: cat, cards })
        }

        return (
          <div key={deck.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* デッキ行ヘッダー */}
            <button
              onClick={() => toggleExpand(deck.id)}
              className="w-full text-left px-4 py-3.5 flex items-center gap-3 active:bg-gray-50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{deck.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {deck.totalCards}枚 · {formatSavedAt(deck.savedAt)}
                </p>
              </div>
              <span className={`text-gray-400 text-sm transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>

            {/* 展開時の詳細 */}
            {isExpanded && (
              <div className="border-t border-gray-100 px-4 pb-4 space-y-3 pt-3">
                {/* カテゴリ別カードリスト */}
                {grouped.length > 0 ? (
                  <div className="space-y-2">
                    {grouped.map((group) => (
                      <div key={group.label}>
                        <p className="text-xs font-bold text-gray-500 mb-1">{group.label}</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                          {group.cards.map((card) => (
                            <div key={card.name} className="flex items-center justify-between py-0.5">
                              <span className="text-xs text-gray-700 truncate flex-1 mr-1">{card.name}</span>
                              <span className="text-xs font-mono text-gray-400 shrink-0">×{card.count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">カード情報なし</p>
                )}

                {/* 公式サイトリンク */}
                {deck.code && (
                  <a
                    href={`https://www.pokemon-card.com/deck/confirm.html/deckID/${deck.code}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center text-xs text-blue-600 underline py-1"
                  >
                    公式サイトでデッキを確認 →
                  </a>
                )}

                {/* アクションボタン */}
                {isConfirming ? (
                  <div className="space-y-2">
                    <p className="text-xs text-center text-red-600 font-medium">
                      「{deck.name}」を削除しますか？
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="flex-1 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 active:bg-gray-50"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={() => handleDelete(deck.id)}
                        className="flex-1 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white active:bg-red-600"
                      >
                        削除する
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onLoadDeck(deck)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white active:bg-blue-700"
                    >
                      このデッキを読込
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(deck.id)}
                      className="px-4 py-2 rounded-xl text-sm border border-red-200 text-red-500 active:bg-red-50"
                    >
                      削除
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
