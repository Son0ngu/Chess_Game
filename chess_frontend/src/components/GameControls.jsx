import React from 'react';
import '../styles/GameControls.css';

const GameControls = ({ 
  onUndoRequest, 
  onRedoRequest,
  onNewGame, 
  canResign,
  canOfferDraw,
  canUndo,
  canRedo,
  onResign, 
  onOfferDraw 
}) => {
  return (
    <div className="game-controls">
      <h3>Game Controls</h3>
      <div className="controls-grid">
        <button 
          className="control-btn new-game-btn"
          onClick={onNewGame}
        >
          New Game
        </button>
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