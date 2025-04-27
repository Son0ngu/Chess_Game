import { io } from "socket.io-client";

// Read from environment variables or use default
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:5000";

// Connection options
const options = {
  transports: ["websocket"],
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
  auth: {
    token: localStorage.getItem('token')
  }
};

// Create socket instance
const socket = io(SOCKET_URL, options);

// Connection event handlers
socket.on("connect", () => {
  console.log("Connected to server, Socket ID:", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error.message);
});

socket.on("disconnect", (reason) => {
  console.log("Disconnected from server:", reason);
  
  // If the server disconnected us, try to reconnect
  if (reason === "io server disconnect") {
    socket.connect();
  }
});

// Update auth token when it changes
export const updateSocketAuth = () => {
  const token = localStorage.getItem('token');
  if (token) {
    socket.auth = { token };
    // If already connected, update the auth and reconnect
    if (socket.connected) {
      socket.disconnect().connect();
    }
  }
};

export default socket;
