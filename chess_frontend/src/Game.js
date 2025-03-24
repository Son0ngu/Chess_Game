import { Chess } from 'chess.js';
import { BehaviorSubject } from 'rxjs';

const chess = new Chess();

export const gameSubject = new BehaviorSubject({
  board: chess.board(),
  pendingPromotion: null,
  isGameOver: false,
  turn: chess.turn(),
  result: null,
});

export function initGame() {
    const savedGame = localStorage.getItem('savedGame');
    if (savedGame) {
      try {
        chess.load(savedGame);
        console.log('Loaded game state:', chess.fen());
        if (!chess.board()) {
          throw new Error('Invalid board state after loading FEN');
        }
      } catch (error) {
        console.error('Failed to load saved game:', error);
        chess.reset();
        localStorage.removeItem('savedGame');
        console.log('Reset game due to invalid FEN:', chess.fen());
      }
    } else {
      chess.reset();
      console.log('Started new game:', chess.fen());
    }
    updateGame();
  }

export function resetGame() {
  chess.reset();
  localStorage.removeItem('savedGame');
  console.log('Game reset:', chess.fen());
  updateGame();
}

export function handleMove(from, to) {
  console.log(`Handling move from ${from} to ${to}`);
  console.log('Current turn:', chess.turn());
  console.log('Current board state:', chess.fen());

  const promotions = chess.moves({ verbose: true }).filter((m) => m.promotion);
  if (promotions.some((p) => `${p.from}:${p.to}` === `${from}:${to}`)) {
    console.log('Promotion detected:', promotions);
    const pendingPromotion = { from, to, color: promotions[0].color };
    updateGame(pendingPromotion);
    return;
  }

  const currentGame = gameSubject.getValue();
  if (!currentGame.pendingPromotion) {
    move(from, to);
  }
}

export function move(from, to, promotion) {
  const moveObj = { from, to, ...(promotion && { promotion }) };
  console.log('Attempting move:', moveObj);

  try {
    const legalMove = chess.move(moveObj);
    if (legalMove) {
      console.log('Move successful:', chess.fen());
      updateGame();
    } else {
      console.error('Move failed:', moveObj);
    }
  } catch (error) {
    console.error('Error during move:', error.message);
  }
}

function updateGame(pendingPromotion = null) {
  const isGameOver = chess.isGameOver();
  const newGame = {
    board: chess.board(),
    pendingPromotion,
    isGameOver,
    turn: chess.turn(),
    result: isGameOver ? getGameResult() : null,
  };

  localStorage.setItem('savedGame', chess.fen());
  gameSubject.next(newGame);
}

function getGameResult() {
  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'BLACK' : 'WHITE';
    return `CHECKMATE - WINNER - ${winner}`;
  } else if (chess.isDraw()) {
    if (chess.isStalemate()) return 'DRAW - STALEMATE';
    if (chess.isThreefoldRepetition()) return 'DRAW - REPETITION';
    if (chess.isInsufficientMaterial()) return 'DRAW - INSUFFICIENT MATERIAL';
    return 'DRAW - 50 MOVE RULE';
  }
  return 'UNKNOWN REASON';
}