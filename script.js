const grid = document.getElementById('grid');
const queueList = document.getElementById('queue-list');
const pipeSymbols = {
  straight: ['┃', '━'],
  elbow: ['┏', '┓', '┛', '┗']
};
const MAX_QUEUE_SIZE = 5;

const directionOffsets = {
  up: -5,
  down: 5,
  left: -1,
  right: 1,
};

const pipeConnections = {
  straight: {
    0: ['up', 'down'],    // ┃
    1: ['left', 'right'], // ━
  },
  elbow: {
    0: ['down', 'right'],   // ┏
    1: ['down', 'left'],    // ┓
    2: ['up', 'left'],      // ┛
    3: ['up', 'right'],     // ┗
  }
};

let selectedCell = null;

// Init grid: well = 0, house = 24, 2 random boulders
const gridState = Array.from({ length: 25 }, (_, i) => {
  if (i === 0) return { type: 'well' };
  if (i === 24) return { type: 'house' };
  return null;
});

// Place 5 random boulders
(function placeBoulders() {
  let placed = 0;
  while (placed < 5) {
    const index = Math.floor(Math.random() * 25);
    if (!gridState[index]) {
      gridState[index] = { type: 'boulder' };
      placed++;
    }
  }
})();

function renderGrid() {
  grid.innerHTML = '';
  gridState.forEach((cellState, i) => {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;

    if (cellState?.type === 'well') {
      cell.textContent = '💧';
      cell.classList.add('well');
    } else if (cellState?.type === 'house') {
      cell.textContent = '🏠';
      cell.classList.add('house');
    } else if (cellState?.type === 'boulder') {
      cell.textContent = '🪨';
      cell.classList.add('boulder');
    } else if (cellState?.type) {
      cell.textContent = getPipeSymbol(cellState);
    }

    cell.addEventListener('click', () => {
      if (selectedCell) selectedCell.classList.remove('selected');
      selectedCell = cell;
      cell.classList.add('selected');
    });

    grid.appendChild(cell);
  });
}

// Initialize pipe queue
let pipeQueue = Array.from({ length: MAX_QUEUE_SIZE }, randomPipe);

function generatePipeQueue(length) {
  const types = ['straight', 'elbow'];
  return Array.from({ length }, () => {
    const type = types[Math.floor(Math.random() * types.length)];
    return { type, rotation: 0 };
  });
}

function renderQueue() {
  queueList.innerHTML = '';
  pipeQueue.forEach(piece => {
    const div = document.createElement('div');
    div.classList.add('pipe-piece');
    div.textContent = getPipeSymbol(piece);
    queueList.appendChild(div);

    if (pipeQueue.indexOf(piece) === 0) {
      div.style.border = '2px solid #0077cc';
      div.style.backgroundColor = '#e6f3ff';
    }
  });
}

function getPipeSymbol(pipe) {
  const symbols = pipeSymbols[pipe.type];
  return symbols[pipe.rotation % symbols.length];
}

function getConnections(pipe) {
  if (!pipeConnections[pipe.type]) return [];
  const connections = pipeConnections[pipe.type];
  const rotation = pipe.rotation % Object.keys(connections).length;
  return connections[rotation];
}

function opposite(dir) {
  return {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  }[dir];
}

function isValidMove(fromIndex, toIndex, dir) {
  if (toIndex < 0 || toIndex >= gridState.length) return false;
  if (dir === 'left' && fromIndex % 5 === 0) return false;
  if (dir === 'right' && fromIndex % 5 === 4) return false;
  return true;
}

function highlightPath(pathSet) {
  document.querySelectorAll('.cell').forEach(cell => {
    cell.classList.remove('flowing');
  });

  pathSet.forEach(index => {
    const cellEl = document.querySelector(`.cell[data-index="${index}"]`);
    if (cellEl) cellEl.classList.add('flowing');
  });
}

function checkConnectionAndHighlight() {
  const visited = new Set();
  const path = new Set();
  const stack = [{ index: 0, from: null }];

  while (stack.length > 0) {
    const { index, from } = stack.pop();
    if (visited.has(index)) continue;
    visited.add(index);
    path.add(index);

    const cell = gridState[index];

    if (cell?.type === 'well') {
      for (const dir of ['up', 'down', 'left', 'right']) {
        const neighborIndex = index + directionOffsets[dir];
        if (!isValidMove(index, neighborIndex, dir)) continue;

        const neighbor = gridState[neighborIndex];
        if (!neighbor || !neighbor.type || neighbor.type === 'boulder') continue;

        const neighborConnections = getConnections(neighbor);
        if (neighborConnections.includes(opposite(dir))) {
          stack.push({ index: neighborIndex, from: dir });
        }
      }
      continue;
    }

    if (!cell || !cell.type || cell.type === 'boulder') continue;

    const connections = getConnections(cell);
    for (const dir of connections) {
      if (from && dir === opposite(from)) continue;

      const neighborIndex = index + directionOffsets[dir];
      if (!isValidMove(index, neighborIndex, dir)) continue;

      const neighbor = gridState[neighborIndex];
      if (!neighbor || neighbor.type === 'well' || neighbor.type === 'boulder') continue;

      const neighborConnections = getConnections(neighbor);

      // ✅ House check
      if (neighbor.type === 'house') {
        if (dir === 'down' || dir === 'right') {
          highlightPath(path);
          return true;
        }
      } else if (neighborConnections.includes(opposite(dir))) {
        stack.push({ index: neighborIndex, from: dir });
      }
    }
  }

  highlightPath(path);
  return false;
}

