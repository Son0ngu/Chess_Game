/**
 * Local storage utility functions for authentication
 */

// Token management
export const getToken = () => {
  return localStorage.getItem('chessToken');
};

export const setToken = (token) => {
  localStorage.setItem('chessToken', token);
};

export const removeToken = () => {
  localStorage.removeItem('chessToken');
};

// User ID management
export const getUserId = () => {
  return localStorage.getItem('chessUserId');
};

export const setUserId = (id) => {
  localStorage.setItem('chessUserId', id);
};

export const removeUserId = () => {
  localStorage.removeItem('chessUserId');
};