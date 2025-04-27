import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/Lobby.css";
import Spinner from "../components/Spinner";
import { socket } from "../services/socket";

const Lobby = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth(); // Lấy thêm user từ AuthContext
  const [isLoading] = useState(false);
  const [matchmaking, setMatchmaking] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [activePlayers, setActivePlayers] = useState([]);

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

    // Listen for online users count
    socket.on("lobby:usersCount", (count) => {
      setOnlineUsers(count);
    });

    // Listen for active players list
    socket.on("lobby:activePlayers", (players) => {
      setActivePlayers(players);
    });

    // Listen for game match found
    socket.on("game:matched", (gameData) => {
      setMatchmaking(false);
      navigate(`/play/${gameData.id}`);
    });

    return () => {
      socket.emit("lobby:leave");
      socket.off("lobby:usersCount");
      socket.off("lobby:activePlayers");
      socket.off("game:matched");
    };
  }, [isAuthenticated, navigate]);

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
    setMatchmaking(true);
    socket.emit("game:findMatch", {
      gameMode: "casual",
      timeControl: "10min"
    });
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
    <div className="lobby-container">
      <div className="lobby-header">
        <div className="header-title-box">
          <h1>Game Lobby</h1>
        </div>
        
        <div className="header-user-info">
          <div className="user-box">
            <span className="user-name">{user?.username || "User"}</span>
          </div>
          
          <div className="online-count">
            <div className="dot"></div>
            <span>Online: {onlineUsers}</span>
          </div>
        </div>
      </div>

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
          {activePlayers.length > 0 ? (
            <ul className="players-list">
              {activePlayers.map(player => (
                <li key={player.id} className="player-item">
                  <span className="player-name">{player.username}</span>
                  <span className="player-rating">Rating: {player.rating}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-players">No active players at the moment.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;