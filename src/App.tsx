import { useState } from 'react'
import ProbabilityCalculator from './components/ProbabilityCalculator'
import HandSimulator from './components/HandSimulator'
import DeckCodeImport from './components/DeckCodeImport'
import DeckList from './components/DeckList'
import AdBanner from './components/AdBanner'
import { getDecks, type SavedDeck } from './lib/deckStorage'

type Tab = 'deck' | 'opening' | 'side' | 'decklist'

export type CardEntry = { name: string; count: number }

export interface DualConditionData {
  cardCount1: number
  cardCount2: number
  unionCount: number
  deckSize: number
  cards1: CardEntry[]
  cards2: CardEntry[]
}

const HELP_ITEMS: { title: string; lines: string[] }[] = [
  {
    title: 'デッキ読込',
    lines: [
      'ポケモンカード公式サイトの「リスト表示」からデッキリストをコピーして貼り付けると、カードを読み込みます。',
      '貼り付け方：「ポケモン(枚数)」からページ右下のエネルギー欄まですべてドラッグで選択して貼り付けてください。',
      '読み込んだデッキは「デッキを保存する」ボタンで最大15件まで保存できます。一度貼り付けて保存すれば、次回からは保存済みデッキを選ぶだけで呼び出せます。',
      '「対象カードを選択」から初手で引きたいカードを選ぶと、確率分析タブに枚数が反映されます。',
    ],
  },
  {
    title: '確率分析',
    lines: [
      '選択したカードが初手に来る確率を超幾何分布で計算します。',
      '先攻・後攻ともに手札は8枚（7枚スタート＋1枚ドロー）で計算します。',
      '先攻時は、手札に含まれるサポートカードの枚数を指定して除外できます。',
      '「ドローサポート効果」をONにすると、サポートカードを引いて追加ドローした場合の確率上乗せも計算できます（後攻のみ）。',
      '複数条件（条件①②）を指定している場合は、それぞれの確率に加えてAND/ORの合算確率が表示されます。AND＝条件①と②が両方成立、OR＝どちらか一方でも成立する確率です。',
      '「固定カードを指定」では、対象カードの中から必ず1枚以上引きたいカードを選べます。固定カードの直引き確率と、「固定カード＋その他対象カード」が同時に手札にある確率が追加で表示されます。',
    ],
  },
  {
    title: '初手確認',
    lines: [
      '保存済みのデッキを使って、実際の試合の流れでシミュレーションができます。',
      '「シャッフルしてテスト開始」を押すと、手札7枚・1ターン目のドロー1枚・サイド6枚がランダムに表示されます。',
      'ボタンを繰り返し押すだけで何度でも試せます。',
      '「サイドは裏にしてテストをする」をONにすると、手札と山札46枚をヒントにサイド落ちカードを当てるゲームが遊べます。',
    ],
  },
  {
    title: 'デッキ一覧',
    lines: [
      '保存したデッキを一覧で確認・管理できます。',
      'デッキ名をタップするとカードの内訳が表示されます。',
      '「このデッキを読込」ボタンでデッキ読込タブに反映できます。',
      'デッキを展開して削除ボタンをタップすると削除できます（最大15件まで保存可能）。',
    ],
  },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('deck')
  const [cardCount, setCardCount] = useState(1)
  const [selectedCards, setSelectedCards] = useState<CardEntry[]>([])
  const [loadedDeck, setLoadedDeck] = useState<SavedDeck | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [openHelpIndex, setOpenHelpIndex] = useState<number | null>(null)
  const [activeDeckId, setActiveDeckId] = useState<string>('')
  const [dualConditionData, setDualConditionData] = useState<DualConditionData | null>(null)

  function handleCardCountChange(count: number, cards: CardEntry[]) {
    setCardCount(count)
    setSelectedCards(cards)
    setDualConditionData(null)
    setActiveTab('opening')
  }

  function handleDualConditionCalc(data: DualConditionData) {
    setDualConditionData(data)
    setActiveTab('opening')
  }

  function handleLoadDeck(deck: SavedDeck) {
    setLoadedDeck(deck)
    setActiveDeckId(deck.id)
    setActiveTab('deck')
  }

  function handleDeckSelect(id: string) {
    const deck = getDecks().find((d) => d.id === id)
    if (!deck) return
    setActiveDeckId(id)
    setLoadedDeck(deck)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-[50px]">
      <header className="bg-blue-800 text-white px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">ポケカデッキ分析ツール</h1>
            <p className="text-blue-200 text-xs mt-0.5">確率計算・デッキ分析</p>
          </div>
          <button
            onClick={() => { setShowHelp(true); setOpenHelpIndex(null) }}
            className="text-blue-200 text-xs underline shrink-0 active:text-white"
          >
            使い方はこちら
          </button>
        </div>
      </header>

      {/* 使い方モーダル */}
      {showHelp && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end"
          onClick={(e) => { if (e.target === e.currentTarget) setShowHelp(false) }}
        >
          <div className="bg-white rounded-t-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-700 text-sm">使い方</h3>
              <button onClick={() => setShowHelp(false)} className="text-gray-400 text-lg leading-none px-2">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-100">
              {HELP_ITEMS.map((item, i) => (
                <div key={item.title}>
                  <button
                    onClick={() => setOpenHelpIndex(openHelpIndex === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-4 active:bg-gray-50"
                  >
                    <span className="text-sm font-semibold text-gray-700">{item.title}</span>
                    <span className={`text-gray-400 text-xs transition-transform ${openHelpIndex === i ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {openHelpIndex === i && (
                    <div className="px-4 pb-4 space-y-2">
                      {item.lines.map((line, j) => (
                        <div key={j} className="flex gap-2">
                          <span className="text-blue-400 text-xs mt-0.5 shrink-0">•</span>
                          <p className="text-xs text-gray-600 leading-relaxed">{line}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav className="bg-white border-b border-gray-200 px-2 flex sticky top-0 z-10 shadow-sm">
        <TabButton active={activeTab === 'deck'} onClick={() => setActiveTab('deck')}>
          デッキ読込
        </TabButton>
        <TabButton active={activeTab === 'opening'} onClick={() => setActiveTab('opening')}>
          確率分析
        </TabButton>
        <TabButton active={activeTab === 'side'} onClick={() => setActiveTab('side')}>
          初手確認
        </TabButton>
        <TabButton active={activeTab === 'decklist'} onClick={() => setActiveTab('decklist')}>
          デッキ一覧
        </TabButton>
      </nav>

      <main className="px-4 py-5 max-w-lg mx-auto">
        {/* DeckCodeImport は常時マウントして状態を保持する */}
        <div className={activeTab === 'deck' ? '' : 'hidden'}>
          <DeckCodeImport
            cardCount={cardCount}
            onCardCountChange={handleCardCountChange}
            loadedDeck={loadedDeck}
            onDeckLoaded={() => setLoadedDeck(null)}
            onDeckSaved={(id) => setActiveDeckId(id)}
            onDualConditionCalc={handleDualConditionCalc}
          />
        </div>
        {activeTab === 'opening' && (
          <ProbabilityCalculator
            cardCount={cardCount}
            onCardCountChange={(v) => { setCardCount(v); setSelectedCards([]) }}
            dualCondition={dualConditionData}
            selectedCards={selectedCards}
          />
        )}
        {activeTab === 'side' && (
          <HandSimulator defaultDeckId={activeDeckId} onDeckSelect={handleDeckSelect} />
        )}
        {activeTab === 'decklist' && (
          <DeckList onLoadDeck={handleLoadDeck} />
        )}
      </main>

      <footer className="px-4 py-6 text-center">
        <p className="text-xs text-gray-400 leading-relaxed">
          本サイトは個人が制作した非公式のファンメイドツールです。<br />
          株式会社ポケモン・任天堂株式会社等とは関係ありません。
        </p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <a href="/terms.html" className="text-xs text-blue-500 underline">利用規約・免責事項</a>
          <a href="/privacy.html" className="text-xs text-blue-500 underline">プライバシーポリシー</a>
        </div>
      </footer>

      <AdBanner />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-3 text-xs font-medium border-b-2 transition-colors ${
        active
          ? 'border-blue-600 text-blue-700'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}
