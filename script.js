const GRID_SIZE  = 5;
const COLORS     = ["red","green","blue","pink"];
const ORB_TARGET = 10;

let grid     = [];
let selected = null;  // {r,c}
let orbCount = 0;

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
        // draw four side-bars
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
      // just slide
      grid[currR][currC] = null;
      grid[nr][nc]       = mover;
      currR = nr; currC = nc;
      didMove = true;
      continue;
    }

    // match if any side-color overlaps
    const shared = mover.colors.some(col => target.colors.includes(col));
    if (shared) {
      // 1) show explosion on the target cell
      const targetEl = document.querySelector(
        `.tile[data-r="${nr}"][data-c="${nc}"]`
      );
      targetEl.classList.add("explode");

      // 2) spawn a flying orb from that position
      flyOrb(nr, nc);

      // 3) remove both tiles *after* explosion animation
      setTimeout(() => {
        grid[currR][currC] = null;
        grid[nr][nc]       = null;
        spawnRandomTile();
        renderGrid();
      }, 400);
    }
    break;
  }

  if (didMove) {
    spawnRandomTile();
    renderGrid();
  }
  selected = null;
  setTimeout(renderGrid, 0);
}

// create a flying orb from cell (r,c) to the next orb-slot
function flyOrb(r, c) {
  const cellEl = document.querySelector(
    `.tile[data-r="${r}"][data-c="${c}"]`
  );
  const slotEl = document.querySelectorAll(".orb-slot")[orbCount];
  if (!cellEl || !slotEl) return;

  // get centers
  const cellRect = cellEl.getBoundingClientRect();
  const slotRect = slotEl.getBoundingClientRect();
  const orbEl = document.createElement("div");
  orbEl.className = "floating-orb";
  document.body.appendChild(orbEl);

  // place at cell center
  orbEl.style.transform = `translate(${cellRect.left + cellRect.width/2 - 10}px, ${cellRect.top + cellRect.height/2 - 10}px)`;

  // trigger fly to slot
  requestAnimationFrame(() => {
    orbEl.classList.add("fly");
    orbEl.style.transform = `translate(${slotRect.left + slotRect.width/2 - 10}px, ${slotRect.top + slotRect.height/2 - 10}px)`;
  });

  orbEl.addEventListener("transitionend", () => {
    orbEl.remove();
    // finally fill the orb-slot
    const staticOrb = document.createElement("div");
    staticOrb.className = "orb filled";
    slotEl.appendChild(staticOrb);
    orbCount++;
    if (orbCount === ORB_TARGET) {
      document.getElementById("message").textContent = "🎉 You Win! 🎉";
    }
  }, { once: true });
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
  const colors = Array(4).fill().map(
    () => COLORS[Math.floor(Math.random()*COLORS.length)]
  );
  grid[r][c] = { colors };
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
