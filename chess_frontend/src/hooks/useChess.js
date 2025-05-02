import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { socket } from '../services/socket';

/**
 * Custom hook to manage chess game state and socket communication
 * @param {string} gameId - The ID of the current game
 * @returns {Object} Chess game state and methods
 */
const useChess = (gameId) => {
  const { user } = useAuth();
  
  // Game state
  const [board, setBoard] = useState(initialBoard());
  const [position, setPosition] = useState(null);
  const [moves, setMoves] = useState([]);
  const [currentTurn, setCurrentTurn] = useState('white');
  const [playerColor, setPlayerColor] = useState(null);
  const [possibleMoves, setPossibleMoves] = useState({});
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [inCheck, setInCheck] = useState(false);
  const [gameStatus, setGameStatus] = useState({
    isGameOver: false,
    result: null
  });
  
  // Initialize game when component mounts
  useEffect(() => {
    if (!gameId) return;

    // Join the game
    socket.emit('game:join', { gameId });
    
    // Handle initial game data
    const handleGameData = (data) => {
      if (!data) return;
      
      setBoard(data.board || initialBoard());
      setPosition(data.position || null);
      setMoves(data.moves || []);
      setCurrentTurn(data.currentTurn || 'white');
      
      // Set player color based on the player's user ID
      if (data.players && Array.isArray(data.players) && user) {
        const playerData = data.players.find(p => p && p.id === user.id);
        setPlayerColor(playerData?.color || 'white');
      }
      
      // Update game status
      setInCheck(data.inCheck || false);
      setPossibleMoves(data.legalMoves || {});

      if (data.gameOver) {
        setGameStatus({
          isGameOver: true,
          result: data.result
        });
      }
    };

    // Listen for game updates
    socket.on('game:update', (data) => {
      if (!data) return;
      
      console.log("Game update received:", data.board, data.position);
      setBoard(data.board || initialBoard());
      setPosition(data.position || null);
      setCurrentTurn(data.currentTurn || 'white');
      setInCheck(data.inCheck || false);
      setPossibleMoves(data.legalMoves || {});

      if (data.lastMove) {
        setMoves(prevMoves => [...prevMoves, data.lastMove]);
      } else if (data.history) {
        setMoves(data.history); // fallback when joining game
      }
      
      if (data.gameOver) {
        setGameStatus({
          isGameOver: true,
          result: data.result
        });
      }
    });
    
    // Listen for game data when joining
    socket.on('game:data', handleGameData);
    
    // Listen for move validation failures
    socket.on('game:moveRejected', (error) => {
      console.error('Move rejected:', error);
      // Reset any UI state needed after failed move
    });
    
    // Cleanup on unmount
    return () => {
      socket.off('game:update');
      socket.off('game:data');
      socket.off('game:moveRejected');
      socket.emit('game:leave', { gameId });
    };
  }, [gameId, user]);
  
  // Handle piece selection and move highlighting
  const selectPiece = useCallback((piece, position) => {
    // Only allow selection of the player's own pieces during their turn
    if (piece && piece.color === playerColor && currentTurn === playerColor) {
      setSelectedPiece({ piece, position });
      // Highlight possible moves for this piece
    } else {
      setSelectedPiece(null);
    }
  }, [playerColor, currentTurn]);
  
  // Make a move
  const makeMove = useCallback((from, to) => {
    if (gameStatus.isGameOver || currentTurn !== playerColor) {
      return false;
    }
    
    // Send move to server
    socket.emit('game:move', {
      gameId,
      from,
      to
    });
    
    return true;
  }, [gameId, currentTurn, playerColor, gameStatus.isGameOver]);
  
  // Reset game
  const reset = useCallback(() => {
    socket.emit('game:reset', { gameId });
  }, [gameId]);
  
  return {
    board,
    position,
    currentTurn,
    playerColor,
    moves,
    inCheck,
    possibleMoves,
    selectedPiece,
    gameStatus,
    selectPiece,
    makeMove,
    reset
  };
};

// Helper function to create initial empty board
function initialBoard() {
  // Create 8x8 empty board representation
  // This could be replaced with FEN parsing if you use chess.js or another library
  return Array(8).fill().map(() => Array(8).fill(null));
}

export default useChess;