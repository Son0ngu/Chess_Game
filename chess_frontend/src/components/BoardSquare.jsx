import React from 'react';

export default function BoardSquare({ 
  piece, 
  black, 
  position,
  isPossibleMove = false,
  isSelected = false,
  isCheck = false
}) {
  // Xác định các class tùy thuộc vào trạng thái
  const squareClass = [
    black ? 'square-black' : 'square-white',
    isPossibleMove ? 'possible-move' : '',
    isSelected ? 'selected' : '',
    isCheck ? 'in-check' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={`board-square ${squareClass}`}>
      {piece && (
        <div className="piece-container">
          <img 
            src={`/assets/${piece.type.toLowerCase()}_${piece.color === 'white' ? 'w' : 'b'}.png`}
            alt={`${piece.color} ${piece.type}`} 
            className="piece" 
          />
        </div>
      )}
      {isPossibleMove && !piece && <div className="move-indicator"></div>}
    </div>
  );
}