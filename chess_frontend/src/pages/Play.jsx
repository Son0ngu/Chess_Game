import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Board from "../components/Board";
import MoveHistory from "../components/MoveHistory";
import GameControls from "../components/GameControls";
import Spinner from "../components/Spinner";
import { socket } from "../services/socket";
import useChess from "../hooks/useChess";
import "../styles/Play.css";

const Play = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [opponent, setOpponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [showResignDialog, setShowResignDialog] = useState(false);
  const [showDrawOfferDialog, setShowDrawOfferDialog] = useState(false);
  const [receivedDrawOffer, setReceivedDrawOffer] = useState(false);

  // Get chess game state from custom hook
  const {
    board,
    currentTurn,
    playerColor,
    moves,
    check,
    makeMove,
    undo,
    redo,
    reset,
    position,
    inCheck,
    possibleMoves,
    gameStatus
  } = useChess(gameId);
  
  // Handle authentication redirect
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate("/signin");
    }
  }, [isAuthenticated, navigate, isLoading]);

  // Initial game setup
  useEffect(() => {
    if (!gameId || !isAuthenticated) return;

    setIsLoading(true);

    // Join game room
    socket.emit("game:join", { gameId });

    // Get game data
    socket.on("game:data", (data) => {
      // Get opponent information
      const opponentPlayer = data.players.find(
        (player) => player.id !== user.id
      );
      
      if (opponentPlayer) {
        setOpponent(opponentPlayer);
      }
      
      setIsLoading(false);
    });

    // Listen for game over events
    socket.on("game:over", (data) => {
      setGameOver(true);
      setGameResult(data.result);
    });

    // Listen for draw offers
    socket.on("game:drawOffer", () => {
      setReceivedDrawOffer(true);
    });

    return () => {
      // Clean up socket listeners when component unmounts
      socket.off("game:data");
      socket.off("game:over");
      socket.off("game:drawOffer");
      socket.emit("game:leave", { gameId });
    };
  }, [gameId, isAuthenticated, user]);

  // Check for game status changes
  useEffect(() => {
    if (gameStatus) {
      if (gameStatus.isGameOver) {
        setGameOver(true);
        setGameResult(gameStatus.result);
      }
    }
  }, [gameStatus]);

  const handleResign = () => {
    socket.emit("game:resign", { gameId });
    setGameOver(true);
    setGameResult({ 
      type: "resignation", 
      winner: opponent?.id 
    });
    setShowResignDialog(false);
  };

  const handleOfferDraw = () => {
    socket.emit("game:offerDraw", { gameId });
    setShowDrawOfferDialog(false);
  };

  const handleAcceptDraw = () => {
    socket.emit("game:acceptDraw", { gameId });
    setGameOver(true);
    setGameResult({ type: "draw", reason: "agreement" });
    setReceivedDrawOffer(false);
  };

  const handleDeclineDraw = () => {
    socket.emit("game:declineDraw", { gameId });
    setReceivedDrawOffer(false);
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="play-container">
      <div className="game-info">
        {opponent && (
          <div className="opponent-info">
            <h3>{opponent.username}</h3>
            <div className="rating">Rating: {opponent.elo}</div>
          </div>
        )}
        
        <div className="game-status">
          {gameOver ? (
            <div className="game-result">
              <h2>Game Over</h2>
              {gameResult?.type === "checkmate" && (
                <p>
                  Checkmate! {gameResult.winner === user.id
                    ? "You won"
                    : "You lost"}
                </p>
              )}
              {gameResult?.type === "draw" && (
                <p>Game drawn by {gameResult.reason}</p>
              )}
              {gameResult?.type === "resignation" && (
                <p>
                  {gameResult.winner === user.id
                    ? "Opponent resigned. You won!"
                    : "You resigned. You lost."}
                </p>
              )}
              {gameResult?.type === "timeout" && (
                <p>
                  {gameResult.winner === user.id
                    ? "Opponent ran out of time. You won!"
                    : "You ran out of time. You lost."}
                </p>
              )}
              <button 
                className="new-game-btn"
                onClick={() => navigate("/lobby")}
              >
                Back to Lobby
              </button>
            </div>
          ) : (
            <div>
              <div className="current-turn">
                {currentTurn === playerColor ? "Your turn" : "Opponent's turn"}
              </div>
              {inCheck && <div className="check-alert">Check!</div>}
            </div>
          )}
        </div>
      </div>

      <div className="game-board-container">
        <Board
          board={board}
          position={position}
          playerColor={playerColor}
          possibleMoves={possibleMoves}
          onMove={makeMove}
          disabled={gameOver || currentTurn !== playerColor}
        />
      </div>

      <div className="game-sidebar">
        <MoveHistory moves={moves} />
        
        <GameControls
          onUndoRequest={() => socket.emit("game:requestUndo", { gameId })}
          onNewGame={() => navigate("/lobby")}
          canResign={!gameOver}
          canOfferDraw={!gameOver}
          onResign={() => setShowResignDialog(true)}
          onOfferDraw={() => setShowDrawOfferDialog(true)}
        />

        {/* Player info */}
        <div className="player-info">
          <h3>You ({playerColor})</h3>
          <div className="rating">Rating: {user.elo}</div>
        </div>
      </div>

      {/* Resign confirmation dialog */}
      {showResignDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>Resign Game?</h3>
            <p>Are you sure you want to resign? This will count as a loss.</p>
            <div className="dialog-buttons">
              <button onClick={handleResign} className="confirm-btn">
                Yes, Resign
              </button>
              <button onClick={() => setShowResignDialog(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draw offer dialog */}
      {showDrawOfferDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>Offer Draw?</h3>
            <p>Send a draw offer to your opponent?</p>
            <div className="dialog-buttons">
              <button onClick={handleOfferDraw} className="confirm-btn">
                Yes, Offer Draw
              </button>
              <button onClick={() => setShowDrawOfferDialog(false)} className="cancel-btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Received draw offer dialog */}
      {receivedDrawOffer && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>Draw Offered</h3>
            <p>Your opponent has offered a draw. Do you accept?</p>
            <div className="dialog-buttons">
              <button onClick={handleAcceptDraw} className="confirm-btn">
                Accept Draw
              </button>
              <button onClick={handleDeclineDraw} className="cancel-btn">
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Play;