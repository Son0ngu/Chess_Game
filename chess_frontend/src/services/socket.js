import { io } from 'socket.io-client';
import { getToken } from '../utils/storage';

// Base URL for socket connection
const SOCKET_URL = 'http://localhost:5000';

// Create socket instance with authentication
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: getToken
  }
});

// Connect socket with current token
export const connectSocket = () => {
  if (getToken()) {
    socket.auth = { token: getToken() };
    socket.connect();
  }
};

// Disconnect socket
export const disconnectSocket = () => {
  socket.disconnect();
};

// Listen for connection/errors
socket.on('connect', () => {
  console.log('Socket connected');
<<<<<<< HEAD


=======
  // Removed the incorrect piece reference that was causing the error
>>>>>>> 271741699c8679088a7bd9e33f5734f4a261d0d5
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error.message);
  
  // If authentication error, handle it
  if (error.message === 'authentication_error') {
    console.error('Authentication failed for socket connection');
  }
});

export default socket;