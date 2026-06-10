export interface DeckCard {
  name: string
  count: number
  category: string
}

export interface SavedDeck {
  id: string
  name: string
  code: string
  cards: DeckCard[]
  savedAt: string
  totalCards: number
}

const STORAGE_KEY = 'pokeca-saved-decks'
const MAX_DECKS = 15

export function getDecks(): SavedDeck[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SavedDeck[]) : []
  } catch {
    return []
  }
}

export function saveDeck(deck: Omit<SavedDeck, 'id' | 'savedAt'>): SavedDeck {
  const decks = getDecks()
  const newDeck: SavedDeck = {
    ...deck,
    id: Date.now().toString(),
    savedAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify([newDeck, ...decks].slice(0, MAX_DECKS)))
  return newDeck
}

export function deleteDeck(id: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getDecks().filter((d) => d.id !== id)))
}

export function formatSavedAt(isoString: string): string {
  const d = new Date(isoString)
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${y}/${mo}/${day} ${h}:${mi}`
}

export function autoName(): string {
  const d = new Date()
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `デッキ(${y}${mo}${day}_${h}${mi})`
}
