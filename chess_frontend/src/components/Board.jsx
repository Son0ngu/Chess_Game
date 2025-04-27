import React, { useState, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import '../styles/Board.css';

// Chess piece component
const Piece = ({ piece, position, canDrag }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'piece',
    item: { piece, position },
    canDrag: () => canDrag,
    collect: monitor => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  // Get piece image path from assets folder
  const getPieceImage = (type, color) => {
    // Map piece type to correct prefix
    const piecePrefix = {
      'king': 'k',
      'queen': 'q',
      'rook': 'r',
      'bishop': 'b',
      'knight': 'n',
      'pawn': 'p'
    };
    
    // Map color to correct suffix
    const colorSuffix = color === 'white' ? 'w' : 'b';
    
    // Format: assets/q_w.png for white queen, assets/b_b.png for black bishop
    return `/assets/${piecePrefix[type.toLowerCase()]}_${colorSuffix}.png`;
  };

  return (
    <div
      className={`piece ${piece.color} ${piece.type} ${isDragging ? 'dragging' : ''}`}
      ref={canDrag ? drag : null}
      style={{ 
        opacity: isDragging ? 0.5 : 1,
        backgroundImage: `url(${getPieceImage(piece.type, piece.color)})`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        width: '100%',
        height: '100%'
      }}
    >
      {/* Remove the Unicode symbol, use background image instead */}
    </div>
  );
};

// Chess square component
const Square = ({ position, color, children, onDrop, onClick, isPossibleMove, isCheck }) => {
  const [, drop] = useDrop({
    accept: 'piece',
    drop: (item) => onDrop(item.position, position),
  });

  // Create the className for styling
  const squareClass = [
    'square',
    color,
    isPossibleMove ? 'possible-move' : '',
    isCheck ? 'check' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={squareClass}
      ref={drop}
      onClick={() => onClick(position)}
      data-position={position}
    >
      {children}
    </div>
  );
};

// Main chess board component
const Board = ({ 
  board, 
  position, 
  playerColor = 'white', 
  possibleMoves = {},
  onMove,
  disabled = false 
}) => {
  const [selectedSquare, setSelectedSquare] = useState(null);
  
  // Convert algebraic notation (e.g., "e4") to coordinates [row, col]
  const algebraicToCoords = useCallback((algebraic) => {
    if (!algebraic || algebraic.length !== 2) return null;
    const col = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(algebraic[1], 10);
    return [row, col];
  }, []);
  
  // Convert coordinates [row, col] to algebraic notation (e.g., "e4")
  const coordsToAlgebraic = useCallback((row, col) => {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    const file = String.fromCharCode('a'.charCodeAt(0) + col);
    const rank = 8 - row;
    return `${file}${rank}`;
  }, []);

  // Handle square click for piece selection or move
  const handleSquareClick = useCallback((clickedPosition) => {
    if (disabled) return;

    const coords = algebraicToCoords(clickedPosition);
    if (!coords) return;
    
    const [row, col] = coords;
    const clickedPiece = board[row][col];

    // If a square was already selected
    if (selectedSquare) {
      // If clicking on a different square, try to move the piece
      if (selectedSquare !== clickedPosition) {
        onMove(selectedSquare, clickedPosition);
      }
      // Clear the selection in any case
      setSelectedSquare(null);
    } else if (clickedPiece && clickedPiece.color === playerColor) {
      // Select the piece if it belongs to the player
      setSelectedSquare(clickedPosition);
    }
  }, [board, selectedSquare, playerColor, onMove, algebraicToCoords, disabled]);

  // Handle piece drop (for drag and drop)
  const handleDrop = useCallback((fromPosition, toPosition) => {
    if (disabled) return;
    onMove(fromPosition, toPosition);
  }, [onMove, disabled]);

  // Determine if a position has a possible move (for highlighting)
  const isPossibleMovePosition = useCallback((position) => {
    if (!selectedSquare || !possibleMoves[selectedSquare]) return false;
    return possibleMoves[selectedSquare].includes(position);
  }, [selectedSquare, possibleMoves]);

  // Render a chess piece

  // Generate the chess board with proper orientation
  const renderBoard = () => {
    const isFlipped = playerColor === 'black';
    let rows = Array(8).fill(null).map((_, i) => i);
    let cols = Array(8).fill(null).map((_, i) => i);
    
    if (isFlipped) {
      rows = rows.reverse();
      cols = cols.reverse();
    }
    
    return (
      <div className="chess-board">
        {rows.map(row => (
          <div key={row} className="board-row">
            {cols.map(col => {
              const isLightSquare = (row + col) % 2 === 0;
              const algebraicPosition = coordsToAlgebraic(isFlipped ? 7 - row : row, isFlipped ? 7 - col : col);
              const piece = board[isFlipped ? 7 - row : row][isFlipped ? 7 - col : col];
              const isCheck = position && position.inCheck && piece && piece.type === 'king' && piece.color === position.inCheck;
              
              return (
                <Square
                  key={col}
                  position={algebraicPosition}
                  color={isLightSquare ? 'light' : 'dark'}
                  onDrop={handleDrop}
                  onClick={handleSquareClick}
                  isPossibleMove={isPossibleMovePosition(algebraicPosition)}
                  isCheck={isCheck}
                >
                  {piece && (
                    <Piece
                      piece={piece}
                      position={algebraicPosition}
                      canDrag={!disabled && piece.color === playerColor}
                    />
                  )}
                </Square>
              );
            })}
          </div>
        ))}
        
        {/* Board coordinate labels */}
        <div className="board-coordinates files">
          {isFlipped ? 
            ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'].map(file => <div key={file}>{file}</div>) : 
            ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(file => <div key={file}>{file}</div>)
          }
        </div>
        <div className="board-coordinates ranks">
          {isFlipped ? 
            [1, 2, 3, 4, 5, 6, 7, 8].map(rank => <div key={rank}>{rank}</div>) : 
            [8, 7, 6, 5, 4, 3, 2, 1].map(rank => <div key={rank}>{rank}</div>)
          }
        </div>
      </div>
    );
  };

  return (
    <div className={`board-container ${disabled ? 'disabled' : ''}`}>
      {renderBoard()}
    </div>
  );
};

export default Board;