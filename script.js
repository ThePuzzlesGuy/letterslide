const GRID_SIZE = 10;
const COLORS = ["red", "green", "blue", "pink"];
let dictionary = new Set();
let mergeMap = {};
let grid = [];
let selected = null;
let score = 0;
let movesCount = 0;
const PREMERGED_WORDS = ["ing","an","the","er","ed"];
const VOWELS = ["A","E","I","O","U"];

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
cell.addEventListener("click", () => {
  const tile = grid[r][c];
  // if it’s an un-assigned wildcard, let the player pick its letter
  if (tile?.type === "wildcard" && !tile.assigned) {
    const letter = prompt("Pick a letter for this wildcard:")
                     ?.trim().toUpperCase();
    if (/^[A-Z]$/.test(letter)) {
      tile.letters = [letter];
      tile.assigned = true;
      renderGrid();
    }
  } else {
    selectTile(r, c);
  }
});

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

function mergeTiles(a, b, r, c, nr, nc) {
  const order = (a.id === selected) ? [a,b] : [b,a];
  const letters = order[0].letters.concat(order[1].letters);
  const matchedColor = a.colors[ getMatchedSideIndex(r,c,nr,nc,a) ];
  const colors = COLORS.slice().sort(() => 0.5 - Math.random());
  const type = a.type==="bomb" || b.type==="bomb" ? "bomb"
             : a.type==="clearRow" || b.type==="clearRow" ? "clearRow"
             : undefined;
  return { letters, colors, type, id: Date.now()+Math.random() };
}

function getMatchedSideIndex(r,c,nr,nc,tile){
  if (nr===r && nc===c+1) return 1;
  if (nr===r && nc===c-1) return 3;
  if (nr===r-1 && nc===c) return 0;
  return 2;
}

function checkWord(tile, r, c) {
  const w = tile.letters.join("").toLowerCase();
  if (!dictionary.has(w) || tile.letters.length < 4) return;

  score += tile.letters.length;
  document.getElementById("message").textContent = `"${w}"! +${tile.letters.length}`;

  // if bomb, explode; if clearRow, clear lines; otherwise delete that tile
  if (tile.type === "bomb") {
    explode3x3(r,c);
  } else if (tile.type === "clearRow") {
    clearRowAndCol(r,c);
  }

  grid[r][c] = null;
  updateScore();
  renderGrid();

  // spawn wildcard every time a word is made
  spawnWildcardTile();

  // remove message after a short delay
  setTimeout(() => document.getElementById("message").textContent = "", 800);
}


function postMove() {
  selected = null;
  movesCount++;

  // every 10 moves, spawn a PRE-MERGED tile
  if (movesCount % 10 === 0) {
    spawnPremergedTile();
  } else {
    spawnRandomTile();
  }

  updateScore();
  renderGrid();

  if (isGameOver()) {
    document.getElementById("message").textContent = "Game Over!";
    document.removeEventListener("keydown", handleKey);
  }
}

function spawnRandomTile() {
  const empties = getEmptyCells();
  if (empties.length === 0) return;
  const {r,c} = empties[Math.floor(Math.random() * empties.length)];

  // decide special tile first
  const roll = Math.random();
  if (roll < 0.05) {
    // 5% chance: BOMB
    grid[r][c] = makeBombTile();
    return;
  } else if (roll < 0.08) {
    // next 3%: CLEAR-ROW
    grid[r][c] = makeClearRowTile();
    return;
  }

  // otherwise a normal single‐letter, biasing vowels to 40%
  let letter;
  if (Math.random() < 0.4) {
    letter = VOWELS[Math.floor(Math.random()*VOWELS.length)];
  } else {
    // pick random consonant
    const consonants = "BCDFGHJKLMNPQRSTVWXYZ".split("");
    letter = consonants[Math.floor(Math.random()*consonants.length)];
  }

  const colors = Array(4).fill().map(() => COLORS[Math.floor(Math.random()*COLORS.length)]);
  grid[r][c] = { letters: [letter], colors, id: Date.now()+Math.random() };
}

function getEmptyCells() {
  const empties = [];
  for (let r=0; r<GRID_SIZE; r++)
    for (let c=0; c<GRID_SIZE; c++)
      if (!grid[r][c]) empties.push({r,c});
  return empties;
}

function spawnPremergedTile() {
  const empties = getEmptyCells();
  if (empties.length === 0) return;
  const {r,c} = empties[Math.floor(Math.random() * empties.length)];
  const w = PREMERGED_WORDS[Math.floor(Math.random() * PREMERGED_WORDS.length)].toUpperCase();
  const colors = Array(4).fill().map(() => COLORS[Math.floor(Math.random()*COLORS.length)]);
  grid[r][c] = { letters: w.split(""), colors, id: Date.now()+Math.random() };
}

function makeBombTile(){
  return {
    type: "bomb",
    letters: ["💣"],    // an icon for clarity
    colors: ["rainbow","rainbow","rainbow","rainbow"],
    id: Date.now()+Math.random()
  };
}

function explode3x3(r,c) {
  for (let dr=-1; dr<=1; dr++) {
    for (let dc=-1; dc<=1; dc++) {
      const nr=r+dr, nc=c+dc;
      if (nr>=0&&nr<GRID_SIZE&&nc>=0&&nc<GRID_SIZE) {
        grid[nr][nc] = null;
      }
    }
  }
}

function clearRowAndCol(r,c) {
  for (let i=0; i<GRID_SIZE; i++) {
    grid[r][i] = null; // clear row
    grid[i][c] = null; // clear column
  }
}

function makeClearRowTile(){
  return {
    type: "clearRow",
    letters: ["—"],    // just a dash
    colors: ["gray","gray","gray","gray"],
    id: Date.now()+Math.random()
  };
}

function canMerge(a, b, r, c, nr, nc) {
  let sideA, sideB;
  if (nr===r && nc===c+1)      { sideA=1; sideB=3; }
  else if (nr===r && nc===c-1) { sideA=3; sideB=1; }
  else if (nr===r-1 && nc===c) { sideA=0; sideB=2; }
  else if (nr===r+1 && nc===c) { sideA=2; sideB=0; }
  else return false;

  const colA = a.colors[sideA], colB = b.colors[sideB];
  return colA === colB || colA === "rainbow" || colB === "rainbow";
}

function spawnWildcardTile() {
  const empties = getEmptyCells();
  if (empties.length === 0) return;
  const {r,c} = empties[Math.floor(Math.random() * empties.length)];
  grid[r][c] = {
    type: "wildcard",
    letters: ["?"],
    colors: ["rainbow","rainbow","rainbow","rainbow"],
    id: Date.now()+Math.random(),
    assigned: false
  };
}

// in renderGrid(), you already attach a click handler per cell.
// Augment it to handle wildcard assignments:
cell.addEventListener("click", () => {
  const tile = grid[r][c];
  if (tile?.type === "wildcard" && !tile.assigned) {
    const letter = prompt("Enter the letter for this wildcard:")?.trim().toUpperCase();
    if (letter && /^[A-Z]$/.test(letter)) {
      tile.letters = [letter];
      tile.assigned = true;
      renderGrid();
    }
  } else {
    selectTile(r, c);
  }
});

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
