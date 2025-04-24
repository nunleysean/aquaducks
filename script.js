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

// Define audio files
const sounds = {
  place: new Audio('audio/place.wav'),
  rotate: new Audio('audio/rotate.wav'),
  flow: new Audio('audio/flow.wav'),
  success: new Audio('audio/success.wav'),
  error: new Audio('audio/error.wav'),
  background: new Audio('audio/background.wav')
};

// Set background music to loop and lower volume
sounds.background.loop = true;
sounds.background.volume = 0.1; // Lowered volume to 10%

// Sound control
let soundEnabled = true;

// Play sound helper function with error handling
function playSound(soundName) {
  try {
    // Stop and reset the sound first (allows rapid triggering)
    sounds[soundName].pause();
    sounds[soundName].currentTime = 0;
    
    // Play the sound
    sounds[soundName].play().catch(error => {
      console.log("Sound play error:", error);
      // Many browsers require user interaction before playing audio
    });
  } catch (e) {
    console.log("Sound error:", e);
  }
}

// Toggle sound button functionality
document.getElementById('toggle-sound').addEventListener('click', () => {
  const toggleSoundBtn = document.getElementById('toggle-sound');
  soundEnabled = !soundEnabled;

  if (soundEnabled) {
    sounds.background.play().catch(e => console.log("Background sound error:", e));
    toggleSoundBtn.textContent = '🔊'; // Speaker icon
  } else {
    sounds.background.pause();
    toggleSoundBtn.textContent = '🔇'; // Mute speaker icon
  }
});

// Add to start-game-btn click handler
document.getElementById('start-game-btn').addEventListener('click', () => {
  const introScreen = document.getElementById('intro-screen');
  introScreen.style.display = 'none';
  initializeGame();
  
  // Ensure background sound is paused and reset before playing
  sounds.background.pause();
  sounds.background.currentTime = 0;
  sounds.background.play().catch(e => console.log("Background sound error:", e));
});


let selectedCell = null;
let level = 1; // Initialize level counter

function updateLevelDisplay() {
  const levelDisplay = document.getElementById('level-display');
  levelDisplay.textContent = `Level: ${level}`;
}

// Init grid: well = 0, house = 24, 2 random boulders
const gridState = Array.from({ length: 25 }, (_, i) => {
  if (i === 0) return { type: 'well' };
  if (i === 24) return { type: 'house' };
  return null;
});

// Place 3 random boulders
(function placeBoulders() {
  let placed = 0;
  while (placed < 3) {
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
  if (!selectedCell) {
    alert("Select a grid cell!");
    playSound('error');
    return;
  }
  
  const index = +selectedCell.dataset.index;
  const cellState = gridState[index];

  if (cellState) {
    alert("This cell is already occupied or blocked!");
    playSound('error');
    return;
  }

  const nextPipe = pipeQueue.shift();
  gridState[index] = { ...nextPipe };

  while (pipeQueue.length < MAX_QUEUE_SIZE) {
    pipeQueue.push(randomPipe());
  }

  playSound('place');
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
    playSound('flow');
    stopTimer();
    setTimeout(() => { // Delay the win screen by 3 seconds
      const winOverlay = document.getElementById('win-overlay');
      const gameBoard = document.getElementById('game-board');
      const pipeQueue = document.getElementById('pipe-queue');
      const controls = document.getElementById('controls');
      const timerDisplay = document.getElementById('timer-display');
      const restart = document.getElementById('restart');

      const fact = showWaterFact(); // Get a random water fact
      winOverlay.querySelector('p').textContent = `You successfully delivered fresh water to the village in ${elapsedTime} seconds!`;
      winOverlay.querySelector('#waterfact').textContent = `Water Fact: ${fact}`;
      winOverlay.classList.remove('hidden');
      gameBoard.classList.add('hidden');
      pipeQueue.classList.add('hidden');
      controls.classList.add('hidden');
      timerDisplay.classList.add('hidden');
      restart.classList.add('hidden');
      playSound('success');
    }, 3000); // 3-second delay
  } else {
    playSound('error');
    alert("🚫 Water did not reach the house.");
  }
});

// Rotate the first piece in the queue
document.getElementById('rotate-queue-btn').addEventListener('click', () => {
  if (pipeQueue.length === 0) return;
  pipeQueue[0].rotation = (pipeQueue[0].rotation + 1) % 4;
  playSound('rotate');
  renderQueue();
});

// Reset game button
document.getElementById('reset-btn').addEventListener('click', resetGame);

// Close win overlay and increase level
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

  level++; // Increment level
  resetGame();
});

// Start game button
document.getElementById('start-game-btn').addEventListener('click', () => {
  const introScreen = document.getElementById('intro-screen');
  introScreen.style.display = 'none'; // Hide the intro screen
  initializeGame(); // Call the game initialization function
});

document.getElementById('info-btn').addEventListener('click', () => {
  alert("How to Play:\n\n1. Place pipes on the grid to connect the well to the house.\n2. Rotate pipes in the queue if needed.\n3. Click 'Deliver Water' to check the connection.\n4. Reset the game anytime using the reset button.\n\nGood luck!");
});

// Initialize game with level display
function initializeGame() {
  renderGrid();
  renderQueue();
  startTimer(); // Start the timer when the game initializes
  updateLevelDisplay(); // Initialize level display
}

// charity:water facts
function showWaterFact() {
  const facts = [
    "785 million people lack basic access to clean water.",
    "Women and children spend 200 million hours every day collecting water.",
    "Access to clean water can transform communities and save lives.",
    "Every $1 invested in clean water provides $4-$12 in economic returns.",
    "charity:water has funded over 100,000 water projects around the world."
  ];
  
  return facts[Math.floor(Math.random() * facts.length)];
}

// Reset game
function resetGame() {
  selectedCell = null;

  // Reset grid
  for (let i = 0; i < gridState.length; i++) {
    gridState[i] = null;
  }

  // Reset well and house
  gridState[0] = { type: 'well' };
  gridState[24] = { type: 'house' };

  // Place new boulders (increase by level)
  let placed = 0;
  const bouldersToPlace = 3 + (level - 1); // Increase boulders by level
  while (placed < bouldersToPlace) {
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

  // Update level display
  updateLevelDisplay();
}