// script.js

const GRID_SIZE = 8;
const COLORS    = ["red", "green", "blue", "pink"];

let grid     = [];
let selected = null;  // {r,c} of the clicked tile
let score    = 0;

document.addEventListener("DOMContentLoaded", () => {
  initGrid();
  renderGrid();
  // start with two random tiles
  spawnRandomTile();
  spawnRandomTile();
  updateScore();
  document.addEventListener("keydown", handleKey);
});

function initGrid() {
  grid = Array.from({ length: GRID_SIZE },
    () => Array(GRID_SIZE).fill(null)
  );
}

function renderGrid() {
  const gridEl = document.getElementById("grid");
  gridEl.innerHTML = "";

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const cell = document.createElement("div");
      cell.classList.add("tile");
      cell.dataset.r = r;
      cell.dataset.c = c;

      const tile = grid[r][c];
      if (tile) {
        cell.style.backgroundColor = tile.color;
        if (selected && selected.r === r && selected.c === c) {
          cell.classList.add("selected");
        }
      }

      cell.addEventListener("click", () => {
        if (tile) {
          selected = { r, c };
        } else {
          selected = null;
        }
        renderGrid();
      });

      gridEl.appendChild(cell);
    }
  }
}

function handleKey(e) {
  if (!selected) return;
  const moves = {
    ArrowUp:    { dr: -1, dc:  0 },
    ArrowDown:  { dr:  1, dc:  0 },
    ArrowLeft:  { dr:  0, dc: -1 },
    ArrowRight: { dr:  0, dc:  1 }
  };
  if (moves[e.key]) {
    e.preventDefault();
    const { dr, dc } = moves[e.key];
    slideMove(selected.r, selected.c, dr, dc);
  }
}

function slideMove(r, c, dr, dc) {
  const mover = grid[r][c];
  if (!mover) return;

  let currR = r, currC = c;
  while (true) {
    const nr = currR + dr, nc = currC + dc;
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) break;

    const target = grid[nr][nc];
    if (!target) {
      // slide into empty
      grid[currR][currC] = null;
      grid[nr][nc]       = mover;
      currR = nr; currC = nc;
      continue;
    }

    // collision: if same color, both disappear
    if (target.color === mover.color) {
      grid[currR][currC] = null;
      grid[nr][nc]       = null;
      score++;
      updateScore();
      spawnRandomTile();
      renderGrid();
    }
    break;
  }

  selected = null;
  renderGrid();
}

function spawnRandomTile() {
  const empties = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) empties.push({ r, c });
    }
  }
  if (empties.length === 0) return;

  const { r, c } = empties[Math.floor(Math.random() * empties.length)];
  const color    = COLORS[Math.floor(Math.random() * COLORS.length)];
  grid[r][c]     = { color, id: Date.now() + Math.random() };
}

function updateScore() {
  document.getElementById("score-value").textContent = score;
}

function isGameOver() {
  // game over when no empty cells AND no adjacent same-color matches
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) return false;
      const col = grid[r][c].color;
      for (let [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          if (grid[nr][nc] && grid[nr][nc].color === col) {
            return false;
          }
        }
      }
    }
  }
  return true;
}
