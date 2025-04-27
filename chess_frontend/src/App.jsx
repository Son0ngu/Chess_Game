import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Play from './pages/Play';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Spinner from './components/Spinner';
import { connectSocket, disconnectSocket } from './services/socket';
import './styles/App.css';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <Spinner />;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }
  
  return children;
};

const App = () => {
  const { isAuthenticated } = useAuth();
  
  // Connect to socket.io when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
    
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);
  
  return (
    <div className="app">
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        
        {/* Protected routes */}
        <Route 
          path="/lobby" 
          element={
            <ProtectedRoute>
              <Lobby />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/play" 
          element={
            <ProtectedRoute>
              <Play />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/play/:gameId" 
          element={
            <ProtectedRoute>
              <Play />
            </ProtectedRoute>
          } 
        />
        
        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
