import { Chess } from 'chess.js';
import { BehaviorSubject } from 'rxjs';

const chess = new Chess();

// Add history tracking
const moveHistory = [];
const redoStack = [];

// Update the gameSubject initialization to include moveNotation
export const gameSubject = new BehaviorSubject({
  board: chess.board(),
  pendingPromotion: null,
  isGameOver: false,
  turn: chess.turn(),
  result: null,
  canUndo: false,
  canRedo: false,
  moveNotation: [] // Add this line
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
        
        // Initialize history from saved history if available
        const savedHistory = localStorage.getItem('moveHistory');
        if (savedHistory) {
          moveHistory.length = 0;
          moveHistory.push(...JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error('Failed to load saved game:', error);
        chess.reset();
        localStorage.removeItem('savedGame');
        localStorage.removeItem('moveHistory');
        moveHistory.length = 0;
        redoStack.length = 0;
        console.log('Reset game due to invalid FEN:', chess.fen());
      }
    } else {
      chess.reset();
      moveHistory.length = 0;
      redoStack.length = 0;
      console.log('Started new game:', chess.fen());
    }
    updateGame();
}

export function resetGame() {
  chess.reset();
  moveHistory.length = 0;
  redoStack.length = 0;
  localStorage.removeItem('savedGame');
  localStorage.removeItem('moveHistory');
  console.log('Game reset:', chess.fen());
  updateGame();
}

resetGame();

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
      // Save position before the move to history
      moveHistory.push({
        fen: legalMove.before,
        move: legalMove
      });
      // Clear redo stack after a new move
      redoStack.length = 0;
      updateGame();
    } else {
      console.error('Move failed:', moveObj);
    }
  } catch (error) {
    console.error('Error during move:', error.message);
  }
}

// Add undo function
export function undo() {
  if (moveHistory.length === 0) {
    console.log('No moves to undo');
    return;
  }

  const lastPosition = moveHistory.pop();
  redoStack.push({
    fen: chess.fen(),
    move: chess.history({ verbose: true }).pop()
  });
  
  // Load the previous position
  chess.reset();
  moveHistory.forEach(({ move }) => {
    chess.move(move);
  });
  console.log('Move undone, new state:', chess.fen());
  updateGame();
}

// Add redo function
export function redo() {
  if (redoStack.length === 0) {
    console.log('No moves to redo');
    return;
  }

  const nextPosition = redoStack.pop();
  moveHistory.push({
    fen: chess.fen(),
    move: nextPosition.move
  });
  
  // Replay the move that was undone
  const { from, to, promotion } = nextPosition.move;
  chess.move({ from, to, promotion });
  console.log('Move redone, new state:', chess.fen());
  updateGame();
}

// Update the updateGame function to properly display castling notation
function updateGame(pendingPromotion = null) {
  const isGameOver = chess.isGameOver();
  
  // Get standard notation history
  const standardNotation = chess.history();
  
  // Get detailed move history with piece information
  const detailedHistory = chess.history({ verbose: true });
  
  // Create enhanced notation with piece type and castling info
  const enhancedNotation = standardNotation.map((move, index) => {
    const detailedMove = detailedHistory[index];
    if (!detailedMove) return move;
    
    // Special handling for castling
    if (move === 'O-O') {
      return 'King Castles Kingside';
    } else if (move === 'O-O-O') {
      return 'King Castles Queenside';
    }
    
    // Map piece codes to readable names
    const pieceNames = {
      'p': 'Pawn',
      'n': 'Knight',
      'b': 'Bishop',
      'r': 'Rook',
      'q': 'Queen',
      'k': 'King'
    };
    
    const pieceName = pieceNames[detailedMove.piece] || 'Unknown';
    
    // Check if capture happened
    let moveText = move;
    if (detailedMove.captured) {
      const capturedPiece = pieceNames[detailedMove.captured] || 'piece';
      moveText += ` (captures ${capturedPiece})`;
    }
    
    // Check if it's a check or checkmate
    if (move.includes('+')) {
      moveText = moveText.replace('+', '') + ' (check)';
    } else if (move.includes('#')) {
      moveText = moveText.replace('#', '') + ' (checkmate)';
    }
    
    return `${pieceName} ${moveText}`;
  });
  
  const newGame = {
    board: chess.board(),
    pendingPromotion,
    isGameOver,
    turn: chess.turn(),
    result: isGameOver ? getGameResult() : null,
    canUndo: moveHistory.length > 0,
    canRedo: redoStack.length > 0, 
    moveNotation: enhancedNotation
  };

  localStorage.setItem('savedGame', chess.fen());
  localStorage.setItem('moveHistory', JSON.stringify(moveHistory));
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