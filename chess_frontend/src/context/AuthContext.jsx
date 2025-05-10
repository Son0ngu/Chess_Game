import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { getToken, setToken, removeToken, getUserId, setUserId, removeUserId } from '../utils/storage';
import { connectSocket, disconnectSocket } from '../services/socket';

// API base URL - fixed to match your backend routes
const API_URL = process.env.REACT_APP_API_URL || "https://chess-game-2-2fv5.onrender.com";

// Create context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check for existing token on initial load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();
      const userId = getUserId();
      
      if (token && userId) {
        try {
          // Configure axios to use the token
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Fetch user profile using the stored token
          // Changed from /api/users/profile/:userId to /auth/profile
          const response = await axios.get(`${API_URL}/auth/profile`);
          
          if (response.data) {
            setUser(response.data);
            setIsAuthenticated(true);
            // Connect socket with authentication
            connectSocket();
          }
        } catch (error) {
          console.error("Error validating token:", error);
          // Invalid or expired token
          logout();
        }
      }
      
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  // Updated login function that can handle both direct credentials or user data object
  const login = async (...args) => {
    const [loginData, username, password] = args;
    try {
      setError(null);
      setIsLoading(true);
      
      // If loginData already contains token and user (from successful API response)
      if (loginData && loginData.token && loginData.user) {
        const { token, user } = loginData;
        
        // Save token and user ID to storage
        setToken(token);
        setUserId(user.id || user._id); // Handle both id formats
        
        // Set authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Update state
        setUser(user);
        setIsAuthenticated(true);
        
        // Connect socket with authentication
        connectSocket();
        
        return user;
      } else {
        // Regular login flow (when credentials are provided)
        let response;
        
        if (typeof loginData === 'object' && loginData.username) {
          // If it's an object with username, it contains credentials
          response = await axios.post(`${API_URL}/auth/login`, loginData);
        } else if (args.length >= 2) {  // Use args.length instead of arguments.length
          // If two separate arguments (username, password) were provided
          response = await axios.post(`${API_URL}/auth/login`, {
            username,
            password
          });
        } else {
          throw new Error("Invalid login parameters");
        }
        
        const { token, user } = response.data;
        
        // Save token and user ID to storage
        setToken(token);
        setUserId(user.id || user._id); // Handle both id formats
        
        // Set authorization header
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        // Update state
        setUser(user);
        setIsAuthenticated(true);
        
        // Connect socket with authentication
        connectSocket();
        
        return user;
      }
    } catch (error) {
      const message = error.response?.data?.error || "Login failed. Please check your credentials.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Register function - updated endpoint
  const register = async (username, email, password) => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Changed from /api/users/register to /auth/register
      const response = await axios.post(`${API_URL}/auth/register`, {
        username,
        email,
        password
      });
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || "Registration failed. Please try again.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Remove token from storage
    removeToken();
    removeUserId();
    
    // Remove authorization header
    delete axios.defaults.headers.common['Authorization'];
    
    // Update state
    setUser(null);
    setIsAuthenticated(false);
    
    // Disconnect socket
    disconnectSocket();
  };

  // Update user profile - updated endpoint
  const updateProfile = async (userData) => {
    try {
      setIsLoading(true);
      // Changed from /api/users/profile/:userId to /auth/profile
      const response = await axios.put(`${API_URL}/auth/profile`, userData);
      
      if (response.data) {
        setUser({...user, ...response.data});
      }
      
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || "Failed to update profile.";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    register,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;