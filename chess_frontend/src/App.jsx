import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import "./App.css";
import { gameSubject, initGame, resetGame, undo, redo } from "./Game";
import Board from "./Board";
import MoveHistory from "./MoveHistory";
import Signup from "./pages/SignUp";
import Signin from "./pages/SignIn";
import ProtectedRoute from "./components/ProtectedRoute";

function GamePage() {
  const [board, setBoard] = useState([]);
  const [isGameOver, setIsGameOver] = useState(false);
  const [result, setResult] = useState(null);
  const [turn, setTurn] = useState("w");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [moveNotation, setMoveNotation] = useState([]);

  useEffect(() => {
    initGame();
    const subscription = gameSubject.subscribe((game) => {
      setBoard(game.board || []);
      setIsGameOver(game.isGameOver || false);
      setResult(game.result || null);
      setTurn(game.turn || "w");
      setCanUndo(game.canUndo || false);
      setCanRedo(game.canRedo || false);
      setMoveNotation(game.moveNotation || []);
    });

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

function Home() {
  return (
    <div className="home">
      <h1>Welcome to the Chess Game</h1>
      <Link to="/play">Start Playing</Link>
    </div>
  );
}

const App = () => {
  return (
    <Router>
      <nav>
        <Link to="/">Home</Link> | <Link to="/signup">Sign Up</Link> | <Link to="/signin">Sign In</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/play" element={
          <ProtectedRoute>
            <GamePage />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
};

export default App;
