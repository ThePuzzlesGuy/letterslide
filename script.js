// script.js

const SIZE        = 4;
const TILE_SIZE   = 80;
const GAP         = 10;
const START_TILES = 2;

// define colors for each exponent-level (0=empty)
const COLORS = [
  "#cdc1b4",
  "#eee4da",
  "#ede0c8",
  "#f2b179",
  "#f59563",
  "#f67c5f",
  "#f65e3b",
  "#edcf72",
  "#edcc61",
  "#edc850",
  "#edc53f",
  "#edc22e"
];

let grid  = [];
let score = 0;

// each cell holds {v: exponent, id: unique}
document.addEventListener("DOMContentLoaded", () => {
  setup();
  document.addEventListener("keydown", handleKey);
  document.getElementById("restart").onclick = setup;
});

function setup() {
  score = 0;
  updateScore();
  grid = Array(SIZE).fill().map(()=>Array(SIZE).fill({v:0,id:null}));
  // spawn initial tiles
  for (let i=0;i<START_TILES;i++) addRandom();
  render(true);
  document.getElementById("message").textContent = "";
}

function addRandom() {
  const empties = [];
  for (let r=0;r<SIZE;r++){
    for (let c=0;c<SIZE;c++){
      if (grid[r][c].v===0) empties.push({r,c});
    }
  }
  if (!empties.length) return false;
  const {r,c} = empties[Math.floor(Math.random()*empties.length)];
  grid[r][c] = {v: Math.random()<0.9?1:2, id:crypto.randomUUID()};
  return true;
}

function render(isNew=false, moves=[]) {
  const container = document.getElementById("grid-container");
  // on initial or after move: remove all and recreate
  if (isNew) {
    container.innerHTML = "";
    for (let r=0;r<SIZE;r++){
      for (let c=0;c<SIZE;c++){
        const tile = document.createElement("div");
        tile.className="tile";
        container.appendChild(tile);
      }
    }
  }
  const tiles = container.querySelectorAll(".tile");
  // layout and data-index mapping: row-major
  let idx=0;
  const positions = [];
  for (let r=0;r<SIZE;r++){
    for (let c=0;c<SIZE;c++){
      const x = c*(TILE_SIZE+GAP);
      const y = r*(TILE_SIZE+GAP);
      positions.push({x,y});
    }
  }
  // if moves provided, animate them
  if (moves.length) {
    // for each move: {id, from, to, merged}
    moves.forEach(m=>{
      const el = Array.from(tiles).find(t=>t.dataset.id===m.id);
      if (!el) return;
      el.style.transition = "transform 0.2s ease";
      el.style.transform = `translate(${m.to.c*(TILE_SIZE+GAP)}px,${m.to.r*(TILE_SIZE+GAP)}px)`;
      if (m.merged) {
        el.addEventListener("transitionend", ()=>{
          el.classList.add("scale");
          setTimeout(()=>el.classList.remove("scale"),200);
        },{once:true});
      }
    });
    // after animation, actually re-render final state
    setTimeout(()=>render(true), 200);
    return;
  }
  // normal render: position all tiles by grid data
  tiles.forEach((el,i)=>{
    const {x,y} = positions[i];
    el.style.transition = "";
    el.style.transform = `translate(${x}px,${y}px)`;
  });
  idx=0;
  for (let r=0;r<SIZE;r++){
    for (let c=0;c<SIZE;c++){
      const tdata = grid[r][c];
      const el = tiles[idx++];
      el.dataset.id = tdata.id || "";
      el.style.background = COLORS[tdata.v];
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
  if (!moves[e.key]) return;
  e.preventDefault();
  const result = slide(moves[e.key].dr, moves[e.key].dc);
  if (result.moved) {
    render(false, result.moves);
    addRandom();
    render(true);
    updateScore();
    if (checkGameOver()) {
      document.getElementById("message").textContent = "Game Over";
    }
  }
}

function slide(dr,dc) {
  let moved=false;
  let moveRecords = [];
  const merged = Array(SIZE).fill().map(()=>Array(SIZE).fill(false));
  const range = [...Array(SIZE).keys()];
  if (dr>0) range.reverse();
  if (dc>0) range.reverse();

  range.forEach(r=>{
    range.forEach(c=>{
      const tile = grid[r][c];
      if (tile.v===0) return;
      let nr=r,nc=c;
      while(true){
        const tr=nr+dr, tc=nc+dc;
        if (tr<0||tr>=SIZE||tc<0||tc>=SIZE) break;
        const target=grid[tr][tc];
        if (target.v===0) {
          grid[tr][tc]=tile;
          grid[nr][nc]={v:0,id:null};
          moveRecords.push({id:tile.id,from:{r,nc:c},to:{r:tr,c:tc},merged:false});
          nr=tr; nc=tc;
          moved=true;
        } else if (target.v===tile.v && !merged[tr][tc]) {
          grid[tr][tc].v++;
          grid[tr][tc].id = tile.id; // keep id for animation
          merged[tr][tc]=true;
          grid[nr][nc]={v:0,id:null};
          moveRecords.push({id:tile.id,from:{r,c},to:{r:tr,c:tc},merged:true});
          score += 2**grid[tr][tc].v;
          moved=true;
          break;
        } else break;
      }
    });
  });
  return { moved, moves: moveRecords };
}

function updateScore() {
  document.getElementById("score-value").textContent = score;
}

function checkGameOver() {
  for (let r=0;r<SIZE;r++){
    for (let c=0;c<SIZE;c++){
      if (grid[r][c].v===0) return false;
      if (r<SIZE-1 && grid[r+1][c].v===grid[r][c].v) return false;
      if (c<SIZE-1 && grid[r][c+1].v===grid[r][c].v) return false;
    }
  }
  return true;
}
