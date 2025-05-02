import React from 'react';
import '../styles/GameControls.css';

const GameControls = ({ 
  canResign,
  canOfferDraw,
  onResign, 
  onNewGame,
  onOfferDraw,
  gameOver
}) => {
  return (
    <div className="game-controls">
      <h3>Game Controls</h3>
      <div className="controls-grid">
        
        <button 
          className="control-btn resign-btn"
          onClick={onResign}
          disabled={!canResign}
        >
          Resign
        </button>
        <button 
          className="control-btn draw-btn"
          onClick={onOfferDraw}
          disabled={!canOfferDraw}
        >
          Offer Draw
        </button>
      </div>
    </div>
  );
};

export default GameControls;