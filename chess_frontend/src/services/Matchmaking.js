import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket, SOCKET_EVENTS } from '../../services/socket';
import './Matchmaking.css';

const Matchmaking = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchTime, setSearchTime] = useState(0);
  const [error, setError] = useState(null);
  const [queueSize, setQueueSize] = useState({ casual: 0, ranked: 0 });
  const [activePlayers, setActivePlayers] = useState([]);
  const navigate = useNavigate();

  // Start searching for a match
  const findMatch = (options = {}) => {
    setError(null);
    setIsSearching(true);
    setSearchTime(0);
    
    console.log('Finding match with options:', options);
    socket.emit('game:findMatch', options);
  };

  // Cancel search
  const cancelSearch = () => {
    socket.emit('game:cancelSearch');
    setIsSearching(false);
    setError(null);
  };

  useEffect(() => {
    // Get active players on component mount
    socket.emit('lobby:getActivePlayers');

    // Handle match found
    const handleMatchFound = (data) => {
      console.log('Match found!', data);
      
      if (!data) {
        console.error('No match data received');
        setError('Error: No game data received from server');
        setIsSearching(false);
        return;
      }
      
      if (!data.gameId) {
        console.error('Invalid match data - missing gameId:', data);
        setError('Error: Invalid game data received from server');
        setIsSearching(false);
        return;
      }
      
      console.log(`Successfully matched! Navigating to game ${data.gameId}`);
      setIsSearching(false);
      // Navigate to game page
      navigate(`/play/${data.gameId}`);
    };

    // Handle search confirmation
    const handleSearching = () => {
      console.log('Server confirmed we are searching');
      setIsSearching(true);
    };

    // Handle search canceled
    const handleSearchCanceled = () => {
      console.log('Search canceled');
      setIsSearching(false);
    };

    // Handle matchmaking updates
    const handleMatchmakingUpdate = (data) => {
      console.log('Matchmaking update:', data);
      if (data.queueSize) {
        setQueueSize(data.queueSize);
      }
      
      if (data.cleared) {
        setIsSearching(false);
        setError('Matchmaking was cleared by administrator');
      }
    };

    // Handle active players update
    const handleActivePlayers = (players) => {
      console.log('Active players update:', players);
      setActivePlayers(players || []);
    };

    // Handle errors
    const handleError = (error) => {
      console.error('Game error:', error);
      setError(error.message || 'An error occurred');
      setIsSearching(false);
    };

    // Set up event listeners
    socket.on(SOCKET_EVENTS.GAME_MATCHED, handleMatchFound);
    socket.on(SOCKET_EVENTS.GAME_SEARCHING, handleSearching);
    socket.on(SOCKET_EVENTS.GAME_SEARCH_CANCELED, handleSearchCanceled);
    socket.on(SOCKET_EVENTS.MATCHMAKING_UPDATE, handleMatchmakingUpdate);
    socket.on(SOCKET_EVENTS.LOBBY_ACTIVE_PLAYERS, handleActivePlayers);
    socket.on(SOCKET_EVENTS.GAME_ERROR, handleError);

    // Timer for search time
    let timer;
    if (isSearching) {
      timer = setInterval(() => {
        setSearchTime(prev => prev + 1);
      }, 1000);
    }

    // Debug event connection
    console.log('Setting up matchmaking event handlers');

    // Clean up
    return () => {
      console.log('Unmounting Matchmaking component, cleaning up');
      socket.off(SOCKET_EVENTS.GAME_MATCHED, handleMatchFound);
      socket.off(SOCKET_EVENTS.GAME_SEARCHING, handleSearching);
      socket.off(SOCKET_EVENTS.GAME_SEARCH_CANCELED, handleSearchCanceled);
      socket.off(SOCKET_EVENTS.MATCHMAKING_UPDATE, handleMatchmakingUpdate);
      socket.off(SOCKET_EVENTS.LOBBY_ACTIVE_PLAYERS, handleActivePlayers);
      socket.off(SOCKET_EVENTS.GAME_ERROR, handleError);
      
      if (isSearching) {
        console.log('Component unmounting while searching, canceling search');
        cancelSearch();
      }
      
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [navigate, isSearching]);

  // Format search time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <div className="matchmaking-container">
      <h2>Find a Match</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {isSearching ? (
        <div className="searching-status">
          <p>Searching for opponent...</p>
          <p>Time: {formatTime(searchTime)}</p>
          {queueSize && (
            <p>Players in queue: {
              typeof queueSize === 'object'
                ? (queueSize.casual || 0) + (queueSize.ranked || 0) 
                : queueSize
            }</p>
          )}
          <button onClick={cancelSearch} className="cancel-button">
            Cancel Search
          </button>
        </div>
      ) : (
        <div className="match-options">
          <button onClick={() => findMatch({ gameMode: 'casual', timeControl: '10min' })}>
            Find Casual Match (10 min)
          </button>
          <button onClick={() => findMatch({ gameMode: 'ranked', timeControl: '10min' })}>
            Find Ranked Match (10 min)
          </button>
        </div>
      )}
      
      <div className="active-players">
        <h3>Active Players</h3>
        <div className="players-list">
          {activePlayers.length > 0 ? (
            activePlayers.map(player => (
              <div key={player.id} className="player-item">
                <span>{player.username}</span>
                <span>Rating: {player.elo}</span>
              </div>
            ))
          ) : (
            <p>No active players</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Matchmaking;