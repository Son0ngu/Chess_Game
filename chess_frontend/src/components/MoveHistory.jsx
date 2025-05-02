import React from 'react';
import '../styles/MoveHistory.css';

const MoveHistory = ({ moves = [], playerColor = 'white' }) => {
  // Format move for display (e.g., "e2-e4", "Nf3", "O-O")
  const formatMove = (move) => {
    if (!move) return '';
    
    // Special case for castling
    if (move.castling) {
      return move.castling === 'kingside' ? 'O-O' : 'O-O-O';
    }
    
    // For captures
    if (move.capture) {
      const pieceSymbol = getPieceSymbol(move.piece);
      return `${pieceSymbol}${move.from.slice(0, 1)}x${move.to}`;
    }
    
    // For regular moves
    const pieceSymbol = getPieceSymbol(move.piece);
    return `${pieceSymbol}${move.from}-${move.to}`;
  };
  
  // Get the symbol for a piece
  const getPieceSymbol = (piece) => {
    if (!piece || piece === 'pawn') return '';
    const symbols = {
      'knight': 'N',
      'bishop': 'B',
      'rook': 'R',
      'queen': 'Q',
      'king': 'K'
    };
    return symbols[piece] || '';
  };

// Group moves by pairs (white and black), handling black as first player
const groupMovesInPairs = (moves, playerColor) => {
  const pairs = [];
  let i = 0;

  if (playerColor === 'black') {
    // Black starts: first move is black, white is null
    pairs.push({ white: null, black: moves[0] || null });
    i = 1;
    // Now pair up the rest as (white, black)
    for (; i < moves.length; i += 2) {
      pairs.push({
        white: moves[i] || null,
        black: moves[i + 1] || null,
      });
    }
  } else {
    // White starts: pair as (white, black)
    for (; i < moves.length; i += 2) {
      pairs.push({
        white: moves[i] || null,
        black: moves[i + 1] || null,
      });
    }
  }
  return pairs;
};

const movePairs = groupMovesInPairs(moves, playerColor);

  return (
    <div className="move-history">
      <h3>Move History</h3>
      <div className="move-list">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>White</th>
              <th>Black</th>
            </tr>
          </thead>
          <tbody>
            {movePairs.map((pair, index) => (
              <tr key={index}>
                <td className="move-number">{index + 1}.</td>
                <td className="move white-move">{formatMove(pair.white)}</td>
                <td className="move black-move">{formatMove(pair.black)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MoveHistory;