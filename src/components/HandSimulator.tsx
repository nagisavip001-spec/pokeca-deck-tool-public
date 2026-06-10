import { useState, useEffect } from 'react'
import { getDecks, type SavedDeck, type DeckCard, formatSavedAt } from '../lib/deckStorage'
import { isBasicPokemon } from '../lib/pokemonStage'
import { hypergeometric } from '../lib/probability'

const CATEGORY_ORDER = [
  'ポケモン', 'グッズ', 'ポケモンのどうぐ', 'テクニカルマシン', 'サポート', 'スタジアム', 'エネルギー',
]

const DOT_COLOR: Record<string, string> = {
  'ポケモン':         'bg-red-400',
  'グッズ':           'bg-blue-400',
  'ポケモンのどうぐ': 'bg-purple-400',
  'テクニカルマシン': 'bg-gray-400',
  'サポート':         'bg-green-400',
  'スタジアム':       'bg-amber-400',
  'エネルギー':       'bg-yellow-400',
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function expandDeck(cards: DeckCard[]): string[] {
  return cards.flatMap((c) => Array(c.count).fill(c.name))
}

type IndividualCard = { name: string; category: string }

// カード名の配列をカテゴリ順にソートして1枚1行で返す（集約しない）
function sortIndividual(names: string[], deckCards: DeckCard[]): IndividualCard[] {
  return names
    .map((name) => {
      const card = deckCards.find((c) => c.name === name)
      return { name, category: card?.category ?? '' }
    })
    .sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category)
      const bi = CATEGORY_ORDER.indexOf(b.category)
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
    })
}

function groupByCategory(cards: DeckCard[]): { label: string; cards: DeckCard[] }[] {
  const map = new Map<string, DeckCard[]>()
  for (const card of cards) {
    const cat = card.category || 'その他'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(card)
  }
  const result: { label: string; cards: DeckCard[] }[] = []
  for (const cat of CATEGORY_ORDER) {
    if (map.has(cat)) result.push({ label: cat, cards: map.get(cat)! })
  }
  for (const [cat, cs] of map) {
    if (!CATEGORY_ORDER.includes(cat)) result.push({ label: cat, cards: cs })
  }
  return result
}

