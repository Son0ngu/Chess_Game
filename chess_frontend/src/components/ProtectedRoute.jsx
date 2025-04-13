import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute component that checks if user is authenticated
 * Redirects to signin page if not authenticated
 */
const ProtectedRoute = ({ children }) => {
  // Get authentication status from localStorage
  const isAuthenticated = () => {
    const user = localStorage.getItem('chessUser');
    return user && JSON.parse(user).token;
  };

  // If not authenticated, redirect to signin page
  if (!isAuthenticated()) {
    return <Navigate to="/signin" replace />;
  }

  // If authenticated, render the protected component
  return children;
};

export default ProtectedRoute;