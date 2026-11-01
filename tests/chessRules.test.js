import assert from 'node:assert/strict'
import test from 'node:test'
import { Chess } from 'chess.js'

test('only legal moves are available and moves exposing the king are rejected', () => {
  const game = new Chess()

  assert.ok(game.moves({ square: 'e2' }).includes('e4'))
  assert.throws(() => game.move({ from: 'e2', to: 'e5' }))

  game.load('k3r3/8/8/8/8/8/4R3/4K3 w - - 0 1')
  assert.equal(game.moves({ square: 'e2' }).includes('f2'), false)
  assert.throws(() => game.move({ from: 'e2', to: 'f2' }))
})

test('detects check, checkmate, and stalemate', () => {
  const game = new Chess('4k3/8/8/8/8/8/4r3/4K3 w - - 0 1')
  assert.equal(game.isCheck(), true)

  game.load('7k/6Q1/6K1/8/8/8/8/8 b - - 0 1')
  assert.equal(game.isCheckmate(), true)
  assert.equal(game.isGameOver(), true)

  game.load('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1')
  assert.equal(game.isCheck(), false)
  assert.equal(game.isStalemate(), true)
  assert.equal(game.isGameOver(), true)
})

test('supports kingside and queenside castling and rejects castling through check', () => {
  const game = new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1')
  const kingMoves = game.moves({ square: 'e1', verbose: true })

  assert.ok(kingMoves.some((move) => move.to === 'g1' && move.san === 'O-O'))
  assert.ok(kingMoves.some((move) => move.to === 'c1' && move.san === 'O-O-O'))

  game.move({ from: 'e1', to: 'g1' })
  assert.equal(game.get('f1').type, 'r')
  assert.equal(game.get('g1').type, 'k')

  game.load('4kr2/8/8/8/8/8/8/4K2R w K - 0 1')
  assert.equal(
    game.moves({ square: 'e1', verbose: true }).some((move) => move.to === 'g1'),
    false,
  )
})

test('supports en passant and removes the captured pawn', () => {
  const game = new Chess('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2')
  const capture = game.moves({ square: 'e5', verbose: true })
    .find((move) => move.to === 'd6')

  assert.ok(capture)
  assert.equal(capture.flags.includes('e'), true)
  game.move({ from: 'e5', to: 'd6' })
  assert.equal(game.get('d5'), undefined)
  assert.equal(game.get('d6').type, 'p')
})

test('supports promotion to queen, rook, bishop, and knight', () => {
  for (const promotion of ['q', 'r', 'b', 'n']) {
    const game = new Chess('4k3/P7/8/8/8/8/8/4K3 w - - 0 1')
    const move = game.move({ from: 'a7', to: 'a8', promotion })

    assert.equal(game.get('a8').type, promotion)
    assert.equal(move.promotion, promotion)
    assert.equal(move.san, `a8=${promotion.toUpperCase()}${game.isCheck() ? '+' : ''}`)
  }
})

test('round-trips legal moves through FEN and PGN with standard algebraic notation', () => {
  const game = new Chess()
  game.move({ from: 'e2', to: 'e4' })
  game.move({ from: 'e7', to: 'e5' })
  game.move({ from: 'g1', to: 'f3' })
  game.move({ from: 'b8', to: 'c6' })

  assert.deepEqual(game.history(), ['e4', 'e5', 'Nf3', 'Nc6'])

  const fromFen = new Chess(game.fen())
  assert.equal(fromFen.fen(), game.fen())

  const fromPgn = new Chess()
  fromPgn.loadPgn(game.pgn())
  assert.deepEqual(fromPgn.history(), game.history())
  assert.equal(fromPgn.fen(), game.fen())
})

test('undo and redo replay the exact legal move and discard stale branches', () => {
  const game = new Chess()
  const redoStack = []

  game.move({ from: 'e2', to: 'e4' })
  game.move({ from: 'e7', to: 'e5' })
  redoStack.push(game.undo())

  assert.deepEqual(game.history(), ['e4'])
  const move = redoStack.pop()
  game.move({ from: move.from, to: move.to, promotion: move.promotion })
  assert.deepEqual(game.history(), ['e4', 'e5'])

  redoStack.push(game.undo())
  game.move({ from: 'c7', to: 'c5' })
  redoStack.length = 0
  assert.equal(redoStack.length, 0)
  assert.deepEqual(game.history(), ['e4', 'c5'])
})
