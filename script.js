const GRID_SIZE  = 5;
const COLORS     = ["red","green","blue","pink"];
const ORB_TARGET = 10;

let grid     = [];
let selected = null;
let orbCount = 0;

document.addEventListener("DOMContentLoaded", () => {
  initGrid();
  renderGrid();

  // start with two random tiles
  spawnRandomTile();
  spawnRandomTile();

  initOrbsBar();

  // listen for arrow-keys
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
  for (let r=0; r<GRID_SIZE; r++) {
    for (let c=0; c<GRID_SIZE; c++) {
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

    // match if any side-color overlaps
    const shared = mover.colors.some(col => target.colors.includes(col));
    if (shared) {
      // 1) animate merge
      animateMerge(currR,currC,nr,nc).then(() => {
        // 2) after animation, spawn flying orb
        spawnOrbToCounter(nr,nc);
        // 3) remove tiles & refill
        grid[currR][currC] = null;
        grid[nr][nc]       = null;
        spawnRandomTile();
        renderGrid();
      });
    }
    break;
  }

  if (didMove) {
    spawnRandomTile();
    renderGrid();
  }
  selected = null;
}

function animateMerge(r1,c1,r2,c2) {
  return new Promise(resolve => {
    const sel1 = `.tile[data-r="${r1}"][data-c="${c1}"]`;
    const sel2 = `.tile[data-r="${r2}"][data-c="${c2}"]`;
    const c1el = document.querySelector(sel1);
    const c2el = document.querySelector(sel2);
    if (!c1el||!c2el) { resolve(); return; }

    // compute centers
    const r1b = c1el.getBoundingClientRect();
    const r2b = c2el.getBoundingClientRect();
    const midX = (r1b.left+r1b.right + r2b.left+r2b.right)/4;
    const midY = (r1b.top+r1b.bottom + r2b.top+r2b.bottom)/4;

    const c1x = r1b.left + r1b.width/2, c1y = r1b.top + r1b.height/2;
    const c2x = r2b.left + r2b.width/2, c2y = r2b.top + r2b.height/2;
    const d1x = midX - c1x, d1y = midY - c1y;
    const d2x = midX - c2x, d2y = midY - c2y;

    // move both to midpoint
    [c1el,c2el].forEach(el => {
      el.style.transition = "transform 0.4s ease";
    });
    c1el.style.transform = `translate(${d1x}px,${d1y}px)`;
    c2el.style.transform = `translate(${d2x}px,${d2y}px)`;

    // after move, shake
    setTimeout(() => {
      c1el.classList.add("shake");
      c2el.classList.add("shake");
      // then blast walls
      setTimeout(() => {
        [c1el,c2el].forEach(el => {
          el.querySelectorAll(".corner").forEach(bar => {
            bar.classList.add("blast");
          });
        });
        // after blast, clear transforms & classes
        setTimeout(() => {
          [c1el,c2el].forEach(el => {
            el.classList.remove("shake");
            el.style.transition = "";
            el.style.transform = "";
            el.querySelectorAll(".corner").forEach(bar => {
              bar.classList.remove("blast");
            });
          });
          resolve();
        }, 400);
      }, 300);
    }, 400);
  });
}

function spawnOrbToCounter(r,c) {
  const cellEl = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
  const slots  = document.querySelectorAll(".orb-slot");
  const slot   = slots[orbCount];
  if (!cellEl||!slot) return;

  const orb = document.createElement("div");
  orb.className = "floating-orb";
  document.body.appendChild(orb);

  const from = cellEl.getBoundingClientRect();
  orb.style.transform = `translate(${from.left + from.width/2 -10}px,${from.top + from.height/2 -10}px)`;

  const to = slot.getBoundingClientRect();
  requestAnimationFrame(() => {
    orb.classList.add("fly");
    orb.style.transform = `translate(${to.left + to.width/2 -10}px,${to.top + to.height/2 -10}px)`;
  });

  orb.addEventListener("transitionend", () => {
    orb.remove();
    // fill orb-slot
    const staticOrb = document.createElement("div");
    staticOrb.className = "orb";
    slot.appendChild(staticOrb);
    orbCount++;
    if (orbCount === ORB_TARGET) {
      document.getElementById("message").textContent = "🎉 You Win! 🎉";
    }
  }, { once: true });
}

function spawnRandomTile() {
  const empties = [];
  for (let r=0;r<GRID_SIZE;r++) {
    for (let c=0;c<GRID_SIZE;c++) {
      if (!grid[r][c]) empties.push({r,c});
    }
  }
  if (!empties.length) return;
  const {r,c} = empties[Math.floor(Math.random()*empties.length)];
  const colors = Array(4).fill().map(
    ()=>COLORS[Math.floor(Math.random()*COLORS.length)]
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
