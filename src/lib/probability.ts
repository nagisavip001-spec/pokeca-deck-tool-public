// 超幾何分布による確率計算

// 二項係数 C(n, k)
function combination(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  if (k === 0 || k === n) return 1
  k = Math.min(k, n - k)
  let result = 1
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1)
  }
  return result
}

// P(X = k): N枚のデッキからn枚引いたとき、K枚ある対象カードがk枚含まれる確率
export function hypergeometric(N: number, K: number, n: number, k: number): number {
  return (combination(K, k) * combination(N - K, n - k)) / combination(N, n)
}

// P(X >= k): k枚以上引く確率
export function hypergeometricAtLeast(N: number, K: number, n: number, k: number): number {
  let prob = 0
  for (let i = k; i <= Math.min(K, n); i++) {
    prob += hypergeometric(N, K, n, i)
  }
  return prob
}

// 初手8枚に特定カードがk枚以上来る確率（マリガンなし）
export function openingHandProb(deckSize: number, cardCount: number, drawCount: number, atLeast: number): number {
  return hypergeometricAtLeast(deckSize, cardCount, drawCount, atLeast)
}

// 特定カードがサイド落ちする確率（サイド6枚にk枚以上含まれる確率）
export function sideDropProb(deckSize: number, cardCount: number, atLeast: number): number {
  return hypergeometricAtLeast(deckSize, cardCount, 6, atLeast)
}

// ドローサポート効果を考慮した確率
// primaryCards: 引きたい非サポートカード枚数
// supporterCards: ドローサポート枚数（primaryとは別）
// drawCount: 初手枚数
// additionalDraw: サポート発動時の追加ドロー枚数
// 計算式: P(初手で主要牌) + P(初手でサポートのみ引く) × P(残りからさらに主要牌を引く)
export function supporterBoostProb(
  deckSize: number,
  primaryCards: number,
  supporterCards: number,
  drawCount: number,
  additionalDraw: number
): number {
  const D = deckSize, P = primaryCards, S = supporterCards, n = drawCount, m = additionalDraw
  if (P <= 0) return 0
  if (n >= D) return 1

  // P(初手n枚で主要牌≥1枚) = 1 - C(D-P, n) / C(D, n)
  const pPrimaryInInitial = 1 - combination(D - P, n) / combination(D, n)
  if (S <= 0 || m <= 0) return pPrimaryInInitial

  // P(初手で主要牌0枚 かつ サポート≥1枚)
  // = [C(D-P, n) - C(D-P-S, n)] / C(D, n)
  const pNoTargetWithSupporter =
    (combination(D - P, n) - combination(D - P - S, n)) / combination(D, n)

  // P(残りD-n枚からm枚引いて主要牌≥1枚) ※主要牌P枚は全部残っている（初手で0枚引いたため）
  const remaining = D - n
  const pPrimaryInBonus =
    remaining <= 0 ? 0 : 1 - combination(remaining - P, Math.min(m, remaining)) / combination(remaining, Math.min(m, remaining))

  return Math.min(1, pPrimaryInInitial + pNoTargetWithSupporter * pPrimaryInBonus)
}

// 複合確率計算（AND/OR）
// K1: 条件①のカード枚数, K2: 条件②のカード枚数, Kunion: 条件①∪②のカード枚数, n: 引く枚数
export function dualConditionProb(
  N: number,
  K1: number,
  K2: number,
  Kunion: number,
  n: number,
  mode: 'and' | 'or'
): number {
  if (K1 <= 0 && K2 <= 0) return 0
  const safeKunion = Math.min(Kunion, N)
  const pNone = combination(N - safeKunion, n) / combination(N, n)
  const pOr = 1 - pNone
  if (mode === 'or') return Math.min(1, Math.max(0, pOr))
  const p1 = K1 > 0 ? 1 - combination(N - Math.min(K1, N), n) / combination(N, n) : 0
  const p2 = K2 > 0 ? 1 - combination(N - Math.min(K2, N), n) / combination(N, n) : 0
  return Math.min(1, Math.max(0, p1 + p2 - pOr))
}

// 確率の分布テーブル（k=0,1,...,min(K,n)の各確率）
export function distributionTable(N: number, K: number, n: number): { count: number; prob: number; cumulative: number }[] {
  const rows = []
  let cumulative = 0
  for (let k = 0; k <= Math.min(K, n); k++) {
    const prob = hypergeometric(N, K, n, k)
    cumulative += prob
    rows.push({ count: k, prob, cumulative })
  }
  return rows
}