// Timer functionality
let timerInterval = null;
let elapsedTime = 0;

function startTimer() {
  const timerDisplay = document.getElementById('timer-display');
  elapsedTime = 0;
  timerDisplay.textContent = `⏱️ Time: ${elapsedTime}s`;

  timerInterval = setInterval(() => {
    elapsedTime++;
    timerDisplay.textContent = `⏱️ Time: ${elapsedTime}s`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// Place pipe from queue
document.getElementById('place-btn').addEventListener('click', () => {
  if (!selectedCell) return alert("Select a grid cell!");
  const index = +selectedCell.dataset.index;
  const cellState = gridState[index];

  if (cellState) return alert("This cell is already occupied or blocked!");

  const nextPipe = pipeQueue.shift();
  gridState[index] = { ...nextPipe };

  while (pipeQueue.length < MAX_QUEUE_SIZE) {
    pipeQueue.push(randomPipe());
  }

  renderGrid();
  renderQueue();
});

// Random pipe generator
function randomPipe() {
  const types = ['straight', 'elbow'];
  const type = types[Math.floor(Math.random() * types.length)];
  return { type, rotation: 0 };
}

// Flow check with debug path
document.getElementById('flow-btn').addEventListener('click', () => {
  const connected = checkConnectionAndHighlight();
  if (connected) {
    stopTimer();
    const winOverlay = document.getElementById('win-overlay');
    const gameBoard = document.getElementById('game-board');
    const pipeQueue = document.getElementById('pipe-queue');
    const controls = document.getElementById('controls');
    const timerDisplay = document.getElementById('timer-display');
    const restart = document.getElementById('restart');

    winOverlay.querySelector('p').textContent = `Water successfully reached the house in ${elapsedTime} seconds!`;
    winOverlay.classList.remove('hidden');
    gameBoard.classList.add('hidden');
    pipeQueue.classList.add('hidden');
    controls.classList.add('hidden');
    timerDisplay.classList.add('hidden');
    restart.classList.add('hidden');
  } else {
    alert("🚫 Water did not reach the house.");
  }
});

// Rotate the first piece in the queue
document.getElementById('rotate-queue-btn').addEventListener('click', () => {
  if (pipeQueue.length === 0) return;
  pipeQueue[0].rotation = (pipeQueue[0].rotation + 1) % 4;
  renderQueue();
});

// Reset game button
document.getElementById('reset-btn').addEventListener('click', resetGame);

// Close win overlay
document.getElementById('close-win-btn').addEventListener('click', () => {
  const winOverlay = document.getElementById('win-overlay');
  const gameBoard = document.getElementById('game-board');
  const pipeQueue = document.getElementById('pipe-queue');
  const controls = document.getElementById('controls');
  const timerDisplay = document.getElementById('timer-display');
  const restart = document.getElementById('restart');

  winOverlay.classList.add('hidden');
  gameBoard.classList.remove('hidden');
  pipeQueue.classList.remove('hidden');
  controls.classList.remove('hidden');
  timerDisplay.classList.remove('hidden');
  restart.classList.remove('hidden');
  resetGame();
});

// Initialize game
renderGrid();
renderQueue();
startTimer(); // Start the timer when the game initializes

// Reset game
function resetGame() {
  selectedCell = null;

  // Reset grid
  for (let i = 0; i < gridState.length; i++) {
    gridState[i] = null;
  }

  gridState[0] = { type: 'well' };
  gridState[24] = { type: 'house' };

  // Place new boulders
  let placed = 0;
  while (placed < 5) {
    const index = Math.floor(Math.random() * 25);
    if (!gridState[index]) {
      gridState[index] = { type: 'boulder' };
      placed++;
    }
  }

  // Reset queue
  pipeQueue = Array.from({ length: MAX_QUEUE_SIZE }, randomPipe);

  renderGrid();
  renderQueue();

  // Reset and restart timer
  stopTimer();
  startTimer();
}