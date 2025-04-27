import React from 'react';
import '../styles/GameControls.css';

const GameControls = ({
  onUndoRequest,
  onNewGame,
  canResign = true,
  canOfferDraw = true,
  onResign,
  onOfferDraw,
}) => {
  return (
    <div className="game-controls">
      <h3>Game Controls</h3>
      <div className="control-buttons">
        {/* Undo move button */}
        <button 
          className="control-btn undo-btn" 
          onClick={onUndoRequest}
          title="Request to undo the last move"
        >
          Undo Move
        </button>
        
        {/* New game button */}
        <button 
          className="control-btn new-game-btn" 
          onClick={onNewGame}
          title="Start a new game"
        >
          New Game
        </button>
        
        {/* Game action buttons (resign/draw) */}
        <div className="game-actions">
          {canResign && (
            <button 
              className="action-btn resign-btn" 
              onClick={onResign}
              title="Resign the current game"
            >
              Resign
            </button>
          )}
          
          {canOfferDraw && (
            <button 
              className="action-btn draw-btn" 
              onClick={onOfferDraw}
              title="Offer a draw to your opponent"
            >
              Offer Draw
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameControls;