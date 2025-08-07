// script.js

const SIZE       = 4;
const START_TILES = 2;
const colorMap   = [
  "#cdc1b4", // 0 (empty)
  "#eee4da", // 2
  "#ede0c8", // 4
  "#f2b179", // 8
  "#f59563", // 16
  "#f67c5f", // 32
  "#f65e3b", // 64
  "#edcf72", // 128
  "#edcc61", // 256
  "#edc850", // 512
  "#edc53f", // 1024
  "#edc22e"  // 2048+
];

let grid  = [];
let score = 0;

document.addEventListener("DOMContentLoaded", () => {
  setup();
  document.addEventListener("keydown", handleKey);
  document.getElementById("restart").onclick = setup;
});

function setup() {
  score = 0;
  updateScore();
  document.getElementById("message").textContent = "";
  // init grid
  grid = Array(SIZE).fill().map(() => Array(SIZE).fill(0));
  for (let i = 0; i < START_TILES; i++) addRandom();
  render();
}

function addRandom() {
  const empties = [];
  for (let r=0; r<SIZE; r++){
    for (let c=0; c<SIZE; c++){
      if (grid[r][c] === 0) empties.push({r,c});
    }
  }
  if (!empties.length) return false;
  const {r,c} = empties[Math.floor(Math.random()*empties.length)];
  // 90% get a '2' (index 1), 10% a '4' (index 2)
  grid[r][c] = Math.random() < 0.9 ? 1 : 2;
  return true;
}

function render() {
  const container = document.getElementById("grid-container");
  container.innerHTML = "";
  for (let r=0; r<SIZE; r++){
    for (let c=0; c<SIZE; c++){
      const val = grid[r][c];
      const tile = document.createElement("div");
      tile.className = "tile";
      if (val>0) {
        tile.style.background = colorMap[val];
        tile.textContent = Math.pow(2,val);
        tile.classList.add("new");
        setTimeout(()=>tile.classList.remove("new"),200);
      } else {
        tile.style.background = colorMap[0];
      }
      container.appendChild(tile);
    }
  }
}

function handleKey(e) {
  let moved = false;
  switch(e.key) {
    case "ArrowUp":    moved = move( -1,  0); break;
    case "ArrowDown":  moved = move(  1,  0); break;
    case "ArrowLeft":  moved = move(  0, -1); break;
    case "ArrowRight": moved = move(  0,  1); break;
    default: return;
  }
  if (moved) {
    addRandom();
    render();
    if (checkGameOver()) {
      document.getElementById("message").textContent = "Game Over";
    }
  }
}

function move(dr, dc) {
  let moved = false;
  const merged = Array(SIZE).fill().map(()=>Array(SIZE).fill(false));
  const range = [...Array(SIZE).keys()];
  if (dr>0) range.reverse();
  if (dc>0) range.reverse();

  for (let r of range) {
    for (let c of range) {
      let val = grid[r][c];
      if (!val) continue;
      let nr = r, nc = c;
      while (true) {
        const tr = nr+dr, tc = nc+dc;
        if (tr<0||tr>=SIZE||tc<0||tc>=SIZE) break;
        if (grid[tr][tc]===0) {
          grid[tr][tc] = grid[nr][nc];
          grid[nr][nc] = 0;
          nr = tr; nc = tc;
          moved = true;
        } else if (grid[tr][tc]===val && !merged[tr][tc]) {
          grid[tr][tc]++;
          grid[nr][nc]=0;
          merged[tr][tc]=true;
          score += Math.pow(2,val+1);
          updateScore();
          moved = true;
          break;
        } else break;
      }
    }
  }
  return moved;
}

function updateScore() {
  document.getElementById("score-value").textContent = score;
}

function checkGameOver() {
  // if any empty
  for (let r=0;r<SIZE;r++){
    for (let c=0;c<SIZE;c++){
      if (grid[r][c]===0) return false;
    }
  }
  // if any merge possible
  for (let r=0;r<SIZE;r++){
    for (let c=0;c<SIZE;c++){
      const val = grid[r][c];
      if ((r<SIZE-1 && grid[r+1][c]===val) ||
          (c<SIZE-1 && grid[r][c+1]===val)) {
        return false;
      }
    }
  }
  return true;
}
