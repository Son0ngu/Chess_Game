const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

let users = []; // Database giả lập

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Xử lý đăng ký
  socket.on("signup", (data, callback) => {
    const { username, password, email, realName } = data;
    if (users.find((user) => user.username === username)) {
      return callback({ status: "error", message: "Username đã tồn tại!" });
    }
    users.push({ username, password, email, realName });
    console.log("User signed up:", username);
    callback({ status: "ok" });
  });

  // Xử lý đăng nhập
  socket.on("signin", (data, callback) => {
    const { username, password } = data;
    const user = users.find((u) => u.username === username && u.password === password);
    if (!user) {
      return callback({ status: "error", message: "Sai username hoặc password!" });
    }
    console.log("User logged in:", username);
    callback({ status: "ok" });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const port = process.env.PORT || 5000; // Fallback to 5000 if PORT isn't defined
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
