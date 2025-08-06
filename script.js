const GRID_SIZE = 10;
const COLORS = ["red", "green", "blue", "pink"];
let dictionary = new Set();
let mergeMap = {};
let grid = [];
let selected = null;
let score = 0;

document.addEventListener("DOMContentLoaded", () => {
  Promise.all([
    fetch("/data/dictionary.txt")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      }),
    fetch("/data/merge-map.json")
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
  ])
  .then(([dictText, mMap]) => {
    // build a Set of lowercase words, trimming blank lines
    dictionary = new Set(
      dictText
        .split(/\r?\n/)
        .map(w => w.trim().toLowerCase())
        .filter(w => w.length >= 4)
    );
    mergeMap = mMap;

    initGrid();
    renderGrid();
    spawnRandomTile();
    spawnRandomTile();
    updateScore();

    // now that grid is live, listen for key presses
    document.addEventListener("keydown", handleKey);
  })
  .catch(err => {
    console.error(err);
    document.getElementById("message").textContent =
      "Error loading data: " + err.message;
  });
});

function initGrid() {
  grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

function renderGrid() {
  const gridEl = document.getElementById("grid");
  gridEl.innerHTML = "";
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      const cell = document.createElement("div");
      cell.classList.add("tile");
      cell.dataset.r = r;
      cell.dataset.c = c;
      if (tile) {
        cell.textContent = tile.letters.join("");
        if (tile.id === selected) cell.classList.add("selected");
        ["top","right","bottom","left"].forEach((side, idx) => {
          const corner = document.createElement("div");
          corner.classList.add("corner", side);
          corner.style.background = tile.colors[idx];
          cell.appendChild(corner);
        });
      }
      cell.addEventListener("click", () => selectTile(r, c));
      gridEl.appendChild(cell);
    }
  }
}

function selectTile(r, c) {
  const tile = grid[r][c];
  selected = tile ? tile.id : null;
  renderGrid();
}

function handleKey(e) {
  if (!selected) return;
  const moves = {
    ArrowUp:    { dr:-1, dc:0 },
    ArrowDown:  { dr: 1, dc:0 },
    ArrowLeft:  { dr: 0, dc:-1 },
    ArrowRight: { dr: 0, dc: 1 }
  };
  if (moves[e.key]) {
    e.preventDefault();
    const {dr, dc} = moves[e.key];
    const {r, c} = findTile(selected);
    slideMove(r, c, dr, dc);
  }
}

function slideMove(r, c, dr, dc) {
  const mover = grid[r][c];
  if (!mover) return;

  // Track the mover’s current position as it slides
  let currR = r, currC = c;

  while (true) {
    const nr = currR + dr, nc = currC + dc;
    // 1) Stop if off-board
    if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) break;

    const target = grid[nr][nc];
    if (!target) {
      // 2) Empty: slide into it and continue
      grid[currR][currC] = null;
      grid[nr][nc] = mover;
      currR = nr;
      currC = nc;
      continue;
    }

    // 3) Occupied: if mergeable, merge right here and end turn
    if (canMerge(mover, target, currR, currC, nr, nc)) {
      const merged = mergeTiles(mover, target, currR, currC, nr, nc);
      grid[nr][nc] = merged;
      grid[currR][currC] = null;
      checkWord(merged, nr, nc);
      postMove();
      return;
    }

    // 4) Occupied but NOT mergeable: stop sliding
    break;
  }

  // 5) If we slid at least one cell (currR/currC moved), end turn
  if (currR !== r || currC !== c) {
    postMove();
  }
}

function findTile(id) {
  for (let r=0; r<GRID_SIZE; r++) {
    for (let c=0; c<GRID_SIZE; c++) {
      if (grid[r][c]?.id === id) return {r,c};
    }
  }
  return {};
}

function attemptMove(r, c, nr, nc) {
  const mover = grid[r][c];
  const target = grid[nr][nc];
  if (!mover) return;
  if (!target) {
    grid[nr][nc] = mover;
    grid[r][c] = null;
    postMove();
  } else if (canMerge(mover, target, r, c, nr, nc)) {
    const merged = mergeTiles(mover, target, r, c, nr, nc);
    grid[nr][nc] = merged;
    grid[r][c] = null;
    checkWord(merged, nr, nc);
    postMove();
  }
}

function canMerge(a, b, r, c, nr, nc) {
  let sideA, sideB;
  if (nr===r && nc===c+1)      { sideA=1; sideB=3; }
  else if (nr===r && nc===c-1) { sideA=3; sideB=1; }
  else if (nr===r-1 && nc===c) { sideA=0; sideB=2; }
  else if (nr===r+1 && nc===c) { sideA=2; sideB=0; }
  else return false;
  return a.colors[sideA] === b.colors[sideB];
}

function mergeTiles(a, b, r, c, nr, nc) {
  const order = (a.id === selected) ? [a,b] : [b,a];
  const letters = order[0].letters.concat(order[1].letters);
  // figure matched color
  let matchedColor;
  if (nr===r && nc===c+1)      matchedColor = a.colors[1];
  else if (nr===r && nc===c-1) matchedColor = a.colors[3];
  else if (nr===r-1 && nc===c) matchedColor = a.colors[0];
  else                          matchedColor = a.colors[2];
  const colors = mergeMap[matchedColor] 
    || COLORS.slice().sort(() => 0.5 - Math.random());
  return { letters, colors, id: Date.now() + Math.random() };
}

function checkWord(tile, r, c) {
  const w = tile.letters.join("").toLowerCase();
  if (tile.letters.length >= 4 && dictionary.has(w)) {
    score += tile.letters.length;
    document.getElementById("message").textContent = `"${w}"! +${tile.letters.length}`;
    grid[r][c] = null;
    setTimeout(()=>{
      document.getElementById("message").textContent = "";
      renderGrid();
    }, 800);
    updateScore();
  }
}

function postMove() {
  selected = null;

  // 1) spawn the new tile into the grid data...
  spawnRandomTile();
  updateScore();

  // 2) then redraw the board so it appears immediately
  renderGrid();

  // 3) finally check for game-over
  if (isGameOver()) {
    document.getElementById("message").textContent = "Game Over!";
    document.removeEventListener("keydown", handleKey);
  }
}

function spawnRandomTile() {
  const empties = [];
  for (let r=0; r<GRID_SIZE; r++)
    for (let c=0; c<GRID_SIZE; c++)
      if (!grid[r][c]) empties.push({r,c});
  if (!empties.length) return;
  const {r,c} = empties[Math.floor(Math.random()*empties.length)];
  const letter = String.fromCharCode(65 + Math.floor(Math.random()*26));
  const colors = Array(4).fill().map(() => COLORS[Math.floor(Math.random()*COLORS.length)]);
  grid[r][c] = { letters: [letter], colors, id: Date.now()+Math.random() };
}

function updateScore() {
  document.getElementById("score-value").textContent = score;
}

function isGameOver() {
  // 1) If there’s any empty cell, we’re definitely not done
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!grid[r][c]) {
        return false;
      }
    }
  }

  // 2) Now the grid is full—check for any possible adjacent merge
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const tile = grid[r][c];
      // try each of the four directions
      for (let [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
          if (canMerge(tile, grid[nr][nc], r, c, nr, nc)) {
            return false;
          }
        }
      }
    }
  }

  // no empties and no merges → truly game over
  return true;
}
