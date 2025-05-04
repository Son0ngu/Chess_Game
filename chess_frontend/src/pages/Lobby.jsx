import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Lobby.css";
import Spinner from "../components/Spinner";
import { socket } from "../services/socket";
import { Link } from "react-router-dom";

const Lobby = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [isLoading] = useState(false);
  const [matchmaking, setMatchmaking] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [activePlayers, setActivePlayers] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/signin");
    }
  }, [isAuthenticated, navigate]);

  // Handle socket connections and events
  useEffect(() => {
    if (!isAuthenticated) return;

    socket.emit("lobby:join");

    // Listen for active players list
    socket.on("lobby:activePlayers", (players) => {
      setActivePlayers(players);
    });

    // Listen for game match found
    socket.on("game:matched", (gameData) => {
      console.log("Match found:", gameData);
      setMatchmaking(false);
      
      // Kiểm tra gameId hợp lệ trước khi điều hướng
      if (gameData && gameData.gameId && gameData.gameId !== "undefined") {
        navigate(`/play/${gameData.gameId}`);
      } else {
        console.error("Invalid gameId received:", gameData);
        setErrorMessage("Lỗi khi tìm trận. Vui lòng thử lại sau.");
        
        // Auto-hide error after 5 seconds
        setTimeout(() => setErrorMessage(""), 5000);
      }
    });
    
    // Listen for game errors
    socket.on("game:error", (error) => {
      console.error("Game error:", error);
      setMatchmaking(false);
      setErrorMessage(error.message || "Có lỗi xảy ra, vui lòng thử lại.");
      
      // Auto-hide error after 5 seconds
      setTimeout(() => setErrorMessage(""), 5000);
    });
    
    // Listen for matchmaking status
    socket.on("game:finding", (data) => {
      console.log("Finding match, position in queue:", data.position);
    });

    return () => {
      socket.emit("lobby:leave");
      socket.off("lobby:activePlayers");
      socket.off("game:matched");
      socket.off("game:error");
      socket.off("game:finding");
    };
  }, [isAuthenticated, navigate]);

  // Ensure activePlayers is always an array
  useEffect(() => {
    if (!Array.isArray(activePlayers)) {
      setActivePlayers([]);
    }
  }, [activePlayers]);

  // Update search time counter
  useEffect(() => {
    let interval;
    if (matchmaking) {
      interval = setInterval(() => {
        setSearchTime((prev) => prev + 1);
      }, 1000);
    } else {
      setSearchTime(0);
    }

    return () => clearInterval(interval);
  }, [matchmaking]);

  const handleFindMatch = () => {
    setErrorMessage("");
    setMatchmaking(true);
    socket.emit("game:findMatch");
  };

  const handleCancelSearch = () => {
    setMatchmaking(false);
    socket.emit("game:cancelMatch");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  if (!isAuthenticated) {
    return <Spinner />;
  }

  return (
    <>
    <Link to="/" className="home-btn fixed-home-btn">Home</Link>
    <div className="lobby-container">
      <div className="lobby-header">
        <div className="header-title-box">
          <h1>Game Lobby</h1>
        </div>
        
        <div className="header-user-info">
          <div className="user-box">
            <span className="user-name">{user?.username || "User"}</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="error-message">
          {errorMessage}
        </div>
      )}

      <div className="lobby-main">
        <div className="matchmaking-panel">
          <h2>Find a Match</h2>
          
          {!matchmaking ? (
            <button 
              className="find-match-button" 
              onClick={handleFindMatch}
              disabled={isLoading}
            >
              Find Match
            </button>
          ) : (
            <div className="searching-status">
              <div className="spinner"></div>
              <p>Searching for opponent...</p>
              <p className="search-time">Time: {formatTime(searchTime)}</p>
              <button 
                className="cancel-search-button"
                onClick={handleCancelSearch}
              >
                Cancel Search
              </button>
            </div>
          )}
        </div>
        
        <div className="active-players">
          <h2>Active Players</h2>
          {Array.isArray(activePlayers) && activePlayers.length > 0 ? (
            <ul className="players-list">
              {activePlayers.map(player => (
                <li key={player.id} className="player-item">
                  <span className="player-name">{player.username}</span>
                  <span className="player-status">{player.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-players">No active players at the moment.</p>
          )}
        </div>
      </div>
    </div>
    </>
  );
};

export default Lobby;