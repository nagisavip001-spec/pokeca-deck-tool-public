import { useState, useMemo, useEffect } from 'react'
import {
  type DeckCard,
  type SavedDeck,
  getDecks,
  saveDeck,
  autoName,
  formatSavedAt,
} from '../lib/deckStorage'
import type { DualConditionData, CardEntry } from '../App'

interface Props {
  cardCount: number
  onCardCountChange: (count: number, cards: CardEntry[]) => void
  loadedDeck?: SavedDeck | null
  onDeckLoaded?: () => void
  onDeckSaved?: (id: string) => void
  onDualConditionCalc?: (data: DualConditionData) => void
}

const CATEGORY_ORDER = [
  'ポケモン',
  'グッズ',
  'ポケモンのどうぐ',
  'テクニカルマシン',
  'サポート',
  'スタジアム',
  'エネルギー',
]

const CATEGORY_STYLE: Record<string, { header: string; dot: string }> = {
  'ポケモン':         { header: 'bg-red-50    border-red-200    text-red-800',    dot: 'bg-red-400' },
  'グッズ':           { header: 'bg-blue-50   border-blue-200   text-blue-800',   dot: 'bg-blue-400' },
  'ポケモンのどうぐ': { header: 'bg-purple-50 border-purple-200 text-purple-800', dot: 'bg-purple-400' },
  'テクニカルマシン': { header: 'bg-gray-100  border-gray-200   text-gray-700',   dot: 'bg-gray-400' },
  'サポート':         { header: 'bg-green-50  border-green-200  text-green-800',  dot: 'bg-green-400' },
  'スタジアム':       { header: 'bg-amber-50  border-amber-200  text-amber-800',  dot: 'bg-amber-400' },
  'エネルギー':       { header: 'bg-yellow-50 border-yellow-200 text-yellow-800', dot: 'bg-yellow-400' },
}
const DEFAULT_STYLE = { header: 'bg-gray-50 border-gray-200 text-gray-700', dot: 'bg-gray-400' }

const MULTI_HELP_BULLETS = [
  'トグルボタンをONにすることで、条件が追加できます。',
  '条件①で初手で触りたいカードその１、及びそのカードにアクセスできるカードを選択します。',
  '条件②で初手で触りたいカードその２、及びそのカードにアクセスできるカードを選択します。',
  '画面下部にある「この２つの条件で確率を計算する」をタップし、確率分析を確認します。',
]

const MULTI_HELP_CASES = [
  {
    title: 'ケース①：スピンロトムとオーガポンいどのめんの両方にアクセスしたい。',
    star: '条件①と②が同時に成立する確率を求めたいケース',
    lines: [
      '条件①：スピンロトム・なかよしポフィン・ポケパッド・ハイパーボールなどを選択します。',
      '条件②：オーガポンいどのめん・ハイパーボール・テラスタルオーブなどを選択します。',
      '→ページ下部の「この２つの条件で確率を計算する」をタップ。',
      '→確率分析のタブにて、【条件①】AND【条件②】と選択。',
      '→条件①が成立した上で条件②も成立する確率が表示されます。',
    ],
  },
  {
    title: 'ケース②：スピンロトムかオーガポンいどのめんのどちらかにアクセス出来れば良いケース。',
    star: '条件①か②のどちらかが成立する確率を求めたいケース',
    lines: [
      '条件①：スピンロトム・なかよしポフィン・ポケパッド・ハイパーボールなどを選択します。',
      '条件②：オーガポンいどのめん・ハイパーボール・テラスタルオーブなどを選択します。',
      '→ページ下部の「この２つの条件で確率を計算する」をタップ。',
      '→確率分析のタブにて、【条件①】OR【条件②】と選択。',
      '→条件①か条件②のどちらか(または両方)が成立する確率が表示されます。',
    ],
  },
]

