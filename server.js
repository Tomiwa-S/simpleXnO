const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let games = {};
function resetGame(game) {
  game.board = new Array(9).fill(null);
  game.turn = 'X';
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('createGame', () => {
    const gameId = uuidv4();
    games[gameId] = { players: [], board: Array(9).fill(null), turn: 'X', scores: { X: 0, O: 0 }, invertRules: false };
    socket.join(gameId);
    games[gameId].players.push(socket.id);
    socket.emit('gameCreated', gameId);
  });

  socket.on('joinGame', (gameId) => {
    if (games[gameId]) {
      if (games[gameId].players.length < 2) {
        socket.join(gameId);
        games[gameId].players.push(socket.id);
        socket.emit('gameJoined', gameId);

        if (games[gameId].players.length === 2) {
          io.to(gameId).emit('startGame', 'Game started');
        }

        io.to(gameId).emit('gameUpdate', games[gameId]);
      } else {
        socket.emit('errorMessage', 'Game is already full');
      }
    } else {
      socket.emit('errorMessage', 'Game not found');
    }
  });

  socket.on('makeMove', (index) => {
    const gameId = Object.keys(games).find((id) => games[id].players.includes(socket.id));
    const game = games[gameId];

    if (game && game.board[index] === null) {
      const currentPlayer = game.players[game.turn === 'X' ? 0 : 1];
      if (socket.id === currentPlayer) {
        game.board[index] = game.turn==='X'?'❌':'⭕';
        game.turn = game.turn === 'X' ? 'O' : 'X';

        io.to(gameId).emit('gameUpdate', game);

        const {winner, className} = checkWinner(game.board) ?? {winner:false,className:''};
        if (winner) {
            
          if (game.invertRules) {
            game.scores[winner === 'X' ? '⭕' : '❌']++;
            
            io.to(gameId).emit('gameOver', `Player ${winner} wins but loses due to inverted rules!`);
          } else {
            game.scores[winner=='❌'?'X':'O']++;
            console.log(game);
            console.log(game.scores);
            io.to(gameId).emit('gameOver', {winner:winner, message:`Player ${winner} wins!` ,className:className, score: game.scores});
          }
          io.to(gameId).emit('updateScoreboard', game.scores);
          resetGame(game);
        } else if (game.board.every(cell => cell !== null)) {
          io.to(gameId).emit('gameOver', 'It\'s a tie!');
          resetGame(game);
        }
      }
    }
  });

  socket.on('resetGame', (gameId) => {
    if (games[gameId]) {
      resetGame(games[gameId]);
      io.to(gameId).emit('gameUpdate', games[gameId]);
      io.to(gameId).emit('hideStrike');
    }
  });

  socket.on('invertRules', (gameId) => {
    if (games[gameId]) {
      games[gameId].invertRules = !games[gameId].invertRules;
      io.to(gameId).emit('rulesInverted', games[gameId].invertRules);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    const gameId = Object.keys(games).find((id) => games[id].players.includes(socket.id));
    if (gameId) {
      io.to(gameId).emit('gameOver', 'A player disconnected');
      delete games[gameId];
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

function checkWinner(board) {
  const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  for (const pattern of winPatterns) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        let className = "";
        if (a === 0 && b === 1 && c === 2) {
        className = "h1";
      } else if (a === 3 && b === 4 && c === 5) {
        className = "h2";
      } else if (a === 6 && b === 7 && c === 8) {
        className = "h3";
      } else if (a === 0 && b === 3 && c === 6) {
        className = "v1";
      } else if (a === 1 && b === 4 && c === 7) {
        className = "v2";
      } else if (a === 2 && b === 5 && c === 8) {
        className = "v3";
      } else if (a === 0 && b === 4 && c === 8) {
        className = "x1";
      } else if (a === 2 && b === 4 && c === 6) {
        className = "x2";
      }
      const winner = board[a];
      return {winner:winner, className: className};
    }
  }

  return null;
}

