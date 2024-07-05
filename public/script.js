const socket = io();
const tap = new Audio('./assets/sounds/tap.mp3');
const winSound = new Audio('./assets/sounds/win.mp3');
const gameOverSound = new Audio('./assets/sounds/gameover.mp3');
const createGameButton = document.getElementById('createGame');
const resetGameButton = document.getElementById('resetGame');
const invertRulesButton = document.getElementById('invertRules');
const boardElement = document.getElementById('board');
const statusElement = document.getElementById('status');
const scoreboardElement = document.getElementById('scoreboard');
const scoreXElement = document.getElementById('scoreX');
const scoreOElement = document.getElementById('scoreO');
const playerInfoElement = document.getElementById('playerInfo');
const playerCharacter = document.getElementById("character");
const strike = document.getElementById('strike');
createGameButton.addEventListener('click', () => {
  socket.emit('createGame');
});
let useGameId = '';
resetGameButton.addEventListener('click', () => {
    console.log('here')
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId');
  if (useGameId) {
    console.log('triggered')
    socket.emit('resetGame', useGameId);
    strike.classList.add('hidden');
  }
});

invertRulesButton.addEventListener('click', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('gameId');
  if (gameId) {
    socket.emit('invertRules', gameId);
  }
});
socket.on('hideStrike',()=>{
    strike.classList.add('hidden');
});
socket.on('gameCreated', (gameId) => {
    useGameId = gameId;
  const inviteLink = `${window.location.href}?gameId=${gameId}`;
  navigator.clipboard.writeText(inviteLink).then(() => {
    alert(`Game created! Invite link copied to clipboard: ${inviteLink}`);
  });

  createGameButton.classList.add('hidden');
  resetGameButton.classList.remove('hidden');
  invertRulesButton.classList.remove('hidden');
  boardElement.classList.remove('hidden');
  scoreboardElement.classList.remove('hidden');
  updateStatus('Waiting for another player to join...');
});

socket.on('gameJoined', (gameId) => {
  const urlParams = new URLSearchParams(window.location.search).get('gameId');
  if(urlParams){
    useGameId(urlParams)
  }
  const character = games[gameId].players[0] === socket.id ? 'X' : 'O';
  playerCharacter.textContent = character;
  playerInfoElement.textContent = `You are playing as: ${character}`;
  playerInfoElement.classList.remove('hidden');

  createGameButton.classList.add('hidden');
  resetGameButton.classList.remove('hidden');
  invertRulesButton.classList.remove('hidden');
  boardElement.classList.remove('hidden');
  scoreboardElement.classList.remove('hidden');
  updateStatus('Game started');
  
});

socket.on('startGame', (message) => {
  updateStatus(message);
  tap.play();
});

socket.on('gameUpdate', (game) => {
  updateBoard(game.board);
  updateStatus(`Current turn: ${game.turn==='X' ? '❌' : '⭕'}`);
  tap.play();
  createGameButton.classList.add('hidden');
  resetGameButton.classList.remove('hidden');
  invertRulesButton.classList.remove('hidden');
  boardElement.classList.remove('hidden');
  scoreboardElement.classList.remove('hidden');
});

socket.on('gameOver', ({winner,message, className, scores}) => {
  updateStatus(message);
  console.log(scores)
  if(winner){
    winSound.play();
    strike.classList.remove('hidden');
    strike.classList.add(className??'hidden');
    if(scores){
        scoreXElement.innerText = scores.X;
        scoreOElement.innerText = scores.O;
    }
  }
  else{
    gameOverSound.play();
  }
});

socket.on('updateScoreboard', (scores) => {
  scoreXElement.textContent = scores.X;
  scoreOElement.textContent = scores.O;
});

socket.on('rulesInverted', (inverted) => {
  updateStatus(inverted ? 'Rules are inverted: Winner loses!' : 'Rules are normal: Winner wins!');
  tap.play();
  tap.play();
  tap.play();
});

socket.on('errorMessage', (message) => {
  alert(message);
});

const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('gameId');
if (gameId) {
  socket.emit('joinGame', gameId);
}

for (let i = 0; i < 9; i++) {
  const cell = document.createElement('div');
  cell.classList.add('cell');
  cell.addEventListener('click', () => {
    socket.emit('makeMove', i);
  });
  boardElement.appendChild(cell);
}

function updateBoard(board) {
    console.log(playerCharacter.textContent)
  const cells = document.querySelectorAll('.cell');
  cells.forEach((cell, index) => {
    cell.textContent = board[index];
  });
}

function updateStatus(status) {
  statusElement.textContent = status;
}