export default function HandSimulator({ defaultDeckId, onDeckSelect }: { defaultDeckId?: string; onDeckSelect?: (id: string) => void }) {
  const [decks, setDecks] = useState<SavedDeck[]>(() => getDecks())
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    defaultDeckId && getDecks().some((d) => d.id === defaultDeckId)
      ? defaultDeckId
      : getDecks()[0]?.id ?? ''
  )
  const [hand, setHand] = useState<string[] | null>(null)
  const [side, setSide] = useState<string[] | null>(null)
  const [drawCard, setDrawCard] = useState<string | null>(null)
  const [shuffleCount, setShuffleCount] = useState(0)
  const [mulliganTrialCount, setMulliganTrialCount] = useState(0)

  useEffect(() => {
    if (!defaultDeckId) return
    const freshDecks = getDecks()
    setDecks(freshDecks)
    if (freshDecks.some((d) => d.id === defaultDeckId)) {
      setSelectedDeckId(defaultDeckId)
    }
  }, [defaultDeckId])
  const [sideHidden, setSideHidden] = useState(false)
  const [showSide, setShowSide] = useState(true)
  const [showDeckPicker, setShowDeckPicker] = useState(false)
  const [deckRemaining, setDeckRemaining] = useState<string[] | null>(null)
  const [gameMode, setGameMode] = useState(false)
  const [guessMap, setGuessMap] = useState<Map<string, number>>(new Map())
  const [gameRevealed, setGameRevealed] = useState(false)

  const selectedDeck = decks.find((d) => d.id === selectedDeckId) ?? null

  const basicCount = (selectedDeck?.cards ?? [])
    .filter((c) => isBasicPokemon(c.name, c.category))
    .reduce((s, c) => s + c.count, 0)
  const mulliganProb = selectedDeck
    ? hypergeometric(selectedDeck.totalCards, basicCount, 7, 0)
    : 0

  function deal() {
    if (!selectedDeck) return
    let expanded = shuffleArray(expandDeck(selectedDeck.cards))
    let newMulligans = 0

    while (newMulligans < 100) {
      const hand7 = expanded.slice(0, 7)
      const hasBasic = hand7.some((name) => {
        const card = selectedDeck.cards.find((c) => c.name === name)
        return isBasicPokemon(name, card?.category ?? '')
      })
      if (hasBasic) break
      newMulligans++
      expanded = shuffleArray(expandDeck(selectedDeck.cards))
    }

    const hand7 = expanded.slice(0, 7)
    const sideCards = expanded.slice(7, 13)
    const draw1 = expanded[13] ?? null
    setDeckRemaining(expanded.slice(14))
    setHand(hand7)
    setSide(sideCards)
    setDrawCard(draw1)
    setShuffleCount((n) => n + 1)
    if (newMulligans > 0) setMulliganTrialCount((n) => n + 1)
    setShowSide(!sideHidden)
    setGameMode(sideHidden)
    setGuessMap(new Map())
    setGameRevealed(false)
  }

  function endGame() {
    setGameMode(false)
    setGameRevealed(false)
    setShowSide(true)
  }

  if (decks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 px-4">
        <p className="text-4xl">🃏</p>
        <p className="text-gray-700 text-sm font-medium">デッキが保存されていません</p>
        <p className="text-gray-400 text-xs leading-relaxed">
          「デッキ読込」タブでデッキを読み込み、<br />保存してからお試しください。
        </p>
      </div>
    )
  }

  const allHandCards = [...(hand ?? []), ...(drawCard ? [drawCard] : [])]
  const handGrouped = hand ? sortIndividual(hand, selectedDeck?.cards ?? []) : []
  const sideGrouped = side ? sortIndividual(side, selectedDeck?.cards ?? []) : []
  const drawGrouped = drawCard ? sortIndividual([drawCard], selectedDeck?.cards ?? []) : []

  return (
    <div className="space-y-2">
      {/* デッキ選択 */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-2">
        <h2 className="font-semibold text-gray-700 text-sm">
          {selectedDeck
            ? <>選択中のデッキ：<span className="text-blue-700">{selectedDeck.name}</span></>
            : 'デッキを選択'
          }
        </h2>
        <button
          onClick={() => setShowDeckPicker(true)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 active:bg-gray-100"
        >
          <div className="text-left min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {selectedDeck?.name ?? 'デッキを選択'}
            </p>
            {selectedDeck && (
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedDeck.totalCards}枚 · {formatSavedAt(selectedDeck.savedAt)}
              </p>
            )}
          </div>
          <span className="text-gray-400 text-xs ml-3 shrink-0">切替 ▼</span>
        </button>

        {selectedDeck && selectedDeck.totalCards !== 60 && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            ⚠ このデッキは {selectedDeck.totalCards} 枚です（60枚が標準）
          </p>
        )}

        {/* サイド設定 */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div
            onClick={() => {
              const next = !sideHidden
              setSideHidden(next)
              if (!next) setShowSide(true)
            }}
            className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${
              sideHidden ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${sideHidden ? 'translate-x-4' : 'translate-x-0'}`} />
          </div>
          <span className="text-sm text-gray-600">サイドは裏にしてテストをする</span>
        </label>
      </section>

      {/* 結果 */}
      {hand && side && (
        <>
          {/* 手札（7枚） */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">
                手札 <span className="text-gray-400 font-normal">（最初の7枚）</span>
              </h2>
              <span className="text-xs text-gray-400">{hand.length}枚</span>
            </div>
            <CardList cards={handGrouped} />
          </section>

          {/* 1枚ドロー */}
          {drawCard && (
            <section className="bg-blue-50 rounded-2xl border border-blue-100 p-3 space-y-1">
              <h2 className="font-semibold text-blue-700 text-sm">
                1枚ドロー <span className="font-normal text-blue-500 text-xs">（最初のターン）</span>
              </h2>
              <CardList cards={drawGrouped} />
            </section>
          )}

          {/* サイド（6枚） */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 text-sm">
                サイド <span className="text-gray-400 font-normal">（6枚）</span>
              </h2>
              {!gameMode && sideHidden && (
                <button
                  onClick={() => setShowSide((v) => !v)}
                  className="text-xs text-blue-600 underline"
                >
                  {showSide ? '非表示' : '確認する'}
                </button>
              )}
            </div>

            {gameMode ? (
              <GuessGame
                deck={selectedDeck!}
                allHandCards={allHandCards}
                deckRemaining={deckRemaining ?? []}
                side={side}
                guessMap={guessMap}
                onGuessChange={setGuessMap}
                revealed={gameRevealed}
                onReveal={() => setGameRevealed(true)}
                onEnd={endGame}
                onRetry={deal}
              />
            ) : showSide ? (
              <CardList cards={sideGrouped} />
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2 justify-center py-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-10 h-14 rounded-lg bg-blue-800 border-2 border-blue-600 flex items-center justify-center">
                      <span className="text-white text-xs">🎴</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={deal}
                  className="w-full py-3 rounded-xl text-sm font-bold bg-purple-600 text-white active:bg-purple-700"
                >
                  🎯 サイド落ちカード当てゲーム
                </button>
              </div>
            )}
          </section>
        </>
      )}

      {/* シャッフルボタン（統計バー統合） */}
      <button
        onClick={deal}
        disabled={!selectedDeck}
        className="w-full rounded-2xl font-bold bg-blue-600 text-white active:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 shadow-sm overflow-hidden"
      >
        {selectedDeck && (
          <div className="flex items-center justify-between px-4 pt-2.5 pb-2 text-xs font-normal text-blue-100 border-b border-white/20">
            <span>
              テスト <span className="font-semibold text-white">{shuffleCount}</span>回／マリガン <span className="font-semibold text-orange-300">{mulliganTrialCount}</span>回
            </span>
            <span>
              実測 <span className="font-semibold text-white">{shuffleCount > 0 ? ((mulliganTrialCount / shuffleCount) * 100).toFixed(1) : '-'}</span>%
            </span>
            <span>
              理論 <span className="font-semibold text-white">{(mulliganProb * 100).toFixed(1)}</span>%
            </span>
          </div>
        )}
        <div className="py-3 px-4 text-base">
          🎲 シャッフルしてテスト開始
        </div>
      </button>

      {/* デッキ選択モーダル */}
      {showDeckPicker && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeckPicker(false) }}
        >
          <div className="bg-white rounded-t-2xl w-full max-h-[60vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700 text-sm">デッキを選択</h3>
              <button onClick={() => setShowDeckPicker(false)} className="text-gray-400 text-lg leading-none px-2">✕</button>
            </div>
            <ul className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {[...decks.filter(d => d.id === selectedDeckId), ...decks.filter(d => d.id !== selectedDeckId)].map((deck) => (
                <li key={deck.id}>
                  <button
                    onClick={() => {
                      setSelectedDeckId(deck.id)
                      setHand(null)
                      setSide(null)
                      setShuffleCount(0)
                      setMulliganTrialCount(0)
                      setGameMode(false)
                      setShowDeckPicker(false)
                      onDeckSelect?.(deck.id)
                    }}
                    className={`w-full text-left px-4 py-3.5 active:bg-gray-50 flex items-center gap-3 ${deck.id === selectedDeckId ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{deck.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{deck.totalCards}枚 · {formatSavedAt(deck.savedAt)}</p>
                    </div>
                    {deck.id === selectedDeckId && <span className="text-blue-600 text-sm shrink-0">✓</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- サイド落ちカード当てゲーム ----

function GuessGame({
  deck,
  allHandCards,
  deckRemaining,
  side,
  guessMap,
  onGuessChange,
  revealed,
  onReveal,
  onEnd,
  onRetry,
}: {
  deck: SavedDeck
  allHandCards: string[]
  deckRemaining: string[]
  side: string[]
  guessMap: Map<string, number>
  onGuessChange: (next: Map<string, number>) => void
  revealed: boolean
  onReveal: () => void
  onEnd: () => void
  onRetry: () => void
}) {
  const handCount = new Map<string, number>()
  for (const name of allHandCards) handCount.set(name, (handCount.get(name) ?? 0) + 1)

  const sideCount = new Map<string, number>()
  for (const name of side) sideCount.set(name, (sideCount.get(name) ?? 0) + 1)

  const totalGuessed = [...guessMap.values()].reduce((a, b) => a + b, 0)

  function setGuess(name: string, val: number) {
    onGuessChange((() => {
      const next = new Map(guessMap)
      if (val === 0) next.delete(name)
      else next.set(name, val)
      return next
    })())
  }

  // スコア計算（正確に当てた枚数）
  let score = 0
  if (revealed) {
    for (const card of deck.cards) {
      const actual = sideCount.get(card.name) ?? 0
      const guessed = guessMap.get(card.name) ?? 0
      score += Math.min(actual, guessed)
    }
  }

  const grouped = groupByCategory(deck.cards)

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-purple-700">🎯 サイド落ちを当てよう！</p>
        <button onClick={onEnd} className="text-xs text-gray-400 underline">やめる</button>
      </div>

      {/* ヒント：手札 */}
      <div className="bg-blue-50 rounded-xl p-3 space-y-2">
        <p className="text-xs font-bold text-blue-700">手札（{allHandCards.length}枚）</p>
        <CardList cards={sortIndividual(allHandCards, deck.cards)} compact />
      </div>

      {/* ヒント：山札46枚 */}
      <DeckRemainingHint deckRemaining={deckRemaining} deck={deck} />

      {/* 予想フェーズ */}
      {!revealed && (
        <>
          <p className="text-xs text-gray-500">
            サイドに落ちたと思う枚数を指定してください
            <span className={`ml-1 font-bold ${totalGuessed === 6 ? 'text-green-600' : 'text-purple-600'}`}>
              （{totalGuessed}/6枚）
            </span>
          </p>

          {grouped.map((group) => {
            const guessable = group.cards.filter((card) => {
              const inHand = handCount.get(card.name) ?? 0
              return card.count - inHand > 0
            })
            if (guessable.length === 0) return null
            return (
              <div key={group.label}>
                <p className="text-xs font-bold text-gray-400 mb-2">{group.label}</p>
                <div className="space-y-2">
                  {guessable.map((card) => {
                    const inHand = handCount.get(card.name) ?? 0
                    const maxG = card.count - inHand
                    const current = guessMap.get(card.name) ?? 0
                    const canIncrease = current < maxG && totalGuessed < 6
                    return (
                      <div key={card.name} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLOR[group.label] ?? 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-800 truncate">{card.name}</p>
                          {inHand > 0 && <p className="text-xs text-gray-400">手札に{inHand}枚</p>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => setGuess(card.name, Math.max(0, current - 1))}
                            disabled={current === 0}
                            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-base flex items-center justify-center disabled:opacity-30 active:bg-gray-200"
                          >
                            −
                          </button>
                          <span className={`w-6 text-center text-sm font-bold ${current > 0 ? 'text-purple-700' : 'text-gray-300'}`}>
                            {current}
                          </span>
                          <button
                            onClick={() => canIncrease && setGuess(card.name, current + 1)}
                            disabled={!canIncrease}
                            className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 font-bold text-base flex items-center justify-center disabled:opacity-30 active:bg-gray-200"
                          >
                            ＋
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <button
            onClick={onReveal}
            disabled={totalGuessed !== 6}
            className={`w-full py-3 rounded-xl text-sm font-bold transition-colors ${
              totalGuessed === 6
                ? 'bg-purple-600 text-white active:bg-purple-700'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            {totalGuessed === 6 ? '答え合わせをする！' : `あと ${6 - totalGuessed} 枚選んでください`}
          </button>
        </>
      )}

      {/* 結果フェーズ */}
      {revealed && (
        <div className="space-y-3">
          {/* スコア */}
          <div className={`text-center py-4 rounded-2xl ${
            score === 6 ? 'bg-green-50 border border-green-200' : 'bg-purple-50 border border-purple-200'
          }`}>
            <p className="text-5xl font-bold text-purple-700">{score}<span className="text-2xl text-purple-400"> / 6</span></p>
            <p className="text-sm mt-1 text-purple-500">
              {score === 6 ? '🎉 パーフェクト！' : score >= 5 ? '✨ 惜しい！' : score >= 3 ? '👍 いい感じ！' : score >= 1 ? '😅 もう少し！' : '😭 残念...'}
            </p>
          </div>

          {/* 詳細結果 */}
          <p className="text-xs font-bold text-gray-500">サイドの実際の内容</p>
          <div className="space-y-1.5">
            {deck.cards
              .filter((card) => (sideCount.get(card.name) ?? 0) > 0 || (guessMap.get(card.name) ?? 0) > 0)
              .map((card) => {
                const actual = sideCount.get(card.name) ?? 0
                const guessed = guessMap.get(card.name) ?? 0
                const exactMatch = actual === guessed
                const partialMatch = actual > 0 && guessed > 0 && !exactMatch

                return (
                  <div
                    key={card.name}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                      exactMatch && actual > 0 ? 'bg-green-50 border border-green-200' :
                      partialMatch           ? 'bg-yellow-50 border border-yellow-200' :
                      actual > 0             ? 'bg-red-50 border border-red-200' :
                                               'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLOR[card.category] ?? 'bg-gray-300'}`} />
                    <span className="flex-1 text-xs text-gray-800 truncate">{card.name}</span>
                    <span className="text-xs text-gray-500 shrink-0">実際{actual}枚</span>
                    <span className="text-xs text-gray-400 shrink-0">予想{guessed}枚</span>
                    <span className="text-sm shrink-0">
                      {exactMatch && actual > 0 ? '✓' : partialMatch ? '△' : '✗'}
                    </span>
                  </div>
                )
              })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onRetry}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-blue-600 text-white active:bg-blue-700"
            >
              🎲 もう一度テストする
            </button>
            <button
              onClick={onEnd}
              className="px-4 py-3 rounded-xl text-sm border border-gray-200 text-gray-500 active:bg-gray-50"
            >
              終わる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- 山札ヒント（折りたたみ可能） ----

function DeckRemainingHint({ deckRemaining, deck }: { deckRemaining: string[]; deck: SavedDeck }) {
  const [open, setOpen] = useState(true)
  // カード名→カテゴリのルックアップ（ドット色用）
  const categoryMap = new Map(deck.cards.map((c) => [c.name, c.category]))

  return (
    <div className="bg-green-50 rounded-xl border border-green-100 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 active:bg-green-100"
      >
        <p className="text-xs font-bold text-green-700">山札（{deckRemaining.length}枚）シャッフル順</p>
        <span className={`text-green-500 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-0.5">
          {deckRemaining.map((name, i) => {
            const category = categoryMap.get(name) ?? ''
            return (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLOR[category] ?? 'bg-gray-300'}`} />
                <span className="text-xs text-gray-800 truncate">{name}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---- 共通コンポーネント ----

function CardList({ cards, compact = false }: { cards: IndividualCard[]; compact?: boolean }) {
  if (cards.length === 0) return <p className="text-xs text-gray-400">なし</p>
  return (
    <div className="space-y-0.5">
      {cards.map((card, i) => (
        <div key={card.name + i} className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${DOT_COLOR[card.category] ?? 'bg-gray-300'}`} />
          <span className={`flex-1 ${compact ? 'text-xs' : 'text-sm'} text-gray-800 min-w-0 truncate`}>{card.name}</span>
        </div>
      ))}
    </div>
  )
}
