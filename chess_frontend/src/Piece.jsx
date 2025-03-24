import React from 'react';
import { useDrag, DragPreviewImage } from 'react-dnd';

export default function Piece({ piece: { type, color }, position }) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'piece',
    item: { id: `${position}_${type}_${color}` },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  });

  const pieceImg = require(`./assets/${type}_${color}.png`);

  console.log(`Piece at ${position} (${type}, ${color}) - isDragging: ${isDragging}`);

  return (
    <>
      <DragPreviewImage connect={preview} src={pieceImg} />
      <div
        className="piece-container"
        ref={drag}
        style={{ opacity: isDragging ? 0 : 1 }}
      >
        <img src={pieceImg} alt={`${color} ${type}`} className="piece" />
      </div>
    </>
  );
}