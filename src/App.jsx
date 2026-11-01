import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Ad } from './ads/Ad.jsx'
import {
  AI_DIFFICULTIES,
  parseStockfishBestMove,
  parseStockfishScore,
  STOCKFISH_ASSET_PATH,
} from './engine/stockfish.js'
import './App.css'

const STARTING_TIME = 10 * 60

const PIECE_SYMBOLS = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
}

const PIECE_NAMES = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
}

function Icon({ name, size = 18 }) {
  const paths = {
    board: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M12 3v18M3 12h18" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
      </>
    ),
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
    undo: (
      <>
        <path d="M9 14 4 9l5-5" />
        <path d="M4 9h10a6 6 0 0 1 0 12h-2" />
      </>
    ),
    redo: (
      <>
        <path d="m15 14 5-5-5-5" />
        <path d="M20 9H10a6 6 0 0 0 0 12h2" />
      </>
    ),
    flip: (
      <>
        <path d="m8 3-5 5 5 5" />
        <path d="M3 8h13a5 5 0 0 1 0 10h-2" />
        <path d="m16 21 5-5-5-5" />
        <path d="M21 16H8a5 5 0 0 1 0-10h2" />
      </>
    ),
    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    sparkle: (
      <>
        <path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" />
        <path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z" />
      </>
    ),
    crown: (
      <>
        <path d="m3 8 5 4 4-7 4 7 5-4-2 11H5L3 8Z" />
        <path d="M6 22h12" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    bot: (
      <>
        <rect x="4" y="7" width="16" height="13" rx="3" />
        <path d="M12 3v4m-4 5h.01M16 12h.01M9 16h6M2 12h2m16 0h2" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

function formatClock(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function App({ isPremium = false }) {
  const [game] = useState(() => new Chess())
  const engineWorkerRef = useRef(null)
  const engineRequestRef = useRef(null)
  const whiteClockRef = useRef(STARTING_TIME)
  const blackClockRef = useRef(STARTING_TIME)
  const moveListRef = useRef(null)
  const [board, setBoard] = useState(() => game.board())
  const [history, setHistory] = useState([])
  const [redoCount, setRedoCount] = useState(0)
  const [selectedSquare, setSelectedSquare] = useState(null)
  const [legalSquares, setLegalSquares] = useState([])
  const [pendingPromotion, setPendingPromotion] = useState(null)
  const [gameDataFormat, setGameDataFormat] = useState(null)
  const [gameDataText, setGameDataText] = useState('')
  const [gameDataError, setGameDataError] = useState('')
  const [gameMode, setGameMode] = useState('friends')
  const [playerColor, setPlayerColor] = useState('w')
  const [aiDifficulty, setAiDifficulty] = useState('beginner')
  const [engineStatus, setEngineStatus] = useState('idle')
  const [engineError, setEngineError] = useState('')
  const [engineScore, setEngineScore] = useState(null)
  const [engineVersion, setEngineVersion] = useState(0)
  const [clockStarted, setClockStarted] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [whiteTime, setWhiteTime] = useState(STARTING_TIME)
  const [blackTime, setBlackTime] = useState(STARTING_TIME)
  const [flagged, setFlagged] = useState(null)
  const redoStackRef = useRef([])

  const moves = game.history({ verbose: true })
  const lastMove = moves[moves.length - 1]
  const sideToMove = game.turn()
  const isGameOver = game.isGameOver() || flagged !== null
  const isMatchActive = clockStarted && !isGameOver
  const showLobbyAds = !clockStarted && !isGameOver
  const isComputerGame = gameMode === 'computer'
  const isComputerTurn = isComputerGame && sideToMove !== playerColor
  const isHumanTurn = !isComputerGame || sideToMove === playerColor

  useEffect(() => {
    if (!clockStarted || isGameOver) return undefined

    const timerId = window.setInterval(() => {
      const activeColor = game.turn()
      const clockRef = activeColor === 'w' ? whiteClockRef : blackClockRef
      const setClock = activeColor === 'w' ? setWhiteTime : setBlackTime

      if (clockRef.current <= 1) {
        clockRef.current = 0
        setClock(0)
        setFlagged(activeColor)
        setPendingPromotion(null)
        return
      }

      clockRef.current -= 1
      setClock(clockRef.current)
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [clockStarted, game, isGameOver])

  useEffect(() => {
    if (!isComputerGame) {
      return undefined
    }

    let active = true
    let startupTimeout
    let worker

    try {
      worker = new Worker(STOCKFISH_ASSET_PATH, { name: 'stockfish-engine' })
    } catch (error) {
      // oxlint-disable-next-line react/set-state-in-effect -- Surface synchronous Worker failures immediately.
      setEngineStatus('error')
      setEngineError(
        error instanceof Error ? error.message : 'Stockfish could not be started.',
      )
      return undefined
    }

    engineWorkerRef.current = worker
    engineRequestRef.current = null

    startupTimeout = window.setTimeout(() => {
      if (active) {
        setEngineStatus('error')
        setEngineError('Stockfish took too long to start. Check that the engine files are available.')
      }
    }, 20000)

    worker.onmessage = (event) => {
      const line = String(event.data).trim()

      if (line === 'uciok') {
        const difficulty = AI_DIFFICULTIES[aiDifficulty]
        worker.postMessage('setoption name Threads value 1')
        worker.postMessage('setoption name Hash value 16')
        worker.postMessage('setoption name UCI_LimitStrength value true')
        worker.postMessage(`setoption name UCI_Elo value ${difficulty.elo}`)
        worker.postMessage('isready')
        return
      }

      if (line === 'readyok') {
        window.clearTimeout(startupTimeout)
        if (active) setEngineStatus('ready')
        return
      }

      if (line.startsWith('info ')) {
        const score = parseStockfishScore(line)
        if (score && active) setEngineScore(score)
        return
      }

      if (line.startsWith('bestmove ')) {
        const request = engineRequestRef.current
        engineRequestRef.current = null

        if (
          !active ||
          !request ||
          !isComputerGame ||
          game.fen() !== request.fen ||
          game.turn() === playerColor ||
          game.isGameOver()
        ) {
          if (active) setEngineStatus('ready')
          return
        }

        const move = parseStockfishBestMove(line)
        if (!move) {
          setEngineStatus('ready')
          return
        }

        const isLegal = game.moves({ verbose: true }).some(
          (legalMove) =>
            legalMove.from === move.from &&
            legalMove.to === move.to &&
            legalMove.promotion === move.promotion,
        )

        if (!isLegal) {
          setEngineStatus('error')
          setEngineError(`Stockfish returned an illegal move: ${move.from}${move.to}.`)
          return
        }

        try {
          game.move(move)
        } catch (error) {
          setEngineStatus('error')
          setEngineError(
            error instanceof Error ? error.message : 'Stockfish returned an invalid move.',
          )
          return
        }

        redoStackRef.current = []
        setRedoCount(0)
        setEngineStatus('ready')
        setBoard(game.board())
        setHistory(game.history())
        setSelectedSquare(null)
        setLegalSquares([])
        setPendingPromotion(null)
      }
    }

    worker.onerror = (event) => {
      if (!active) return
      window.clearTimeout(startupTimeout)
      setEngineStatus('error')
      setEngineError(event.message || 'The Stockfish engine failed to load.')
    }

    worker.postMessage('uci')

    return () => {
      active = false
      window.clearTimeout(startupTimeout)
      engineRequestRef.current = null
      worker.postMessage('stop')
      worker.terminate()
      if (engineWorkerRef.current === worker) engineWorkerRef.current = null
    }
  }, [aiDifficulty, engineVersion, game, isComputerGame, playerColor])

  useEffect(() => {
    if (
      !isComputerGame ||
      engineStatus !== 'ready' ||
      !isComputerTurn ||
      isGameOver ||
      flagged
    ) {
      return undefined
    }

    const worker = engineWorkerRef.current
    if (!worker) return undefined

    const request = { fen: game.fen() }
    engineRequestRef.current = request
    setEngineStatus('thinking')
    setEngineScore(null)
    worker.postMessage(`position fen ${request.fen}`)
    worker.postMessage(`go depth ${AI_DIFFICULTIES[aiDifficulty].depth}`)

    return () => {
      if (engineRequestRef.current === request) {
        engineRequestRef.current = null
        worker.postMessage('stop')
      }
    }
  }, [
    aiDifficulty,
    engineStatus,
    flagged,
    game,
    history.length,
    isComputerGame,
    isComputerTurn,
    isGameOver,
  ])

  useEffect(() => {
    if (moveListRef.current) {
      moveListRef.current.scrollTop = moveListRef.current.scrollHeight
    }
  }, [history.length])

  function refreshGame() {
    setBoard(game.board())
    setHistory(game.history())
    setSelectedSquare(null)
    setLegalSquares([])
    setPendingPromotion(null)
  }

  function makeMove(from, to, promotion) {
    if (flagged || game.isGameOver() || !isHumanTurn) return
    game.move({ from, to, promotion })
    redoStackRef.current = []
    setRedoCount(0)
    setClockStarted(true)
    setEngineScore(null)
    refreshGame()
  }

  function chooseSquare(square) {
    if (isGameOver || pendingPromotion || !isHumanTurn) return

    if (selectedSquare && legalSquares.includes(square)) {
      const promotionMove = game
        .moves({ square: selectedSquare, verbose: true })
        .find((move) => move.to === square && move.promotion)

      if (promotionMove) {
        setPendingPromotion({
          from: selectedSquare,
          to: square,
          color: sideToMove,
        })
        setSelectedSquare(null)
        setLegalSquares([])
        return
      }

      makeMove(selectedSquare, square)
      return
    }

    const piece = game.get(square)
    if (piece?.color === sideToMove) {
      setSelectedSquare(square)
      setLegalSquares(
        game.moves({ square, verbose: true }).map((move) => move.to),
      )
      return
    }

    setSelectedSquare(null)
    setLegalSquares([])
  }

  function undoMove() {
    if (flagged) return
    const undoneMove = game.undo()
    if (!undoneMove) return
    redoStackRef.current.push(undoneMove)
    if (isComputerGame && game.turn() !== playerColor) {
      const humanMove = game.undo()
      if (humanMove) redoStackRef.current.push(humanMove)
    }
    setRedoCount(redoStackRef.current.length)
    setEngineScore(null)
    refreshGame()
  }

  function redoMove() {
    if (flagged || game.isGameOver()) return
    const move = redoStackRef.current.pop()
    if (!move) return
    setRedoCount(redoStackRef.current.length)
    game.move({ from: move.from, to: move.to, promotion: move.promotion })
    if (isComputerGame && redoStackRef.current.length > 0) {
      const reply = redoStackRef.current[redoStackRef.current.length - 1]
      if (reply.color !== playerColor) {
        redoStackRef.current.pop()
        game.move({ from: reply.from, to: reply.to, promotion: reply.promotion })
        setRedoCount(redoStackRef.current.length)
      }
    }
    setClockStarted(true)
    setEngineScore(null)
    refreshGame()
  }

  function resetGame({ mode = gameMode, color = playerColor, difficulty = aiDifficulty } = {}) {
    game.reset()
    redoStackRef.current = []
    setRedoCount(0)
    setGameMode(mode)
    setPlayerColor(color)
    setAiDifficulty(difficulty)
    setFlipped(mode === 'computer' && color === 'b')
    setClockStarted(mode === 'computer' && color === 'b')
    setEngineStatus(mode === 'computer' ? 'loading' : 'idle')
    setEngineError('')
    setEngineScore(null)
    setEngineVersion((version) => version + 1)
    setPendingPromotion(null)
    setSelectedSquare(null)
    whiteClockRef.current = STARTING_TIME
    blackClockRef.current = STARTING_TIME
    setWhiteTime(STARTING_TIME)
    setBlackTime(STARTING_TIME)
    setFlagged(null)
    refreshGame()
  }

  function startNewGame() {
    resetGame({
      mode: gameMode,
      color: playerColor,
      difficulty: aiDifficulty,
    })
  }

  function restartGame() {
    resetGame()
  }

  function selectGameMode(mode) {
    if (mode === gameMode) return
    if (
      (history.length > 0 || isMatchActive) &&
      !window.confirm('Starting another mode will end this game. Continue?')
    ) {
      return
    }

    resetGame({
      mode,
      color: mode === 'computer' ? playerColor : 'w',
      difficulty: aiDifficulty,
    })
  }

  function selectComputerColor(color) {
    if (history.length > 0) return
    resetGame({ mode: 'computer', color, difficulty: aiDifficulty })
  }

  function selectDifficulty(difficulty) {
    if (history.length > 0 || !AI_DIFFICULTIES[difficulty]) return
    setAiDifficulty(difficulty)
    setEngineStatus('loading')
    setEngineError('')
    setEngineScore(null)
  }

  function openGameData(format) {
    setGameDataFormat(format)
    setGameDataText(format === 'fen' ? game.fen() : game.pgn())
    setGameDataError('')
  }

  function refreshGameData() {
    if (!gameDataFormat) return
    setGameDataText(gameDataFormat === 'fen' ? game.fen() : game.pgn())
    setGameDataError('')
  }

  function loadGameData() {
    const candidate = new Chess()

    try {
      if (gameDataFormat === 'fen') {
        candidate.load(gameDataText.trim())
      } else {
        candidate.loadPgn(gameDataText)
      }
    } catch (error) {
      setGameDataError(
        error instanceof Error ? error.message : 'The chess data could not be loaded.',
      )
      return
    }

    if (gameDataFormat === 'fen') {
      game.load(candidate.fen())
    } else {
      game.loadPgn(gameDataText)
    }

    redoStackRef.current = []
    setRedoCount(0)
    setClockStarted(
      candidate.history().length > 0 || candidate.fen() !== new Chess().fen(),
    )
    setFlagged(null)
    setPendingPromotion(null)
    whiteClockRef.current = STARTING_TIME
    blackClockRef.current = STARTING_TIME
    setWhiteTime(STARTING_TIME)
    setBlackTime(STARTING_TIME)
    setGameDataError('')
    setGameDataFormat(null)
    refreshGame()
  }

  const ranks = flipped ? [1, 2, 3, 4, 5, 6, 7, 8] : [8, 7, 6, 5, 4, 3, 2, 1]
  const files = flipped
    ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
    : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const capturedBy = {
    w: moves.filter((move) => move.color === 'w' && move.captured),
    b: moves.filter((move) => move.color === 'b' && move.captured),
  }

  function getStatus() {
    if (isComputerGame && isComputerTurn) {
      if (engineStatus === 'error') return 'Stockfish engine unavailable'
      if (engineStatus === 'loading') return 'Starting Stockfish engine…'
      if (engineStatus === 'thinking') return 'Stockfish is thinking…'
    }
    if (flagged) {
      if (game.isInsufficientMaterial()) return 'Time expired · game drawn'
      const winner = flagged === 'w' ? 'Black' : 'White'
      return `${flagged === 'w' ? 'White' : 'Black'} ran out of time · ${winner} wins`
    }
    if (game.isCheckmate()) {
      return `Checkmate · ${sideToMove === 'w' ? 'Black' : 'White'} wins`
    }
    if (game.isDraw()) return 'Game drawn'
    if (game.isCheck()) {
      return `${sideToMove === 'w' ? 'White' : 'Black'} is in check`
    }
    return `${sideToMove === 'w' ? 'White' : 'Black'} to move`
  }

  function renderCaptured(color) {
    return capturedBy[color].length > 0 ? (
      <span className="captured-pieces" aria-label={`${capturedBy[color].length} captured pieces`}>
        {capturedBy[color].map((move, index) => (
          <span className="captured-piece" key={`${move.color}-${move.to}-${index}`}>
            {PIECE_SYMBOLS[move.color === 'w' ? 'b' : 'w'][move.captured]}
          </span>
        ))}
      </span>
    ) : (
      <span className="captured-empty">No captures</span>
    )
  }

  function renderPlayer(color, name, subtitle, time) {
    const active =
      !isGameOver && sideToMove === color && (history.length > 0 || color === 'w')
    const playerName = isComputerGame
      ? color === playerColor ? 'You' : 'Stockfish'
      : color === 'w' ? 'Player 1' : 'Player 2'
    const playerSubtitle = isComputerGame
      ? color === playerColor
        ? `${color === 'w' ? 'White' : 'Black'} · You`
        : `${color === 'w' ? 'White' : 'Black'} · ${AI_DIFFICULTIES[aiDifficulty].label}`
      : color === 'w' ? 'White · You' : 'Black'
    return (
      <div className={`player-card ${active ? 'player-card-active' : ''}`}>
        <div className={`avatar avatar-${color}`} aria-hidden="true">
          {isComputerGame && color !== playerColor ? <Icon name="bot" size={18} /> : color === 'w' ? '01' : '02'}
        </div>
        <div className="player-details">
          <span className="player-name">{isComputerGame ? playerName : name}</span>
          <span className="player-subtitle">{isComputerGame ? playerSubtitle : subtitle}</span>
          {renderCaptured(color)}
        </div>
        <div className={`clock ${active ? 'clock-active' : ''} ${flagged === color ? 'clock-flagged' : ''}`}>
          <Icon name="clock" size={16} />
          <span>{formatClock(time)}</span>
        </div>
      </div>
    )
  }

  const topPlayerColor = flipped ? 'w' : 'b'
  const bottomPlayerColor = flipped ? 'b' : 'w'

  return (
    <div className="app-shell" data-theme={theme}>
      <aside className="sidebar">
        <a className="brand" href="#play" aria-label="Knightly home">
          <span className="brand-mark">
            <Icon name="board" size={23} />
          </span>
          <span className="brand-name">knightly<span>.</span></span>
        </a>

        <div className="sidebar-section-label">PLAY</div>
        <div className="sidebar-link sidebar-link-active" aria-current="page">
          <Icon name="board" />
          <span>Play chess</span>
        </div>

        <div className="sidebar-bottom">
          <span className="online-indicator" />
          <span>Local game</span>
        </div>
      </aside>

      <main className="main-content" id="play">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Play</span>
            <Icon name="chevron" size={14} />
            <span className="breadcrumb-current">Live chess</span>
          </div>
          <div className="topbar-actions">
            <span className="mode-pill"><span /> 10 + 0 · Rapid</span>
            <button
              className="icon-button theme-button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
          </div>
        </header>

        <div className="page-heading">
          <div>
            <div className="eyebrow"><Icon name="sparkle" size={14} /> YOUR BOARD, YOUR MOVE</div>
            <h1>Play chess</h1>
            <p>A quiet place to focus on the next move.</p>
          </div>
          <div className="heading-badge"><Icon name="crown" size={16} /> THE CLUB</div>
        </div>

        <section className="game-mode-selector" aria-label="Choose how to play">
          <button
            className={`game-mode-card ${gameMode === 'friends' ? 'game-mode-card-active' : ''}`}
            onClick={() => selectGameMode('friends')}
            aria-pressed={gameMode === 'friends'}
          >
            <span className="game-mode-icon game-mode-icon-friends"><Icon name="users" size={21} /></span>
            <span className="game-mode-copy">
              <span className="game-mode-title">Play with Friends</span>
              <span className="game-mode-description">Local pass-and-play · same device</span>
            </span>
            <span className="game-mode-tag">2 PLAYERS</span>
          </button>
          <button
            className={`game-mode-card ${gameMode === 'computer' ? 'game-mode-card-active' : ''}`}
            onClick={() => selectGameMode('computer')}
            aria-pressed={gameMode === 'computer'}
          >
            <span className="game-mode-icon game-mode-icon-computer"><Icon name="bot" size={21} /></span>
            <span className="game-mode-copy">
              <span className="game-mode-title">Play with Computer</span>
              <span className="game-mode-description">Challenge Stockfish at your level</span>
            </span>
            <span className="game-mode-tag">STOCKFISH</span>
          </button>
        </section>

        {gameMode === 'friends' && (
          <p className="friend-mode-note">
            Playing with friends on this device. Online rooms and invite links need a multiplayer server.
          </p>
        )}

        {showLobbyAds && (
          <Ad
            placement="siteBanner"
            isGameActive={isMatchActive}
            isPremium={isPremium}
          />
        )}

        <div className="game-layout">
          <section className="board-column" aria-label="Chess game">
            <div className="board-player board-player-top">
              {renderPlayer(
                topPlayerColor,
                topPlayerColor === 'w' ? 'Player 1' : 'Player 2',
                topPlayerColor === 'w' ? 'White · You' : 'Black',
                topPlayerColor === 'w' ? whiteTime : blackTime,
              )}
            </div>

            <div className="board-frame">
              <div className="chessboard" role="grid" aria-label="Chess board">
                {ranks.flatMap((rank, rowIndex) =>
                  files.map((file, columnIndex) => {
                    const square = `${file}${rank}`
                    const piece = board[8 - rank][file.charCodeAt(0) - 97]
                    const isLight = (file.charCodeAt(0) - 97 + rank) % 2 === 0
                    const isSelected = selectedSquare === square
                    const isLastMove = lastMove?.from === square || lastMove?.to === square
                    const isLegal = legalSquares.includes(square)
                    const isCaptureTarget = isLegal && Boolean(piece)
                    const isCheckedKing =
                      game.isCheck() &&
                      piece?.type === 'k' &&
                      piece.color === sideToMove
                    const showRank = columnIndex === 0
                    const showFile = rowIndex === ranks.length - 1
                    const pieceLabel = piece
                      ? `${piece.color === 'w' ? 'White' : 'Black'} ${PIECE_NAMES[piece.type]}`
                      : 'empty'

                    return (
                      <button
                        className={[
                          'square',
                          isLight ? 'square-light' : 'square-dark',
                          isSelected && 'square-selected',
                          isLastMove && 'square-last-move',
                          isCheckedKing && 'square-in-check',
                        ].filter(Boolean).join(' ')}
                        key={square}
                        role="gridcell"
                        aria-label={`${square}, ${pieceLabel}${isLegal ? ', legal move' : ''}`}
                        aria-pressed={isSelected}
                        draggable={piece?.color === sideToMove && isHumanTurn && !isGameOver}
                        onClick={() => chooseSquare(square)}
                        onDragStart={(event) => {
                          if (!piece || piece.color !== sideToMove || !isHumanTurn || isGameOver) {
                            event.preventDefault()
                            return
                          }
                          event.dataTransfer.setData('text/plain', square)
                          setSelectedSquare(square)
                          setLegalSquares(
                            game.moves({ square, verbose: true }).map((move) => move.to),
                          )
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault()
                          const from = event.dataTransfer.getData('text/plain')
                          if (from && legalSquares.includes(square)) chooseSquare(square)
                        }}
                      >
                        {showRank && <span className="coordinate coordinate-rank">{rank}</span>}
                        {showFile && <span className="coordinate coordinate-file">{file}</span>}
                        {piece && (
                          <span
                            className={`piece piece-${piece.color}`}
                            aria-hidden="true"
                          >
                            {PIECE_SYMBOLS[piece.color][piece.type]}
                          </span>
                        )}
                        {isLegal && (
                          <span
                            className={`move-indicator ${isCaptureTarget ? 'move-indicator-capture' : ''}`}
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    )
                  }),
                )}
              </div>
            </div>

            <div className="board-player board-player-bottom">
              {renderPlayer(
                bottomPlayerColor,
                bottomPlayerColor === 'w' ? 'Player 1' : 'Player 2',
                bottomPlayerColor === 'w' ? 'White · You' : 'Black',
                bottomPlayerColor === 'w' ? whiteTime : blackTime,
              )}
            </div>

            <div className={`game-status ${game.isCheck() && !isGameOver ? 'game-status-check' : ''}`}>
              <span className={`status-dot ${isGameOver ? 'status-dot-ended' : ''}`} />
              <span>{getStatus()}</span>
              <span className="status-live">{isGameOver ? 'FINISHED' : 'IN PROGRESS'}</span>
            </div>
          </section>

          <aside className="game-panel" aria-label="Game details">
            <section className="panel-card game-info-card">
              <div className="panel-title-row">
                <div>
                  <div className="panel-kicker">CURRENT GAME</div>
                  <h2>{isComputerGame ? 'Play vs Stockfish' : 'Play with Friends'}</h2>
                </div>
                <span className="rapid-tag">10 + 0</span>
              </div>
              <p className="game-info-copy">
                {isComputerGame
                  ? `Stockfish ${AI_DIFFICULTIES[aiDifficulty].label} · choose your side and make a move.`
                  : 'A local game for two players, played on the same board.'}
              </p>

              <div className="game-controls">
                <button className="control-button control-secondary" onClick={undoMove} disabled={!history.length || Boolean(flagged)}>
                  <Icon name="undo" size={16} />
                  <span>Undo</span>
                </button>
                <button className="control-button control-secondary" onClick={redoMove} disabled={!redoCount || Boolean(flagged) || game.isGameOver()}>
                  <Icon name="redo" size={16} />
                  <span>Redo</span>
                </button>
                <button className="control-button control-secondary" onClick={() => setFlipped(!flipped)}>
                  <Icon name="flip" size={16} />
                  <span>Flip board</span>
                </button>
                <button className="control-button control-secondary" onClick={restartGame} disabled={!history.length && !clockStarted}>
                  <Icon name="undo" size={16} />
                  <span>Restart</span>
                </button>
                <button className="control-button control-secondary" onClick={() => openGameData('fen')}>
                  <span>FEN</span>
                </button>
                <button className="control-button control-secondary" onClick={() => openGameData('pgn')}>
                  <span>PGN</span>
                </button>
                <button className="control-button control-primary" onClick={startNewGame}>
                  <Icon name="plus" size={17} />
                  <span>New game</span>
                </button>
              </div>
            </section>

            {isComputerGame && (
              <section className="panel-card ai-settings-card" aria-label="Computer opponent settings">
                <div className="ai-settings-heading">
                  <div>
                    <div className="panel-kicker">COMPUTER OPPONENT</div>
                    <h2>Engine settings</h2>
                  </div>
                  <span className={`engine-indicator engine-indicator-${engineStatus}`} />
                </div>

                <div className="ai-setting-group">
                  <span className="ai-setting-label">DIFFICULTY</span>
                  <div className="difficulty-options">
                    {Object.entries(AI_DIFFICULTIES).map(([key, level]) => (
                      <button
                        className={`difficulty-option ${aiDifficulty === key ? 'difficulty-option-active' : ''}`}
                        key={key}
                        onClick={() => selectDifficulty(key)}
                        disabled={history.length > 0}
                        aria-pressed={aiDifficulty === key}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="ai-setting-group">
                  <span className="ai-setting-label">PLAY AS</span>
                  <div className="color-options">
                    <button
                      className={`color-option ${playerColor === 'w' ? 'color-option-active' : ''}`}
                      onClick={() => selectComputerColor('w')}
                      disabled={history.length > 0}
                      aria-pressed={playerColor === 'w'}
                    >
                      <span className="color-piece">♔</span> White
                    </button>
                    <button
                      className={`color-option ${playerColor === 'b' ? 'color-option-active' : ''}`}
                      onClick={() => selectComputerColor('b')}
                      disabled={history.length > 0}
                      aria-pressed={playerColor === 'b'}
                    >
                      <span className="color-piece color-piece-dark">♚</span> Black
                    </button>
                  </div>
                </div>

                <div className={`engine-status engine-status-${engineStatus}`} role="status" aria-live="polite">
                  <span className="engine-status-dot" />
                  <span>
                    {engineStatus === 'loading' && 'Loading Stockfish engine…'}
                    {engineStatus === 'ready' && 'Stockfish ready'}
                    {engineStatus === 'thinking' && 'Stockfish is thinking…'}
                    {engineStatus === 'error' && (engineError || 'Stockfish could not start.')}
                  </span>
                  {engineStatus === 'error' && (
                    <button
                      className="engine-retry"
                      onClick={() => {
                        setEngineStatus('loading')
                        setEngineVersion((version) => version + 1)
                      }}
                    >
                      Retry
                    </button>
                  )}
                </div>
                {engineScore && (
                  <div className="engine-analysis">
                    <span>Position analysis</span>
                    <strong>{engineScore.type === 'mate' ? `M${engineScore.value}` : engineScore.label}</strong>
                    <span>Stockfish perspective</span>
                  </div>
                )}
              </section>
            )}

            <section className="panel-card moves-card">
              <div className="moves-heading">
                <div>
                  <div className="panel-kicker">NOTATION</div>
                  <h2>Move history</h2>
                </div>
                <span className="move-count">{history.length} {history.length === 1 ? 'move' : 'moves'}</span>
              </div>

              {history.length === 0 ? (
                <div className="history-empty">
                  <span className="empty-board-icon"><Icon name="board" size={22} /></span>
                  <p>Your game starts with the first move.</p>
                  <span>Choose a piece to see its legal moves.</span>
                </div>
              ) : (
                <div className="move-list" aria-live="polite" ref={moveListRef}>
                  {Array.from({ length: Math.ceil(history.length / 2) }, (_, index) => (
                    <div className="move-row" key={index}>
                      <span className="move-number">{index + 1}.</span>
                      <span className={`move-san ${index * 2 === history.length - 1 ? 'move-san-latest' : ''}`}>
                        {history[index * 2]}
                      </span>
                      <span className={`move-san ${index * 2 + 1 === history.length - 1 ? 'move-san-latest' : ''}`}>
                        {history[index * 2 + 1] ?? ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="notation-footer">
                <span><span className="notation-dot" /> Standard notation</span>
                <span>Turn {Math.ceil((history.length + 1) / 2)}</span>
              </div>
            </section>

            {showLobbyAds && (
              <Ad
                placement="sidebar"
                isGameActive={isMatchActive}
                isPremium={isPremium}
              />
            )}

            <div className="panel-note">
              <Icon name="sparkle" size={15} />
              <span>Every great game begins with a single move.</span>
            </div>
          </aside>
        </div>

        {isGameOver && (
          <Ad
            placement="postGameResult"
            isGameActive={isMatchActive}
            isPremium={isPremium}
          />
        )}

        <footer className="page-footer">
          <span>KNIGHTLY CHESS CLUB</span>
          <span>Made for the love of the game.</span>
        </footer>
      </main>

      {pendingPromotion && (
        <div className="dialog-backdrop" role="presentation">
          <section className="promotion-dialog" role="dialog" aria-modal="true" aria-labelledby="promotion-title">
            <div className="panel-kicker">PAWN PROMOTION</div>
            <h2 id="promotion-title">Choose your piece</h2>
            <p>Your pawn reached the other side of the board.</p>
            <div className="promotion-options">
              {['q', 'r', 'b', 'n'].map((type) => (
                <button
                  className="promotion-option"
                  key={type}
                  onClick={() => makeMove(pendingPromotion.from, pendingPromotion.to, type)}
                  aria-label={`Promote to ${PIECE_NAMES[type]}`}
                >
                  <span className={`piece piece-${pendingPromotion.color}`}>
                    {PIECE_SYMBOLS[pendingPromotion.color][type]}
                  </span>
                  <span>{PIECE_NAMES[type]}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {gameDataFormat && (
        <div className="dialog-backdrop" role="presentation">
          <section className="game-data-dialog" role="dialog" aria-modal="true" aria-labelledby="game-data-title">
            <div className="game-data-heading">
              <div>
                <div className="panel-kicker">GAME DATA</div>
                <h2 id="game-data-title">FEN &amp; PGN</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setGameDataFormat(null)}
                aria-label="Close game data"
              >
                ×
              </button>
            </div>
            <div className="game-data-tabs" role="tablist" aria-label="Chess data format">
              {['fen', 'pgn'].map((format) => (
                <button
                  className={`game-data-tab ${gameDataFormat === format ? 'game-data-tab-active' : ''}`}
                  key={format}
                  role="tab"
                  aria-selected={gameDataFormat === format}
                  onClick={() => openGameData(format)}
                >
                  {format.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="game-data-description">
              {gameDataFormat === 'fen'
                ? 'View the current position or load a valid FEN position.'
                : 'View the game in standard PGN notation or load a PGN game.'}
            </p>
            <textarea
              className="game-data-input"
              aria-label={`${gameDataFormat.toUpperCase()} chess data`}
              value={gameDataText}
              onChange={(event) => {
                setGameDataText(event.target.value)
                setGameDataError('')
              }}
              spellCheck="false"
            />
            {gameDataError && (
              <p className="game-data-error" role="alert">{gameDataError}</p>
            )}
            <div className="game-data-actions">
              <button className="control-button control-secondary" onClick={refreshGameData}>
                Use current game
              </button>
              <button className="control-button control-primary" onClick={loadGameData}>
                {gameDataFormat === 'fen' ? 'Load position' : 'Load game'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
