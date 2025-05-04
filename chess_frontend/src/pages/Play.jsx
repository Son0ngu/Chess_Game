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
  const [resignationNotice, setResignationNotice] = useState(null);
  const [drawAcceptedNotice, setDrawAcceptedNotice] = useState(null);

  const {
    board,
    currentTurn,
    playerColor,
    moves,
    makeMove,
    position,
    inCheck,
    possibleMoves,
    gameStatus,
    showPromotion,
    completePromotion
  } = useChess(gameId);
  
  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      navigate("/signin");
    }
  }, [isAuthenticated, navigate, isLoading]);

  useEffect(() => {
    if (!gameId || !isAuthenticated) return;

    setIsLoading(true);

    socket.emit("game:join", { gameId });

    socket.on("game:data", (data) => {
      const opponentPlayer = data.players.find(
        (player) => player.id !== user.id
      );
      
      if (opponentPlayer) {
        setOpponent(opponentPlayer);
      }
      
      setIsLoading(false);
    });

    socket.on("game:over", (data) => {
      console.log("Game over event received:", data);
      setGameOver(true);
      setGameResult(data.result);
      setReceivedDrawOffer(false);
      setShowDrawOfferDialog(false);
    });

    socket.on("game:drawOffer", () => {
      setReceivedDrawOffer(true);
    });
    
    socket.on("game:drawAccepted", (data) => {
      console.log("Draw accepted by:", data.by);
      
      setGameOver(true);
      setGameResult({ 
        type: "draw", 
        reason: "agreement" 
      });
      
      setShowDrawOfferDialog(false);
      
      setDrawAcceptedNotice({
        by: data.by || "Opponent"
      });
    });

    socket.on("game:playerResigned", (data) => {
      console.log("Player resigned:", data);
      setResignationNotice({
        username: data.username,
        message: data.message || "The noob resign!"
      });
      setGameOver(true);
      setGameResult({ 
        type: "resignation", 
        winner: user.id 
      });
    });

    return () => {
      socket.off("game:data");
      socket.off("game:over");
      socket.off("game:drawOffer");
      socket.off("game:drawAccepted");
      socket.off("game:playerResigned");
      socket.emit("game:leave", { gameId });
    };
  }, [gameId, isAuthenticated, user]);

  useEffect(() => {
    if (gameStatus) {
      if (gameStatus.isGameOver) {
        setGameOver(true);
        setGameResult(gameStatus.result);
      }
    }
  }, [gameStatus]);

  const handleBackToLobby = () => {
    if (gameId) {
      socket.emit("game:leave", { gameId });
    }
    navigate("/lobby");
  };
  
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
            
          </div>
        )}
        
        <div className="game-status">
          {gameOver && (
            <div className="game-result">
              <h2>Game Over</h2>
              {gameResult?.type === "checkmate" && (
                <p>Checkmate! {gameResult.winner === user.id ? "You won" : "You lost"}</p>
              )}
              {gameResult?.type === "draw" && (
                <p>Game drawn by {gameResult.reason || "agreement"}</p>
              )}
              {gameResult?.type === "resignation" && (
                <p>
                  {gameResult.winner === user.id
                    ? "Opponent resigned. You won!"
                    : "You resigned. You lost."}
                </p>
              )}
              
              <button 
                className="back-to-lobby-btn"
                onClick={handleBackToLobby}
              >
                Back to Lobby
              </button>
            </div>
          )}
          {!gameOver && (
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
        <div className="move-history-container">
        <MoveHistory moves={moves}  />
        </div>
        
        <div className="game-controls-container">
          <GameControls
            canResign={!gameOver}
            onResign={() => setShowResignDialog(true)}
            canOfferDraw={!gameOver}
            onOfferDraw={() => setShowDrawOfferDialog(true)}
            gameOver={gameOver}
          />
        </div>

        <div className="player-info">
          <h3>You ({playerColor})</h3>
      </div>

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

      {/* Resignation notification for the opponent */}
      {resignationNotice && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>Opponent Resigned</h3>
            <p><strong>{resignationNotice.username}</strong>: {resignationNotice.message}</p>
            <div className="dialog-buttons">
              <button onClick={handleBackToLobby} className="confirm-btn">
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

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

      {drawAcceptedNotice && (
        <div className="dialog-overlay">
          <div className="dialog">
            <h3>Draw Accepted</h3>
            <p>{drawAcceptedNotice.by} accepted the draw offer.</p>
            <div className="dialog-buttons">
              <button onClick={handleBackToLobby} className="confirm-btn">
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Promotion selection dialog */}
      {showPromotion && (
        <div className="dialog-overlay">
          <div className="dialog promotion-dialog">
            <h3>Choose Promotion Piece</h3>
            <div className="promotion-options">
              <button 
                onClick={() => completePromotion('q')} 
                className="promotion-btn"
              >
                Queen
              </button>
              <button 
                onClick={() => completePromotion('r')} 
                className="promotion-btn"
              >
                Rook
              </button>
              <button 
                onClick={() => completePromotion('b')} 
                className="promotion-btn"
              >
                Bishop
              </button>
              <button 
                onClick={() => completePromotion('n')} 
                className="promotion-btn"
              >
                Knight
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  );
};

export default Play;