import React, { useEffect, useState } from 'react';
import BoardSquare from './BoardSquare';
import '../styles/Board.css';

export default function Board({ board, position, playerColor = 'white', possibleMoves = {}, onMove, disabled = false }) {
  const [currBoard, setCurrBoard] = useState([]);
  const [selectedPiece, setSelectedPiece] = useState(null);

  useEffect(() => {
    // Tạo bản sao của bàn cờ
    console.log("Board updated:", board);
    setCurrBoard(board.flat());
  }, [board]);

  function getXYPosition(i) {
    const x = i % 8;
    const y = Math.abs(Math.floor(i / 8) - 7);
    return { x, y };
  }

  function isBlack(i) {
    const { x, y } = getXYPosition(i);
    return (x + y) % 2 === 1;
  }

  function getPosition(i) {
    const { x, y } = getXYPosition(i);
    const letter = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'][x];
    return `${letter}${y + 1}`;
  }

  // Kiểm tra xem một vị trí có phải là nước đi hợp lệ không
  function isPossibleMove(position) {
    if (!selectedPiece) return false;
    return possibleMoves[selectedPiece]?.includes(position);
  }

  // Xử lý khi người chơi nhấp vào một ô
  function handleSquareClick(position, piece) {
    if (disabled) return;

    // Nếu đã chọn một quân cờ trước đó
    if (selectedPiece) {
      // Nếu nhấp vào một nước đi khả thi, thực hiện nước đi đó
      if (isPossibleMove(position)) {
        onMove(selectedPiece, position);
      }
      // Bỏ chọn quân cờ
      setSelectedPiece(null);
    } 
    // Nếu nhấp vào quân cờ của mình
    else if (piece && piece.color === playerColor) {
      setSelectedPiece(position);
    }
  }

  // Xác định ô bị check
  function isCheck(i) {
    const piece = currBoard[i];
    return position?.inCheck && piece && piece.type === 'king' && piece.color === position.inCheck;
  }

  return (
    <div className="chess-board">
      <div className="board">
        {currBoard.map((piece, i) => (
          <div 
            key={i} 
            className={`square ${isBlack(i) ? 'dark' : 'light'}`}
            onClick={() => handleSquareClick(getPosition(i), piece)}
          >
            <BoardSquare
              piece={piece}
              black={isBlack(i)}
              position={getPosition(i)}
              isPossibleMove={isPossibleMove(getPosition(i))}
              isSelected={selectedPiece === getPosition(i)}
              isCheck={isCheck(i)}
            />
          </div>
        ))}
      </div>
      
      {/* Thêm tọa độ bàn cờ */}
      <div className="board-coordinates files">
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(file => (
          <div key={file}>{file}</div>
        ))}
      </div>
      <div className="board-coordinates ranks">
        {[8, 7, 6, 5, 4, 3, 2, 1].map(rank => (
          <div key={rank}>{rank}</div>
        ))}
      </div>
    </div>
  );
}