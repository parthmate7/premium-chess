import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AI_DIFFICULTIES,
  parseStockfishBestMove,
  parseStockfishScore,
  STOCKFISH_ASSET_PATH,
} from '../src/engine/stockfish.js'

test('all six AI difficulty levels map to supported Stockfish strengths', () => {
  assert.deepEqual(
    Object.values(AI_DIFFICULTIES).map(({ label }) => label),
    ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert', 'Grandmaster'],
  )

  for (const difficulty of Object.values(AI_DIFFICULTIES)) {
    assert.ok(difficulty.elo >= 1320 && difficulty.elo <= 3190)
    assert.ok(difficulty.depth >= 1)
  }
})

test('parses legal UCI bestmove coordinates, including promotion', () => {
  assert.deepEqual(parseStockfishBestMove('bestmove e7e8q ponder a1a2'), {
    from: 'e7',
    to: 'e8',
    promotion: 'q',
  })
  assert.deepEqual(parseStockfishBestMove('bestmove e2e4'), {
    from: 'e2',
    to: 'e4',
    promotion: undefined,
  })
  assert.equal(parseStockfishBestMove('bestmove (none)'), null)
  assert.equal(parseStockfishBestMove('bestmove z9z1'), null)
})

test('parses centipawn and mate analysis from UCI info lines', () => {
  assert.deepEqual(parseStockfishScore('info depth 8 score cp 125 nodes 1000'), {
    type: 'cp',
    value: 125,
    label: '+1.25',
  })
  assert.deepEqual(parseStockfishScore('info depth 9 score mate -3 nodes 2000'), {
    type: 'mate',
    value: -3,
    label: 'Mate in 3',
  })
  assert.equal(parseStockfishScore('info depth 5 nodes 100'), null)
})

test('uses the self-hosted official Stockfish browser asset', () => {
  assert.equal(STOCKFISH_ASSET_PATH, '/stockfish/stockfish.js')
})
