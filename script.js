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

  // focus container to capture arrow keys
  const container = document.getElementById("game-container");
  container.setAttribute("tabindex", "0");
  container.focus();
  container.addEventListener("keydown", handleKey);
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
      cell.className = "tile";
      cell.dataset.r = r;
      cell.dataset.c = c;

      const tile = grid[r][c];
      if (tile) {
        if (selected && selected.r === r && selected.c === c) {
          cell.classList.add("selected");
        }
        // draw each side bar
        ["top","right","bottom","left"].forEach((side, idx) => {
          const bar = document.createElement("div");
          bar.className = `corner ${side}`;
          bar.style.background = tile.colors[idx];
          cell.appendChild(bar);
        });
      }

      cell.addEventListener("click", () => {
        if (grid[r][c]) {
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
  const moves = {
    ArrowUp:    { dr:-1, dc: 0 },
    ArrowDown:  { dr: 1, dc: 0 },
    ArrowLeft:  { dr: 0, dc:-1 },
    ArrowRight: { dr: 0, dc: 1 }
  };
  if (moves[e.key] && selected) {
    e.preventDefault();
    const { dr, dc } = moves[e.key];
    slideMove(selected.r, selected.c, dr, dc);
  }
}

function slideMove(r, c, dr, dc) {
  const mover = grid[r][c];
  if (!mover) return;

  let currR = r, currC = c;
  let didMove = false;

  while (true) {
    const nr = currR + dr, nc = currC + dc;
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) break;

    const target = grid[nr][nc];
    if (!target) {
      grid[currR][currC] = null;
      grid[nr][nc]       = mover;
      currR = nr; currC = nc;
      didMove = true;
      continue;
    }

    // if any side color matches any side color on neighbor
    const shared = mover.colors.some(c1 => target.colors.includes(c1));
    if (shared) {
      grid[currR][currC] = null;
      grid[nr][nc]       = null;
      score++;
      updateScore();
      // spawn in place of the mover
      spawnRandomTile();
      renderGrid();
    }
    break;
  }

  if (didMove) {
    spawnRandomTile();
    renderGrid();
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
  if (!empties.length) return;

  const { r, c } = empties[Math.floor(Math.random() * empties.length)];
  const colors   = Array(4).fill().map(
    () => COLORS[Math.floor(Math.random() * COLORS.length)]
  );
  grid[r][c] = { colors, id: Date.now() + Math.random() };
}

function updateScore() {
  document.getElementById("score-value").textContent = score;
}

function isGameOver() {
  // board full?
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) return false;
      // any neighbor share a color?
      const col = grid[r][c].colors;
      for (let [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr>=0&&nr<GRID_SIZE&&nc>=0&&nc<GRID_SIZE) {
          const t2 = grid[nr][nc];
          if (t2 && col.some(c1 => t2.colors.includes(c1))) {
            return false;
          }
        }
      }
    }
  }
  return true;
}
