import React, { useEffect, useState } from 'react';
import './App.css';
import { gameSubject, initGame, resetGame, undo, redo } from './Game';
import Board from './Board';
import MoveHistory from './MoveHistory';

function App() {
  const [board, setBoard] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [turn, setTurn] = useState('w');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [moveNotation, setMoveNotation] = useState([]);

  useEffect(() => {
    initGame();
    const subscription = gameSubject.subscribe((game) => {
      console.log('Game state updated:', game);
      setBoard(game.board || []);
      setIsGameOver(game.isGameOver || false);
      setResult(game.result || null);
      setTurn(game.turn || 'w');
      setCanUndo(game.canUndo || false);
      setCanRedo(game.canRedo || false);
      setMoveNotation(game.moveNotation || []);
    });

    const initialGame = gameSubject.getValue();
    console.log('Initial game state:', initialGame);
    if (initialGame && initialGame.board) {
      setBoard(initialGame.board);
      setIsGameOver(initialGame.isGameOver || false);
      setResult(initialGame.result || null);
      setTurn(initialGame.turn || 'w');
      setCanUndo(initialGame.canUndo || false);
      setCanRedo(initialGame.canRedo || false);
      setMoveNotation(initialGame.moveNotation || []);
    } else {
      console.warn('Initial game state invalid, resetting...');
      resetGame();
    }

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="container">
      <div className="game-controls vertical-text">
        <button onClick={undo} disabled={!canUndo || isGameOver}>
          <span className="vertical-text">UNDO</span>
        </button>
        <button onClick={redo} disabled={!canRedo || isGameOver}>
          <span className="vertical-text">REDO</span>
        </button>
        <button onClick={resetGame}>
          <span className="vertical-text">NEW GAME</span>
        </button>
      </div>
      
      <div className="board-container">
        <Board board={board} turn={turn} />
        {isGameOver && (
          <div className="game-over">
            <h2>GAME OVER</h2>
            {result && <p>{result}</p>}
          </div>
        )}
      </div>
      
      <MoveHistory moveNotation={moveNotation} />
    </div>
  );
}

export default App;