import React, { useEffect } from 'react';
import '../styles/MoveHistory.css';

const MoveHistory = ({ moves = [], playerColor = 'white' }) => {
  // Debug log - check what data is coming in
  useEffect(() => {
    console.log('Moves data:', moves);
  }, [moves]);

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

  // Group moves by pairs based on actual game sequence
  const groupMovesInPairs = (moves) => {
    if (!moves || moves.length === 0) return [];
    
    const pairs = [];
    
    // Handle moves that may not have explicit color info
    // In chess, odd-indexed moves are black, even-indexed are white
    const processedMoves = moves.map((move, index) => {
      // If move already has color, use it; otherwise infer from position
      const color = move.color || (index % 2 === 0 ? 'white' : 'black');
      return { ...move, color };
    });
    
    // Group by pairs (white, black)
    for (let i = 0; i < processedMoves.length; i += 2) {
      const white = processedMoves[i] || null;
      const black = processedMoves[i+1] || null;
      pairs.push({ white, black });
    }
    
    return pairs;
  };

  // Get move pairs
  const movePairs = groupMovesInPairs(moves);

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