import React, { useEffect, useState } from 'react';
import './App.css';
import { gameSubject, initGame, resetGame } from './Game';
import Board from './Board';

function App() {
  const [board, setBoard] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [turn, setTurn] = useState('w');

  useEffect(() => {
    initGame();
    const subscription = gameSubject.subscribe((game) => {
      console.log('Game state updated:', game);
      setBoard(game.board || []);
      setIsGameOver(game.isGameOver || false);
      setResult(game.result || null);
      setTurn(game.turn || 'w');
    });

    const initialGame = gameSubject.getValue();
    console.log('Initial game state:', initialGame);
    if (initialGame && initialGame.board) {
      setBoard(initialGame.board);
      setIsGameOver(initialGame.isGameOver || false);
      setResult(initialGame.result || null);
      setTurn(initialGame.turn || 'w');
    } else {
      console.warn('Initial game state invalid, resetting...');
      resetGame();
    }

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="container">
      {isGameOver && (
        <h2 className="vertical-text">
          GAME OVER
          <button onClick={resetGame}>
            <span className="vertical-text">NEW GAME</span>
          </button>
        </h2>
      )}
      <div className="board-container">
        <Board board={board} turn={turn} />
      </div>
      {result && <p className="vertical-text">{result}</p>}
    </div>
  );
}

export default App;