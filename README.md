# Chess_Game
backend/
├── .env                         # MONGODB_URI, JWT_SECRET, PORT…
├── package.json
├── server.js                    # Entry point: Express + HTTP server + Socket.IO
│
├── config/
│   └── db.js                    # Mongoose connect
│
├── models/
│   ├── User.js                  # user schema (username, password, stats…)
│   └── Game.js                  # game schema (moves, FEN, status, players…)
│
├── middleware/
│   ├── auth.js                  # JWT verify for REST API
│   └── errorHandler.js          # catch-all error middleware
│
├── services/
│   └── GameService.js           # all chess logic + in-memory cache + DB sync
│
├── routes/
│   ├── auth.js                  # /api/auth/register, /api/auth/login
│   └── games.js                 # /api/games, /api/games/:id, /api/games/:id/move…
│
├── socket/
│   └── gameSocket.js            # Socket.IO handlers: matchmaking, join, move, undo…
│
└── utils/
    └── logger.js                # (optional) winston or console logger




frontend/
├── public/
│   └── index.html
│
├── package.json
├── src/
│   ├── index.jsx                # ReactDOM.render + BrowserRouter
│   ├── App.jsx                  # top-level routes (Home, Lobby, Play, SignIn, SignUp)
│   │
│   ├── services/
│   │   ├── api.js               # axios instance (baseURL + auth header)
│   │   └── socket.js            # io('/game', { auth: token })
│   │
│   ├── context/
│   │   └── AuthContext.jsx      # user/token provider + hook
│   │
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Lobby.jsx            # matchmaking UI
│   │   ├── Play.jsx             # game board + move history
│   │   ├── SignIn.jsx
│   │   └── SignUp.jsx
│   │
│   ├── components/
│   │   ├── Board.jsx            # renders 8×8 squares + pieces
│   │   ├── MoveHistory.jsx
│   │   ├── GameControls.jsx     # undo / redo / reset buttons
│   │   └── Spinner.jsx
│   │
│   ├── hooks/
│   │   └── useChess.js          # a hook wrapping gameSubject / socket events
│   │
│   ├── styles/
│   │   ├── App.css
│   │   └── Lobby.css
│   │
│   └── utils/
│       └── storage.js           # get/set token, userId in localStorage
└── README.md
