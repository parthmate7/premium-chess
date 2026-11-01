export const STOCKFISH_ASSET_PATH = '/stockfish/stockfish.js'

export const AI_DIFFICULTIES = Object.freeze({
  beginner: Object.freeze({ label: 'Beginner', elo: 1320, depth: 5 }),
  easy: Object.freeze({ label: 'Easy', elo: 1600, depth: 7 }),
  medium: Object.freeze({ label: 'Medium', elo: 2000, depth: 10 }),
  hard: Object.freeze({ label: 'Hard', elo: 2400, depth: 13 }),
  expert: Object.freeze({ label: 'Expert', elo: 2800, depth: 16 }),
  grandmaster: Object.freeze({ label: 'Grandmaster', elo: 3190, depth: 18 }),
})

export function parseStockfishScore(message) {
  const scoreMatch = message.match(/\bscore (cp|mate) (-?\d+)/)
  if (!scoreMatch) return null

  const [, type, rawValue] = scoreMatch
  const value = Number(rawValue)
  if (!Number.isInteger(value)) return null

  return type === 'mate'
    ? { type, value, label: `Mate in ${Math.abs(value)}` }
    : {
        type,
        value,
        label: `${value > 0 ? '+' : ''}${(value / 100).toFixed(2)}`,
      }
}

export function parseStockfishBestMove(message) {
  const match = message.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?(?:\s|$)/)
  if (!match) return null

  return { from: match[1], to: match[2], promotion: match[3] }
}
