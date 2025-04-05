const grid = document.getElementById('grid');
const queueList = document.getElementById('queue-list');
const pipeSymbols = {
  straight: ['┃', '━'],
  elbow: ['┏', '┓', '┛', '┗']
};
const MAX_QUEUE_SIZE = 5;

let selectedCell = null;

// Init grid: well = 0, houses = [20, 22, 24]
const gridState = Array.from({ length: 25 }, (_, i) => {
  if (i === 0) return { type: 'well' };
  if ([20, 22, 24].includes(i)) return { type: 'house' };
  return null; // empty cells to place pipes
});

// Create queue with random pieces
let pipeQueue = Array.from({ length: MAX_QUEUE_SIZE }, randomPipe);

function generatePipeQueue(length) {
  const types = ['straight', 'elbow'];
  return Array.from({ length }, () => {
    const type = types[Math.floor(Math.random() * types.length)];
    return { type, rotation: 0 };
  });
}

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

// Place pipe from queue
document.getElementById('place-btn').addEventListener('click', () => {
  if (!selectedCell) return alert("Select a grid cell!");
  const index = selectedCell.dataset.index;
  const cellState = gridState[index];

  if (cellState) return alert("This cell is already occupied!");

  const nextPipe = pipeQueue.shift();
  gridState[index] = { ...nextPipe };

  // Refill queue if needed
  while (pipeQueue.length < MAX_QUEUE_SIZE) {
    pipeQueue.push(randomPipe());
  }

  renderGrid();
  renderQueue();
});

function randomPipe() {
  const types = ['straight', 'elbow'];
  const type = types[Math.floor(Math.random() * types.length)];
  return { type, rotation: 0 };
}

// Flow logic placeholder
document.getElementById('flow-btn').addEventListener('click', () => {
  alert("Water flow coming soon!");
});

// Init everything
renderGrid();
renderQueue();

// Rotate the first piece in the queue
document.getElementById('rotate-queue-btn').addEventListener('click', () => {
  if (pipeQueue.length === 0) return;
  pipeQueue[0].rotation = (pipeQueue[0].rotation + 1) % 4;
  renderQueue();
});
