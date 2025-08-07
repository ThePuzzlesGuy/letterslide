const GRID_SIZE  = 5;
const COLORS     = ["red","green","blue","pink"];
const ORB_TARGET = 10;

let grid      = [];
let selected  = null;
let orbCount  = 0;
let orbSlots  = [];      // will hold DOMRect centers of each orb-slot

document.addEventListener("DOMContentLoaded", () => {
  initGrid();
  renderGrid();
  spawnRandomTile();
  spawnRandomTile();
  initOrbsBar();
  document.addEventListener("keydown", handleKey);
});

function initGrid() {
  grid = Array.from({length:GRID_SIZE}, ()=>Array(GRID_SIZE).fill(null));
}

function renderGrid() {
  const g = document.getElementById("grid");
  g.innerHTML = "";
  for (let r=0; r<GRID_SIZE; r++) {
    for (let c=0; c<GRID_SIZE; c++) {
      const cell = document.createElement("div");
      cell.className = "tile";
      cell.dataset.r = r; cell.dataset.c = c;
      const tile = grid[r][c];
      if (tile) {
        if (selected && selected.r===r && selected.c===c) {
          cell.classList.add("selected");
        }
        ["top","right","bottom","left"].forEach((side,i)=>{
          const bar = document.createElement("div");
          bar.className = `corner ${side}`;
          bar.style.background = tile.colors[i];
          cell.appendChild(bar);
        });
      }
      cell.addEventListener("click", ()=>{
        selected = tile ? {r,c} : null;
        renderGrid();
      });
      g.appendChild(cell);
    }
  }
}

function handleKey(e) {
  const moves = {
    ArrowUp:    {dr:-1, dc:0},
    ArrowDown:  {dr:1,  dc:0},
    ArrowLeft:  {dr:0,  dc:-1},
    ArrowRight: {dr:0,  dc:1}
  };
  if (!selected || !moves[e.key]) return;
  e.preventDefault();
  slideMove(selected.r, selected.c, moves[e.key].dr, moves[e.key].dc);
}

async function slideMove(r, c, dr, dc) {
  const mover = grid[r][c];
  if (!mover) return;
  let currR=r, currC=c, moved=false;

  while (true) {
    const nr=currR+dr, nc=currC+dc;
    if (nr<0||nr>=GRID_SIZE||nc<0||nc>=GRID_SIZE) break;
    const target = grid[nr][nc];
    if (!target) {
      grid[currR][currC]=null;
      grid[nr][nc]=mover;
      currR=nr; currC=nc;
      moved=true;
      continue;
    }
    // check side-color overlap
    if (mover.colors.some(col=>target.colors.includes(col))) {
      // animate merge
      await animateMerge(currR,currC,nr,nc);
      // fly orb
      await flyOrb(nr,nc);
      // remove tiles, spawn new
      grid[currR][currC]=null;
      grid[nr][nc]=null;
      spawnRandomTile();
      break;
    }
    break;
  }

  if (moved) spawnRandomTile();
  selected = null;
  renderGrid();
}

function animateMerge(r1,c1,r2,c2) {
  return new Promise(res=>{
    const sel1 = `.tile[data-r="${r1}"][data-c="${c1}"]`;
    const sel2 = `.tile[data-r="${r2}"][data-c="${c2}"]`;
    const e1 = document.querySelector(sel1);
    const e2 = document.querySelector(sel2);
    if (!e1||!e2) return res();

    // compute midpoint translation
    const b1=e1.getBoundingClientRect(), b2=e2.getBoundingClientRect();
    const midX=(b1.left+b1.right + b2.left+b2.right)/4;
    const midY=(b1.top+b1.bottom + b2.top+b2.bottom)/4;
    const dx1=midX-(b1.left+b1.width/2), dy1=midY-(b1.top+b1.height/2);
    const dx2=midX-(b2.left+b2.width/2), dy2=midY-(b2.top+b2.height/2);

    // move both
    [e1,e2].forEach(el=>{
      el.style.transition="transform 0.4s ease";
    });
    e1.style.transform = `translate(${dx1}px,${dy1}px)`;
    e2.style.transform = `translate(${dx2}px,${dy2}px)`;

    setTimeout(()=>{
      // shake
      e1.classList.add("shake");
      e2.classList.add("shake");
      setTimeout(()=>{
        // blast walls
        [e1,e2].forEach(el=>{
          el.querySelectorAll(".corner").forEach(bar=>bar.classList.add("blast"));
        });
        setTimeout(()=>{
          // cleanup transforms & classes
          [e1,e2].forEach(el=>{
            el.style.transition="";
            el.style.transform="";
            el.classList.remove("shake");
            el.querySelectorAll(".corner").forEach(bar=>bar.classList.remove("blast"));
          });
          res();
        },400);
      },300);
    },400);
  });
}

function initOrbsBar() {
  orbCount = 0;
  const bar = document.getElementById("orbs-bar");
  bar.innerHTML="";
  for (let i=0;i<ORB_TARGET;i++){
    const slot=document.createElement("div");
    slot.className="orb-slot";
    bar.appendChild(slot);
  }
  // record slot centers
  orbSlots = Array.from(document.querySelectorAll(".orb-slot"))
    .map(el=>{
      const r=el.getBoundingClientRect();
      return { x:r.left+r.width/2-10, y:r.top+r.height/2-10 };
    });
}

function flyOrb(r,c) {
  return new Promise(res=>{
    if (orbCount>=ORB_TARGET) return res();
    const cellEl = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
    const pos = orbSlots[orbCount];
    if (!cellEl||!pos) return res();

    const orb = document.createElement("div");
    orb.className="floating-orb";
    document.body.appendChild(orb);

    const cb=cellEl.getBoundingClientRect();
    orb.style.transform=`translate(${cb.left+cb.width/2-10}px,${cb.top+cb.height/2-10}px)`;

    requestAnimationFrame(()=>{
      orb.classList.add("fly");
      orb.style.transform=`translate(${pos.x}px,${pos.y}px)`;
    });

    orb.addEventListener("transitionend", ()=>{
      orb.remove();
      const slotEl = document.querySelectorAll(".orb-slot")[orbCount];
      const staticOrb=document.createElement("div");
      staticOrb.className="orb";
      slotEl.appendChild(staticOrb);
      orbCount++;
      if (orbCount===ORB_TARGET) {
        document.getElementById("message").textContent="🎉 You Win! 🎉";
      }
      res();
    },{once:true});
  });
}

function spawnRandomTile() {
  const empties=[];
  for (let r=0;r<GRID_SIZE;r++){
    for (let c=0;c<GRID_SIZE;c++){
      if (!grid[r][c]) empties.push({r,c});
    }
  }
  if (!empties.length) return;
  const {r,c}=empties[Math.floor(Math.random()*empties.length)];
  const colors=Array(4).fill().map(_=>COLORS[Math.floor(Math.random()*COLORS.length)]);
  grid[r][c]={colors};
  renderGrid();
}