export default function DeckCodeImport({
  cardCount,
  onCardCountChange,
  loadedDeck,
  onDeckLoaded,
  onDeckSaved,
  onDualConditionCalc,
}: Props) {
  const [manualText, setManualText] = useState('')
  const [cards, setCards] = useState<DeckCard[]>([])
  const [selectedNames, setSelectedNames] = useState<Set<string>>(new Set())
  const [selectedNames2, setSelectedNames2] = useState<Set<string>>(new Set())
  const [parseError, setParseError] = useState('')

  // カテゴリ折りたたみ状態（条件①②それぞれ独立）
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [collapsedCategories2, setCollapsedCategories2] = useState<Set<string>>(new Set())

  // 複数条件トグル
  const [multiCondition, setMultiCondition] = useState(false)
  const [showMultiToast, setShowMultiToast] = useState(false)

  // 複数条件ヘルプモーダル
  const [showMultiHelp, setShowMultiHelp] = useState(false)
  const [openMultiHelpCase, setOpenMultiHelpCase] = useState<number | null>(null)

  // 保存済みデッキ読込モーダル
  const [showLoadModal, setShowLoadModal] = useState(false)

  // 保存ダイアログ
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [savedFeedback, setSavedFeedback] = useState(false)

  const canSave = cards.length > 0

  const selectedCount = useMemo(
    () => cards.filter((c) => selectedNames.has(c.name)).reduce((s, c) => s + c.count, 0),
    [cards, selectedNames],
  )
  const selectedCount2 = useMemo(
    () => cards.filter((c) => selectedNames2.has(c.name)).reduce((s, c) => s + c.count, 0),
    [cards, selectedNames2],
  )

  const hasCategories = cards.some((c) => c.category)
  const grouped = useMemo(() => {
    if (!hasCategories) return []
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
  }, [cards, hasCategories])

  // 外部からデッキを読み込まれたとき（デッキ一覧タブから）
  useEffect(() => {
    if (!loadedDeck) return
    setCards(loadedDeck.cards)
    setSelectedNames(new Set())
    setSelectedNames2(new Set())
    setCollapsedCategories(new Set())
    setCollapsedCategories2(new Set())
    onDeckLoaded?.()
  }, [loadedDeck])

  function handleParse() {
    setParseError('')
    const parsed = parseDeckList(manualText)
    if (parsed.length === 0) {
      setParseError('カードが見つかりませんでした。形式を確認してください。')
      return
    }
    setCards(parsed)
    setSelectedNames(new Set())
    setSelectedNames2(new Set())
  }

  function handleSave() {
    const name = saveName.trim() || autoName()
    const totalCards = cards.reduce((s, c) => s + c.count, 0)
    const saved = saveDeck({ name, code: '', cards, totalCards })
    onDeckSaved?.(saved.id)
    setSaveName('')
    setShowSaveDialog(false)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
  }

  function handleLoadFromSaved(deck: SavedDeck) {
    setCards(deck.cards)
    setSelectedNames(new Set())
    setSelectedNames2(new Set())
    setShowLoadModal(false)
  }

  function toggleCard(name: string) {
    setSelectedNames((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleCard2(name: string) {
    setSelectedNames2((prev) => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  function toggleCategory(label: string, which: 1 | 2) {
    const setter = which === 1 ? setSelectedNames : setSelectedNames2
    const current = which === 1 ? selectedNames : selectedNames2
    const catCards = cards.filter((c) => c.category === label)
    const allSelected = catCards.every((c) => current.has(c.name))
    setter((prev) => {
      const next = new Set(prev)
      for (const card of catCards) {
        allSelected ? next.delete(card.name) : next.add(card.name)
      }
      return next
    })
  }

  function toggleCollapse(label: string, which: 1 | 2) {
    const setter = which === 1 ? setCollapsedCategories : setCollapsedCategories2
    setter((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }

  function toggleMultiCondition() {
    const next = !multiCondition
    setMultiCondition(next)
    if (next) {
      setSelectedNames2(new Set())
      setCollapsedCategories2(new Set())
      setShowMultiToast(true)
      setTimeout(() => setShowMultiToast(false), 2500)
    }
  }

  function handleDualCalc() {
    const unionNames = new Set([...selectedNames, ...selectedNames2])
    const unionCount = cards.filter((c) => unionNames.has(c.name)).reduce((s, c) => s + c.count, 0)
    const deckSize = cards.reduce((s, c) => s + c.count, 0) || 60
    const cards1 = cards.filter((c) => selectedNames.has(c.name)).map((c) => ({ name: c.name, count: c.count }))
    const cards2 = cards.filter((c) => selectedNames2.has(c.name)).map((c) => ({ name: c.name, count: c.count }))
    onDualConditionCalc?.({ cardCount1: selectedCount, cardCount2: selectedCount2, unionCount, deckSize, cards1, cards2 })
  }

  return (
    <div className="space-y-5">
      {/* 保存済みデッキから読込ボタン */}
      <button
        onClick={() => setShowLoadModal(true)}
        className="w-full py-2.5 rounded-xl text-sm font-medium border-2 border-blue-200 text-blue-700 bg-blue-50 active:bg-blue-100"
      >
        📂 保存済みデッキから読込
      </button>

      {/* デッキ保存 */}
      {cards.length > 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">このデッキを保存</h2>

          {savedFeedback && (
            <p className="text-xs text-green-600 text-center font-medium">✓ 保存しました</p>
          )}

          {showSaveDialog ? (
            <div className="space-y-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder={autoName()}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                autoFocus
              />
              <p className="text-xs text-gray-400">未入力の場合は日時で自動設定されます</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowSaveDialog(false); setSaveName('') }}
                  className="flex-1 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 active:bg-gray-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold bg-orange-500 text-white active:bg-orange-600"
                >
                  保存する
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => canSave && setShowSaveDialog(true)}
              disabled={!canSave}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                canSave
                  ? 'bg-orange-500 text-white active:bg-orange-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              💾 デッキを保存する
              {!canSave && (
                <span className="block text-xs font-normal mt-0.5">
                  デッキを読み込んでください
                </span>
              )}
            </button>
          )}
        </section>
      )}

      {/* テキスト貼り付け */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm">デッキリスト貼り付け</h2>
        <p className="text-xs text-gray-400">
          公式サイトの「リスト表示」からコピーして貼り付け。
        </p>
        <p className="text-xs text-gray-400">
          貼り付け方：「ポケモン(枚数)」からページ右下のエネルギー欄まですべてドラッグで選択して貼り付けてください。
        </p>
        <textarea
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          rows={6}
          placeholder={'カード名 枚数を1行ずつ入力\n例:\nピジョットex 4\n博士の研究 4'}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none font-mono"
        />
        {parseError && <p className="text-xs text-red-500">{parseError}</p>}
        <button
          onClick={handleParse}
          disabled={!manualText.trim()}
          className="w-full py-2 rounded-xl text-sm font-medium bg-gray-700 text-white active:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400"
        >
          リストを解析
        </button>
        {cards.length > 0 && (
          <p className="text-xs text-green-600 text-center">
            ✓ {cards.length}種類のカードを読み込みました
          </p>
        )}
      </section>

      {/* カード選択 */}
      {cards.length > 0 && (
        <>
          {/* トースト通知 */}
          {showMultiToast && (
            <div className="bg-blue-600 text-white text-xs text-center font-medium py-2.5 px-4 rounded-xl shadow-md">
              【条件②】をページ下部に追加しました
            </div>
          )}

          {/* 条件①（またはシングル）カード選択セクション */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            {/* ヘッダー行 */}
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-gray-700 text-sm shrink-0">
                {multiCondition ? '【条件①】対象カードを選択' : '対象カードを選択'}
              </h2>
              {/* 複数条件トグル */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                <span className="text-xs text-gray-500 whitespace-nowrap">条件を複数指定</span>
                <div
                  onClick={toggleMultiCondition}
                  className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                    multiCondition ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      multiCondition ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </label>
            </div>

            {/* 説明行 + ヘルプリンク */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">初手に触りたいカードを選択してください。</p>
              <button
                onClick={() => { setShowMultiHelp(true); setOpenMultiHelpCase(null) }}
                className="text-xs text-blue-500 underline whitespace-nowrap shrink-0 ml-2"
              >
                複数条件指定について
              </button>
            </div>

            <CardSelectorBody
              cards={cards}
              selectedNames={selectedNames}
              onToggleCard={toggleCard}
              onToggleCategory={(label) => toggleCategory(label, 1)}
              collapsedCategories={collapsedCategories}
              onToggleCollapse={(label) => toggleCollapse(label, 1)}
              hasCategories={hasCategories}
              grouped={grouped}
            />

            {/* 合計・適用ボタン（シングルモードのみ） */}
            {!multiCondition && (
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">選択した枚数の合計</span>
                  <span className="text-2xl font-bold text-blue-700">{selectedCount}枚</span>
                </div>
                {selectedCount > 0 &&
                  (cardCount === selectedCount ? (
                    <div className="text-center text-xs text-green-600 font-medium py-1">
                      ✓ 現在の確率計算に反映中
                    </div>
                  ) : (
                    <button
                      onClick={() => onCardCountChange(
                        selectedCount,
                        cards.filter((c) => selectedNames.has(c.name)).map((c) => ({ name: c.name, count: c.count }))
                      )}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white active:bg-blue-700"
                    >
                      この {selectedCount} 枚で確率を計算する
                    </button>
                  ))}
              </div>
            )}

            {/* 複数条件モード：条件①の合計のみ表示 */}
            {multiCondition && (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-600">条件①選択枚数</span>
                <span className="text-xl font-bold text-blue-700">{selectedCount}枚</span>
              </div>
            )}
          </section>

          {/* 条件②カード選択セクション（複数条件モード時のみ） */}
          {multiCondition && (
            <section className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-4 space-y-4">
              <h2 className="font-semibold text-indigo-700 text-sm">【条件②】対象カードを選択</h2>
              <p className="text-xs text-gray-400">初手に触りたいカードその②を選択してください。</p>

              <CardSelectorBody
                cards={cards}
                selectedNames={selectedNames2}
                onToggleCard={toggleCard2}
                onToggleCategory={(label) => toggleCategory(label, 2)}
                collapsedCategories={collapsedCategories2}
                onToggleCollapse={(label) => toggleCollapse(label, 2)}
                hasCategories={hasCategories}
                grouped={grouped}
                accentColor="indigo"
              />

              <div className="pt-2 border-t border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">条件②選択枚数</span>
                  <span className="text-xl font-bold text-indigo-700">{selectedCount2}枚</span>
                </div>

              </div>
            </section>
          )}

          {/* この２つの条件で確率を計算するボタン */}
          {multiCondition && (
            <button
              onClick={handleDualCalc}
              disabled={selectedCount === 0 && selectedCount2 === 0}
              className={`w-full py-3 rounded-xl text-sm font-bold shadow-sm transition-colors ${
                selectedCount > 0 || selectedCount2 > 0
                  ? 'bg-indigo-600 text-white active:bg-indigo-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              この２つの条件で確率を計算する
            </button>
          )}
        </>
      )}

      {/* 保存済みデッキ読込モーダル */}
      {showLoadModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) setShowLoadModal(false) }}
        >
          <div className="bg-white rounded-t-2xl w-full max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700 text-sm">保存済みデッキ</h3>
              <button
                onClick={() => setShowLoadModal(false)}
                className="text-gray-400 text-lg leading-none px-2"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <SavedDeckModalList onSelect={handleLoadFromSaved} />
            </div>
          </div>
        </div>
      )}

      {/* 複数条件指定についてモーダル */}
      {showMultiHelp && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) setShowMultiHelp(false) }}
        >
          <div className="bg-white rounded-t-2xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700 text-sm">複数条件指定について</h3>
              <button onClick={() => setShowMultiHelp(false)} className="text-gray-400 text-lg leading-none px-2">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-4 py-4 space-y-4">
              {/* 基本説明 */}
              <div className="space-y-2">
                {MULTI_HELP_BULLETS.map((line, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-blue-400 text-xs mt-0.5 shrink-0">•</span>
                    <p className="text-xs text-gray-600 leading-relaxed">{line}</p>
                  </div>
                ))}
              </div>

              {/* ケース説明（折りたたみ） */}
              <div className="space-y-2">
                {MULTI_HELP_CASES.map((c, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setOpenMultiHelpCase(openMultiHelpCase === i ? null : i)}
                      className="w-full flex items-start justify-between px-3 py-3 text-left active:bg-gray-50 gap-2"
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-700">☆{c.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">※{c.star}</p>
                      </div>
                      <span className={`text-gray-400 text-xs shrink-0 mt-0.5 transition-transform ${openMultiHelpCase === i ? 'rotate-180' : ''}`}>▼</span>
                    </button>
                    {openMultiHelpCase === i && (
                      <div className="px-3 pb-3 space-y-1.5 border-t border-gray-100">
                        {c.lines.map((line, j) => (
                          <p key={j} className="text-xs text-gray-600 leading-relaxed">{line}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// カード選択UI（条件①②で共通）
function CardSelectorBody({
  cards,
  selectedNames,
  onToggleCard,
  onToggleCategory,
  collapsedCategories,
  onToggleCollapse,
  hasCategories,
  grouped,
  accentColor = 'blue',
}: {
  cards: DeckCard[]
  selectedNames: Set<string>
  onToggleCard: (name: string) => void
  onToggleCategory: (label: string) => void
  collapsedCategories: Set<string>
  onToggleCollapse: (label: string) => void
  hasCategories: boolean
  grouped: { label: string; cards: DeckCard[] }[]
  accentColor?: 'blue' | 'indigo'
}) {
  const checkboxAccent = accentColor === 'indigo' ? 'accent-indigo-600' : 'accent-blue-600'
  const selectedBorder = accentColor === 'indigo' ? 'bg-indigo-50 border-indigo-200' : 'bg-blue-50 border-blue-200'

  if (hasCategories) {
    return (
      <div className="space-y-3">
        {grouped.map((group) => {
          const style = CATEGORY_STYLE[group.label] ?? DEFAULT_STYLE
          const groupTotal = group.cards.reduce((s, c) => s + c.count, 0)
          const groupSelectedCount = group.cards
            .filter((c) => selectedNames.has(c.name))
            .reduce((s, c) => s + c.count, 0)
          const allGroupSelected = group.cards.every((c) => selectedNames.has(c.name))
          const isCollapsed = collapsedCategories.has(group.label)

          return (
            <div key={group.label}>
              {/* カテゴリヘッダー（タップで折りたたみ） */}
              <button
                onClick={() => onToggleCollapse(group.label)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border mb-1.5 active:opacity-80 ${style.header}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                  <span className="text-xs font-bold">{group.label}</span>
                  {isCollapsed ? (
                    <span className="text-xs opacity-60 truncate">
                      {groupTotal}中{groupSelectedCount}枚選択中
                    </span>
                  ) : (
                    <span className="text-xs opacity-60">{groupTotal}枚</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isCollapsed && (
                    <span
                      onClick={(e) => { e.stopPropagation(); onToggleCategory(group.label) }}
                      className="text-xs underline opacity-70 px-1"
                    >
                      {allGroupSelected ? '解除' : '全選択'}
                    </span>
                  )}
                  <span className={`text-gray-500 text-xs transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>▼</span>
                </div>
              </button>

              {/* カードグリッド（展開時のみ） */}
              {!isCollapsed && (
                <div className="grid grid-cols-2 gap-1.5">
                  {group.cards.map((card) => (
                    <label
                      key={card.name}
                      className={`flex items-start gap-2 p-2.5 rounded-xl cursor-pointer border transition-colors ${
                        selectedNames.has(card.name) ? selectedBorder : 'bg-gray-50 border-transparent'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedNames.has(card.name)}
                        onChange={() => onToggleCard(card.name)}
                        className={`mt-0.5 w-4 h-4 shrink-0 ${checkboxAccent}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs leading-tight text-gray-800 break-words">{card.name}</p>
                        <p className="text-xs font-mono text-gray-400 mt-0.5">×{card.count}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {cards.map((card) => (
        <label
          key={card.name}
          className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer border transition-colors ${
            selectedNames.has(card.name) ? selectedBorder : 'bg-gray-50 border-transparent'
          }`}
        >
          <input
            type="checkbox"
            checked={selectedNames.has(card.name)}
            onChange={() => onToggleCard(card.name)}
            className={`w-4 h-4 shrink-0 ${checkboxAccent}`}
          />
          <span className="flex-1 text-sm text-gray-800">{card.name}</span>
          <span className="text-sm font-mono text-gray-500 shrink-0">×{card.count}</span>
        </label>
      ))}
    </div>
  )
}

function SavedDeckModalList({ onSelect }: { onSelect: (deck: SavedDeck) => void }) {
  const decks = getDecks()
  if (decks.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-gray-400">
        保存済みデッキはありません
      </div>
    )
  }
  return (
    <ul className="divide-y divide-gray-100">
      {decks.map((deck) => (
        <li key={deck.id}>
          <button
            onClick={() => onSelect(deck)}
            className="w-full text-left px-4 py-3.5 active:bg-gray-50"
          >
            <p className="text-sm font-medium text-gray-800">{deck.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {deck.totalCards}枚 · {formatSavedAt(deck.savedAt)}
            </p>
          </button>
        </li>
      ))}
    </ul>
  )
}

function parseDeckList(text: string): DeckCard[] {
  const cards: DeckCard[] = []
  const seen = new Set<string>()
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)

  let pendingName: string | null = null
  let currentCategory = ''

  for (const line of lines) {
    const categoryMatch = line.match(/^(.+?)\s*[（(]\d+[）)]$/)
    if (categoryMatch && CATEGORY_ORDER.includes(categoryMatch[1])) {
      currentCategory = categoryMatch[1]
      pendingName = null
      continue
    }

    if (/^[●▶【〔]/.test(line) || line.startsWith('//') || line.startsWith('#')) {
      continue
    }

    if (/^[A-Za-z][A-Za-z0-9\-]{1,5}$/.test(line)) {
      continue
    }

    if (/^\d+\/\d+$/.test(line)) {
      continue
    }

    const countMatch =
      line.match(/^[×xｘ×](\d+)枚?$/) ||
      line.match(/^(\d+)枚$/) ||
      (pendingName != null ? line.match(/^(\d+)$/) : null)

    if (countMatch) {
      const count = parseInt(countMatch[1], 10)
      if (pendingName && count >= 1 && count <= 60 && !seen.has(pendingName)) {
        seen.add(pendingName)
        cards.push({ name: pendingName, count, category: currentCategory })
      }
      pendingName = null
      continue
    }

    const sameLineMatch =
      line.match(/^(.+?)\s+[×xｘ×](\d+)枚?$/) ||
      line.match(/^(.+?)\s+(\d+)枚$/)

    if (sameLineMatch) {
      const name = sameLineMatch[1].trim().replace(/[（(][^）)]+[）)]\s*$/, '').trim()
      const count = parseInt(sameLineMatch[2], 10)
      if (name && count >= 1 && count <= 60 && !seen.has(name)) {
        seen.add(name)
        cards.push({ name, count, category: currentCategory })
      }
      pendingName = null
      continue
    }

    const name = line.replace(/[（(][^）)]+[）)]\s*$/, '').trim()
    if (name.length >= 2) {
      pendingName = name
    }
  }

  return cards
}
