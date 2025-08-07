const GRID_SIZE = 5;
const COLORS    = ["red","green","blue","pink"];
const ORB_TARGET = 10;

let grid      = [];
let selected  = null;  // {r,c}
let orbCount  = 0;

document.addEventListener("DOMContentLoaded", () => {
  initGrid();
  renderGrid();

  // start with two random tiles
  spawnRandomTile();
  spawnRandomTile();

  initOrbsBar();

  // listen globally for arrow-keys
  document.addEventListener("keydown", handleKey);
});

function initGrid() {
  grid = Array.from({length: GRID_SIZE},
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
        if (selected && selected.r===r && selected.c===c) {
          cell.classList.add("selected");
        }
        ["top","right","bottom","left"].forEach((side, idx) => {
          const bar = document.createElement("div");
          bar.className = `corner ${side}`;
          bar.style.background = tile.colors[idx];
          cell.appendChild(bar);
        });
      }

      cell.addEventListener("click", () => {
        selected = tile ? {r,c} : null;
        renderGrid();
      });

      gridEl.appendChild(cell);
    }
  }
}

function handleKey(e) {
  const moves = {
    ArrowUp:    {dr:-1, dc:0},
    ArrowDown:  {dr: 1, dc:0},
    ArrowLeft:  {dr: 0, dc:-1},
    ArrowRight: {dr: 0, dc: 1}
  };
  if (!selected || !moves[e.key]) return;
  e.preventDefault();
  const {dr, dc} = moves[e.key];
  slideMove(selected.r, selected.c, dr, dc);
}

function slideMove(r, c, dr, dc) {
  const mover = grid[r][c];
  if (!mover) return;
  let currR=r, currC=c, didMove=false;

  while (true) {
    const nr = currR+dr, nc = currC+dc;
    if (nr<0||nr>=GRID_SIZE||nc<0||nc>=GRID_SIZE) break;

    const target = grid[nr][nc];
    if (!target) {
      grid[currR][currC] = null;
      grid[nr][nc]       = mover;
      currR = nr; currC = nc;
      didMove = true;
      continue;
    }

    const shared = mover.colors.some(col => target.colors.includes(col));
    if (shared) {
      popTile(nr,nc);
      grid[currR][currC] = null;
      grid[nr][nc]       = null;
      addOrb();
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
  for (let r=0;r<GRID_SIZE;r++){
    for (let c=0;c<GRID_SIZE;c++){
      if (!grid[r][c]) empties.push({r,c});
    }
  }
  if (!empties.length) return;
  const {r,c} = empties[Math.floor(Math.random()*empties.length)];
  const colors = Array(4).fill().map(_=>COLORS[Math.floor(Math.random()*COLORS.length)]);
  grid[r][c] = {colors};
}

function popTile(r,c) {
  const cell = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
  if (!cell) return;
  cell.classList.add("pop");
  setTimeout(()=>cell.classList.remove("pop"), 300);
}

function initOrbsBar() {
  orbCount = 0;
  const bar = document.getElementById("orbs-bar");
  bar.innerHTML = "";
  for (let i=0; i<ORB_TARGET; i++){
    const slot = document.createElement("div");
    slot.className = "orb-slot";
    bar.appendChild(slot);
  }
}

function addOrb() {
  if (orbCount >= ORB_TARGET) return;
  const slots = document.querySelectorAll(".orb-slot");
  const slot  = slots[orbCount];
  const orb   = document.createElement("div");
  orb.className = "orb";
  slot.appendChild(orb);
  requestAnimationFrame(()=>orb.classList.add("filled"));
  orbCount++;
  if (orbCount === ORB_TARGET) {
    document.getElementById("message").textContent = "🎉 You Win! 🎉";
  }
}
