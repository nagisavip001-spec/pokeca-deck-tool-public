import { useState, useMemo, useEffect } from 'react'
import { openingHandProb, distributionTable, supporterBoostProb, dualConditionProb } from '../lib/probability'
import ProbabilityBar from './ProbabilityBar'
import type { DualConditionData, CardEntry } from '../App'

interface Props {
  cardCount: number
  onCardCountChange: (v: number) => void
  dualCondition?: DualConditionData | null
  selectedCards?: CardEntry[]
}

export default function ProbabilityCalculator({
  cardCount,
  onCardCountChange,
  dualCondition,
  selectedCards = [],
}: Props) {
  const [deckSize, setDeckSize] = useState(60)
  const [drawCount, setDrawCount] = useState(8)
  const [atLeast, setAtLeast] = useState(1)
  const [isFirst, setIsFirst] = useState(false)
  const [supporterCount, setSupporterCount] = useState(0)

  // ドローサポート効果
  const [useSupporter, setUseSupporter] = useState(false)
  const [supporterDraw, setSupporterDraw] = useState(0)
  const [additionalDraw, setAdditionalDraw] = useState(8)

  // 複合条件 AND/OR
  const [dualMode, setDualMode] = useState<'and' | 'or'>('and')

  // 固定カード指定（シングルモード）
  const [fixedCardName, setFixedCardName] = useState<string | null>(null)
  const [showFixedSelector, setShowFixedSelector] = useState(false)

  // 固定カード指定（デュアルモード 条件①②）
  const [fixedCardName1, setFixedCardName1] = useState<string | null>(null)
  const [showFixedSelector1, setShowFixedSelector1] = useState(false)
  const [fixedCardName2, setFixedCardName2] = useState<string | null>(null)
  const [showFixedSelector2, setShowFixedSelector2] = useState(false)

  const isDual = !!dualCondition

  // selectedCards が変わったら固定カードリセット
  useEffect(() => {
    setFixedCardName(null)
    setShowFixedSelector(false)
  }, [selectedCards])

  // dualCondition が変わったら固定カードリセット
  useEffect(() => {
    setFixedCardName1(null)
    setFixedCardName2(null)
    setShowFixedSelector1(false)
    setShowFixedSelector2(false)
  }, [dualCondition])

  // ============ シングルモード計算 ============
  const effectiveCardCount = isFirst
    ? Math.max(0, cardCount - supporterCount)
    : cardCount

  const primaryCards = Math.max(0, effectiveCardCount - supporterDraw)

  const prob = useMemo(
    () => openingHandProb(deckSize, effectiveCardCount, drawCount, atLeast),
    [deckSize, effectiveCardCount, drawCount, atLeast]
  )

  const table = useMemo(
    () => distributionTable(deckSize, effectiveCardCount, drawCount),
    [deckSize, effectiveCardCount, drawCount]
  )

  const probNoSupporter = useMemo(
    () => openingHandProb(deckSize, primaryCards, drawCount, 1),
    [deckSize, primaryCards, drawCount]
  )

  const probWithSupporter = useMemo(
    () => supporterBoostProb(deckSize, primaryCards, supporterDraw, drawCount, additionalDraw),
    [deckSize, primaryCards, supporterDraw, drawCount, additionalDraw]
  )

  const probPercent = (prob * 100).toFixed(1)
  const showSupporterResult = useSupporter && !isFirst

  // 固定カード（シングル）
  const fixedEntry = useMemo(
    () => selectedCards.find((c) => c.name === fixedCardName) ?? null,
    [selectedCards, fixedCardName]
  )
  const fixedCount = fixedEntry?.count ?? 0
  const nonFixedCount = effectiveCardCount - fixedCount
  // 固定カードUIを出す条件: デッキ読込から来たカードが2種以上ある
  const canShowFixed = !isDual && selectedCards.length >= 2

  // P(固定≥1)
  const probFixed = useMemo(
    () => (canShowFixed && fixedCount > 0) ? openingHandProb(deckSize, fixedCount, drawCount, 1) : 0,
    [canShowFixed, deckSize, fixedCount, drawCount]
  )
  // P(固定≥1 AND その他≥1) = P(固定) + P(その他) - P(全体)
  const probFixedAndOther = useMemo(() => {
    if (!canShowFixed || fixedCount <= 0 || nonFixedCount <= 0) return 0
    const pOther = openingHandProb(deckSize, nonFixedCount, drawCount, 1)
    return Math.max(0, probFixed + pOther - prob)
  }, [canShowFixed, deckSize, fixedCount, nonFixedCount, drawCount, probFixed, prob])

  // ============ デュアルモード計算 ============
  const dualDeckSize = dualCondition?.deckSize ?? 60

  const p1 = useMemo(
    () => dualCondition ? openingHandProb(dualDeckSize, dualCondition.cardCount1, drawCount, 1) : 0,
    [dualCondition, dualDeckSize, drawCount]
  )
  const p2 = useMemo(
    () => dualCondition ? openingHandProb(dualDeckSize, dualCondition.cardCount2, drawCount, 1) : 0,
    [dualCondition, dualDeckSize, drawCount]
  )
  // デュアルモード：条件①②それぞれの固定カード
  const dualFixed1Entry = useMemo(
    () => (dualCondition?.cards1 ?? []).find((c) => c.name === fixedCardName1) ?? null,
    [dualCondition, fixedCardName1]
  )
  const dualFixed2Entry = useMemo(
    () => (dualCondition?.cards2 ?? []).find((c) => c.name === fixedCardName2) ?? null,
    [dualCondition, fixedCardName2]
  )
  const dualFixed1Count = dualFixed1Entry?.count ?? 0
  const dualFixed2Count = dualFixed2Entry?.count ?? 0
  const dualNonFixed1Count = (dualCondition?.cardCount1 ?? 0) - dualFixed1Count
  const dualNonFixed2Count = (dualCondition?.cardCount2 ?? 0) - dualFixed2Count

  // P(固定①), P(固定① AND その他①)
  const pDualFixed1 = useMemo(
    () => dualFixed1Count > 0 ? openingHandProb(dualDeckSize, dualFixed1Count, drawCount, 1) : 0,
    [dualDeckSize, dualFixed1Count, drawCount]
  )
  const pDualFixed1AndOther = useMemo(() => {
    if (dualFixed1Count <= 0 || dualNonFixed1Count <= 0) return 0
    const pOther = openingHandProb(dualDeckSize, dualNonFixed1Count, drawCount, 1)
    return Math.max(0, pDualFixed1 + pOther - p1)
  }, [dualDeckSize, dualFixed1Count, dualNonFixed1Count, drawCount, pDualFixed1, p1])

  // P(固定②), P(固定② AND その他②)
  const pDualFixed2 = useMemo(
    () => dualFixed2Count > 0 ? openingHandProb(dualDeckSize, dualFixed2Count, drawCount, 1) : 0,
    [dualDeckSize, dualFixed2Count, drawCount]
  )
  const pDualFixed2AndOther = useMemo(() => {
    if (dualFixed2Count <= 0 || dualNonFixed2Count <= 0) return 0
    const pOther = openingHandProb(dualDeckSize, dualNonFixed2Count, drawCount, 1)
    return Math.max(0, pDualFixed2 + pOther - p2)
  }, [dualDeckSize, dualFixed2Count, dualNonFixed2Count, drawCount, pDualFixed2, p2])

  // 固定カード選択状態に応じた有効な合算確率
  // 固定指定あり→その枚数を使用、なし→条件全体の枚数を使用
  const effectiveK1 = dualFixed1Count > 0 ? dualFixed1Count : (dualCondition?.cardCount1 ?? 0)
  const effectiveK2 = dualFixed2Count > 0 ? dualFixed2Count : (dualCondition?.cardCount2 ?? 0)
  const effectiveUnionCount = useMemo(() => {
    if (!dualCondition) return 0
    const names1 = dualFixed1Count > 0 && fixedCardName1
      ? new Set([fixedCardName1])
      : new Set(dualCondition.cards1.map((c) => c.name))
    const names2 = dualFixed2Count > 0 && fixedCardName2
      ? new Set([fixedCardName2])
      : new Set(dualCondition.cards2.map((c) => c.name))
    const unionNames = new Set([...names1, ...names2])
    const allCards = [...dualCondition.cards1, ...dualCondition.cards2]
    return [...unionNames].reduce((s, name) => {
      const card = allCards.find((c) => c.name === name)
      return s + (card?.count ?? 0)
    }, 0)
  }, [dualCondition, dualFixed1Count, dualFixed2Count, fixedCardName1, fixedCardName2])

  const pEffectiveCombined = useMemo(
    () => dualCondition
      ? dualConditionProb(dualDeckSize, effectiveK1, effectiveK2, effectiveUnionCount, drawCount, dualMode)
      : 0,
    [dualCondition, dualDeckSize, effectiveK1, effectiveK2, effectiveUnionCount, drawCount, dualMode]
  )

  const combinedLabel = (() => {
    const and = dualMode === 'and'
    if (dualFixed1Count > 0 && dualFixed2Count > 0)
      return and ? '【AND】固定①直引き　かつ　固定②直引き' : '【OR】固定①または固定②を直引き'
    if (dualFixed1Count > 0)
      return and ? '【AND】固定①直引き　かつ　条件②成立' : '【OR】固定①直引き　または　条件②成立'
    if (dualFixed2Count > 0)
      return and ? '【AND】条件①成立　かつ　固定②直引き' : '【OR】条件①成立　または　固定②直引き'
    return and ? '【AND】全体　両方成立' : '【OR】全体　どちらか成立'
  })()

  return (
    <div className="space-y-5">
      {/* 先攻・後攻トグル */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm">ターン選択</h2>
        <div className="flex rounded-xl overflow-hidden border border-gray-200 text-sm font-semibold">
          <button
            onClick={() => setIsFirst(false)}
            className={`flex-1 py-2.5 transition-colors ${!isFirst ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}
          >
            後攻
          </button>
          <button
            onClick={() => setIsFirst(true)}
            className={`flex-1 py-2.5 transition-colors ${isFirst ? 'bg-blue-600 text-white' : 'bg-white text-gray-500'}`}
          >
            先攻
          </button>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          先攻を選択した場合、サポートカードは原則使用できない為、確率計算から除外されます。
        </p>
      </section>

      {/* 設定 */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm">設定</h2>

        <NumberInput label="デッキ枚数" value={deckSize} min={1} max={60} onChange={setDeckSize} />

        {!isDual && (
          <>
            <NumberInput label="対象カードの枚数" value={cardCount} min={0} max={deckSize} onChange={onCardCountChange} />
            {isFirst && (
              <div className="pl-3 border-l-2 border-blue-200 space-y-3">
                <NumberInput label="うちサポートカード" value={supporterCount} min={0} max={cardCount} onChange={setSupporterCount} />
                <p className="text-xs text-blue-600">
                  実質対象: {effectiveCardCount}枚（{cardCount}枚 − サポート{supporterCount}枚）
                </p>
              </div>
            )}
          </>
        )}

        {isDual && (
          <div className="space-y-1 bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
            <p>条件① <span className="font-bold text-gray-700">{dualCondition!.cardCount1}枚</span>　条件② <span className="font-bold text-gray-700">{dualCondition!.cardCount2}枚</span></p>
            <p>デッキ <span className="font-bold text-gray-700">{dualDeckSize}枚</span>（デッキ読込タブで設定）</p>
          </div>
        )}

        <NumberInput label="引く枚数（初手）" value={drawCount} min={1} max={deckSize} onChange={setDrawCount} />
        {!isDual && (
          <NumberInput
            label="何枚以上引きたいか"
            value={atLeast}
            min={1}
            max={Math.min(effectiveCardCount, drawCount)}
            onChange={setAtLeast}
          />
        )}
      </section>

      {/* ドローサポート効果（シングルモード・後攻時のみ） */}
      {!isDual && !isFirst && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setUseSupporter((v) => !v)}
              className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${useSupporter ? 'bg-blue-600' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${useSupporter ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-semibold text-gray-700">ドローサポート効果を含める</span>
          </label>

          {useSupporter && (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-gray-500">対象 <span className="font-bold text-gray-700">{effectiveCardCount}</span> 枚中</p>
              <NumberInput label="うちドローサポート" value={supporterDraw} min={0} max={effectiveCardCount} onChange={setSupporterDraw} />
              <NumberInput label="追加ドロー枚数" value={additionalDraw} min={1} max={deckSize - drawCount} onChange={setAdditionalDraw} />
              <p className="text-xs text-gray-400 leading-relaxed">
                初手にドローサポートを引いた場合、さらに{additionalDraw}枚引けるとして計算します。
              </p>
            </div>
          )}
        </section>
      )}

      {/* 結果 */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
        <h2 className="font-semibold text-gray-700 text-sm">結果</h2>

        {isDual ? (
          /* ===== 複合条件モード ===== */
          <div className="space-y-3">
            {/* 条件① ② 横並び */}
            <div className="flex items-start gap-2">
              {/* 条件① */}
              <div className="flex-1 bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
                <p className="text-xs text-blue-500 font-medium text-center">条件①</p>
                <div className="text-center">
                  <p className="text-xs text-gray-400">全体 {dualCondition!.cardCount1}枚</p>
                  <div className={`text-3xl font-bold leading-tight ${probColor(p1)}`}>{(p1 * 100).toFixed(1)}%</div>
                  <ProbabilityBar value={p1} />
                </div>
                {dualFixed1Count > 0 && (
                  <div className="border-t border-blue-100 pt-2 space-y-1 text-center">
                    <p className="text-xs text-blue-400">固定 {dualFixed1Count}枚</p>
                    <div className={`text-xl font-bold ${probColor(pDualFixed1)}`}>{(pDualFixed1 * 100).toFixed(1)}%</div>
                    {dualNonFixed1Count > 0 && (
                      <div className="bg-blue-100 rounded-lg px-2 py-1">
                        <p className="text-xs text-blue-600 font-medium">固定＋その他</p>
                        <div className={`text-lg font-bold ${probColor(pDualFixed1AndOther)}`}>{(pDualFixed1AndOther * 100).toFixed(1)}%</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AND/OR トグル */}
              <div className="flex flex-col gap-1.5 shrink-0 mt-6">
                <button
                  onClick={() => setDualMode('and')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    dualMode === 'and' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >AND</button>
                <button
                  onClick={() => setDualMode('or')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                    dualMode === 'or' ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-400 border-gray-200'
                  }`}
                >OR</button>
              </div>

              {/* 条件② */}
              <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2">
                <p className="text-xs text-indigo-500 font-medium text-center">条件②</p>
                <div className="text-center">
                  <p className="text-xs text-gray-400">全体 {dualCondition!.cardCount2}枚</p>
                  <div className={`text-3xl font-bold leading-tight ${probColor(p2)}`}>{(p2 * 100).toFixed(1)}%</div>
                  <ProbabilityBar value={p2} />
                </div>
                {dualFixed2Count > 0 && (
                  <div className="border-t border-indigo-100 pt-2 space-y-1 text-center">
                    <p className="text-xs text-indigo-400">固定 {dualFixed2Count}枚</p>
                    <div className={`text-xl font-bold ${probColor(pDualFixed2)}`}>{(pDualFixed2 * 100).toFixed(1)}%</div>
                    {dualNonFixed2Count > 0 && (
                      <div className="bg-indigo-100 rounded-lg px-2 py-1">
                        <p className="text-xs text-indigo-600 font-medium">固定＋その他</p>
                        <div className={`text-lg font-bold ${probColor(pDualFixed2AndOther)}`}>{(pDualFixed2AndOther * 100).toFixed(1)}%</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 固定カード指定（条件①②） */}
            <FixedCardSelector
              label="条件①の固定カードを指定"
              cards={dualCondition!.cards1}
              fixedCardName={fixedCardName1}
              onFixedCardChange={setFixedCardName1}
              showSelector={showFixedSelector1}
              onToggleSelector={() => setShowFixedSelector1((v) => !v)}
              accentColor="blue"
            />
            <FixedCardSelector
              label="条件②の固定カードを指定"
              cards={dualCondition!.cards2}
              fixedCardName={fixedCardName2}
              onFixedCardChange={setFixedCardName2}
              showSelector={showFixedSelector2}
              onToggleSelector={() => setShowFixedSelector2((v) => !v)}
              accentColor="indigo"
            />

            {/* 合算確率 */}
            <div className={`rounded-xl p-4 text-center ${dualMode === 'and' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}`}>
              <p className="text-xs font-medium opacity-80 mb-0.5">{combinedLabel}</p>
              <div className="text-5xl font-bold leading-none">{(pEffectiveCombined * 100).toFixed(1)}%</div>
              <p className="text-xs opacity-70 mt-1">{drawCount}枚引いたとき</p>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed text-center">
              {dualMode === 'and' ? '条件①が成立した上で、さらに条件②も成立する確率です。' : '条件①・条件②のどちらか一方でも成立する確率（両方成立も含む）です。'}
            </p>
          </div>

        ) : showSupporterResult ? (
          /* ===== サポート効果あり ===== */
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1.5">サポートなし</p>
                <div className={`text-3xl font-bold ${probColor(probNoSupporter)}`}>{(probNoSupporter * 100).toFixed(1)}%</div>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                <p className="text-xs text-blue-500 mb-1.5">サポートあり</p>
                <div className={`text-3xl font-bold ${probColor(probWithSupporter)}`}>{(probWithSupporter * 100).toFixed(1)}%</div>
              </div>
            </div>
            <p className="text-center text-xs text-blue-600 font-medium">
              ドローサポートによる上乗せ +{((probWithSupporter - probNoSupporter) * 100).toFixed(1)}%
            </p>
            <ProbabilityBar value={probWithSupporter} />
          </div>

        ) : (
          /* ===== シングルモード通常 ===== */
          <>
            <div className="text-center py-2">
              <div className={`text-5xl font-bold ${probColor(prob)}`}>{probPercent}%</div>
              <p className="text-gray-500 text-xs mt-1">{drawCount}枚引いて{atLeast}枚以上引ける確率</p>
            </div>
            <ProbabilityBar value={prob} />
          </>
        )}
      </section>

      {/* 固定カード指定（シングルモード・デッキ読込からのカードがある場合） */}
      {canShowFixed && !showSupporterResult && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <FixedCardSelector
            label="固定カードを指定（任意）"
            cards={selectedCards}
            fixedCardName={fixedCardName}
            onFixedCardChange={setFixedCardName}
            showSelector={showFixedSelector}
            onToggleSelector={() => setShowFixedSelector((v) => !v)}
            accentColor="blue"
            hint="選択した対象カードのうち、必ず1枚以上引きたいカードを1種類選択"
          />

          {fixedCount > 0 && (
            <div className="space-y-3 pt-1 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                {/* 全体確率 */}
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">全体（{effectiveCardCount}枚）</p>
                  <p className="text-xs text-gray-300 mb-1">どれか1枚</p>
                  <div className={`text-3xl font-bold ${probColor(prob)}`}>{probPercent}%</div>
                  <ProbabilityBar value={prob} />
                </div>
                {/* 固定カード確率 */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-500 mb-0.5">固定（{fixedCount}枚）</p>
                  <p className="text-xs text-blue-300 mb-1">直引き</p>
                  <div className={`text-3xl font-bold ${probColor(probFixed)}`}>{(probFixed * 100).toFixed(1)}%</div>
                  <ProbabilityBar value={probFixed} />
                </div>
              </div>

              {/* 固定 AND その他 */}
              {nonFixedCount > 0 && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-600 font-medium mb-0.5">固定カード直引き AND その他対象カード</p>
                  <p className="text-xs text-gray-400 mb-1">両方手札にある確率</p>
                  <div className={`text-4xl font-bold ${probColor(probFixedAndOther)}`}>
                    {(probFixedAndOther * 100).toFixed(1)}%
                  </div>
                  <div className="mt-2">
                    <ProbabilityBar value={probFixedAndOther} />
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-400 leading-relaxed text-center">
                全体：サーチカードでアクセスできる確率 ／ 固定：直接引ける確率
                {nonFixedCount > 0 && ' ／ AND：両方同時に手札にある確率'}
              </p>
            </div>
          )}
        </section>
      )}

      {/* 枚数別確率テーブル（シングルモード・サポート効果OFF・固定未指定時のみ） */}
      {!isDual && !showSupporterResult && fixedCount === 0 && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="font-semibold text-gray-700 text-sm mb-3">枚数別確率</h2>
          <div className="space-y-2">
            {table.map(({ count, prob: p }) => (
              <div key={count} className="flex items-center gap-3">
                <span className="text-xs text-gray-500 w-12 shrink-0 text-right">{count}枚</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(p * 100).toFixed(1)}%` }} />
                </div>
                <span className="text-xs font-mono text-gray-600 w-12 shrink-0">{(p * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// 固定カード選択UIコンポーネント
function FixedCardSelector({
  label,
  cards,
  fixedCardName,
  onFixedCardChange,
  showSelector,
  onToggleSelector,
  accentColor,
  hint,
}: {
  label: string
  cards: CardEntry[]
  fixedCardName: string | null
  onFixedCardChange: (name: string | null) => void
  showSelector: boolean
  onToggleSelector: () => void
  accentColor: 'blue' | 'indigo'
  hint?: string
}) {
  if (cards.length < 2) return null

  const colorMap = {
    blue: {
      bg: 'bg-gray-50',
      badge: 'text-blue-600 bg-blue-100',
      radio: 'accent-blue-600',
      active: 'bg-blue-50',
      label: 'text-gray-600',
      hint: 'text-gray-400',
    },
    indigo: {
      bg: 'bg-indigo-50',
      badge: 'text-indigo-600 bg-indigo-100',
      radio: 'accent-indigo-600',
      active: 'bg-indigo-100',
      label: 'text-indigo-700',
      hint: 'text-indigo-400',
    },
  }
  const c = colorMap[accentColor]

  return (
    <div className={`${c.bg} rounded-xl p-3 space-y-2`}>
      <button onClick={onToggleSelector} className="w-full flex items-center justify-between text-left">
        <div>
          <span className={`text-xs font-medium ${c.label}`}>{label}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {fixedCardName && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>{fixedCardName}</span>
          )}
          <span className={`text-gray-400 text-xs transition-transform ${showSelector ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {showSelector && (
        <div className="space-y-1 pt-1 border-t border-gray-200">
          {hint && <p className={`text-xs pb-1 ${c.hint}`}>{hint}</p>}
          <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-gray-100">
            <input
              type="radio"
              checked={fixedCardName === null}
              onChange={() => onFixedCardChange(null)}
              className={`w-4 h-4 ${c.radio} shrink-0`}
            />
            <span className="text-sm text-gray-500">指定しない</span>
          </label>
          {cards.map((card) => (
            <label
              key={card.name}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                fixedCardName === card.name ? c.active : 'hover:bg-gray-100'
              }`}
            >
              <input
                type="radio"
                checked={fixedCardName === card.name}
                onChange={() => onFixedCardChange(card.name)}
                className={`w-4 h-4 ${c.radio} shrink-0`}
              />
              <span className="flex-1 text-sm text-gray-800 truncate">{card.name}</span>
              <span className="text-xs font-mono text-gray-400 shrink-0">×{card.count}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function NumberInput({
  label, value, min, max, onChange,
}: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-gray-600 shrink-0">{label}</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-lg flex items-center justify-center active:bg-gray-200 select-none"
        >−</button>
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
        >＋</button>
      </div>
    </div>
  )
}

function probColor(prob: number): string {
  if (prob >= 0.8) return 'text-green-600'
  if (prob >= 0.5) return 'text-yellow-600'
  return 'text-red-500'
}
