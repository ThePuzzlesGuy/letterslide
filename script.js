// script.js

const GRID_SIZE  = 5;
const COLORS     = ["red","green","blue","pink"];
const ORB_TARGET = 10;

let grid     = [];
let selected = null;
let orbCount = 0;
let orbSlots = [];  // screen positions of orb-slots

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
      cell.dataset.r = r;
      cell.dataset.c = c;
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
  let cr=r, cc=c, moved=false;
  while (true) {
    const nr=cr+dr, nc=cc+dc;
    if (nr<0||nr>=GRID_SIZE||nc<0||nc>=GRID_SIZE) break;
    const target = grid[nr][nc];
    if (!target) {
      grid[cr][cc] = null;
      grid[nr][nc] = mover;
      cr=nr; cc=nc;
      moved=true;
      continue;
    }
    // check shared side-color
    if (mover.colors.some(col=>target.colors.includes(col))) {
      // 1) overlap & shake
      await animateOverlapShake(cr,cc,nr,nc);
      // 2) burst fragments
      burstAt(nr,nc);
      // 3) fly orb
      await flyOrb(nr,nc);
      // 4) remove & refill
      grid[cr][cc] = null;
      grid[nr][nc] = null;
      spawnRandomTile();
      break;
    }
    break;
  }
  if (moved) { spawnRandomTile(); }
  selected = null;
  renderGrid();
}

function animateOverlapShake(r1,c1,r2,c2){
  return new Promise(res=>{
    const sel1 = `.tile[data-r="${r1}"][data-c="${c1}"]`;
    const sel2 = `.tile[data-r="${r2}"][data-c="${c2}"]`;
    const e1 = document.querySelector(sel1);
    const e2 = document.querySelector(sel2);
    if (!e1||!e2) return res();
    // overlay at midpoint
    const b1=e1.getBoundingClientRect(), b2=e2.getBoundingClientRect();
    const dx1=(b2.left - b1.left)/2, dy1=(b2.top - b1.top)/2;
    const dx2=(b1.left - b2.left)/2, dy2=(b1.top - b2.top)/2;
    [e1,e2].forEach(el=>{
      el.style.transition="transform 0.3s ease";
    });
    e1.style.transform = `translate(${dx1}px,${dy1}px)`;
    e2.style.transform = `translate(${dx2}px,${dy2}px)`;
    setTimeout(()=>{
      [e1,e2].forEach(el=>{
        el.classList.add("shake");
      });
      setTimeout(()=>{
        [e1,e2].forEach(el=>{
          el.style.transition="";
          el.style.transform="";
          el.classList.remove("shake");
        });
        res();
      },300);
    },300);
  });
}

function burstAt(r,c) {
  const cell = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
  if (!cell) return;
  const rect = cell.getBoundingClientRect();
  for (let i=0;i<12;i++){
    const frag = document.createElement("div");
    frag.className="fragment";
    const angle = Math.random()*2*Math.PI;
    const dist = 40 + Math.random()*20;
    frag.style.setProperty("--dx", `${Math.cos(angle)*dist}px`);
    frag.style.setProperty("--dy", `${Math.sin(angle)*dist}px`);
    frag.style.left = `${rect.left + rect.width/2 -4}px`;
    frag.style.top  = `${rect.top  + rect.height/2 -4}px`;
    document.body.appendChild(frag);
    frag.addEventListener("animationend", ()=>frag.remove(), {once:true});
  }
}

function initOrbsBar() {
  orbCount=0;
  const bar=document.getElementById("orbs-bar");
  bar.innerHTML="";
  for (let i=0;i<ORB_TARGET;i++){
    const s=document.createElement("div");
    s.className="orb-slot";
    bar.appendChild(s);
  }
  orbSlots = Array.from(bar.children).map(el=>{
    const r=el.getBoundingClientRect();
    return {x:r.left+r.width/2-10, y:r.top+r.height/2-10};
  });
}

function flyOrb(r,c){
  return new Promise(res=>{
    if (orbCount>=ORB_TARGET) return res();
    const cell = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
    if (!cell) return res();
    const orb = document.createElement("div");
    orb.className="floating-orb";
    document.body.appendChild(orb);
    const cr=cell.getBoundingClientRect();
    orb.style.transform=`translate(${cr.left+cr.width/2-10}px,${cr.top+cr.height/2-10}px)`;
    const dest = orbSlots[orbCount];
    requestAnimationFrame(()=>{
      orb.classList.add("fly");
      orb.style.transform=`translate(${dest.x}px,${dest.y}px)`;
    });
    orb.addEventListener("transitionend", ()=>{
      orb.remove();
      const slot = document.querySelectorAll(".orb-slot")[orbCount];
      const sOrb = document.createElement("div");
      sOrb.className="orb";
      slot.appendChild(sOrb);
      orbCount++;
      if (orbCount===ORB_TARGET) {
        document.getElementById("message").textContent="🎉 You Win! 🎉";
      }
      res();
    }, {once:true});
  });
}

function spawnRandomTile(){
  const empties=[];
  for (let r=0;r<GRID_SIZE;r++){
    for (let c=0;c<GRID_SIZE;c++){
      if (!grid[r][c]) empties.push({r,c});
    }
  }
  if (!empties.length) return;
  const {r,c}=empties[Math.floor(Math.random()*empties.length)];
  const cols=Array(4).fill().map(_=>COLORS[Math.floor(Math.random()*COLORS.length)]);
  grid[r][c]={colors:cols};
  renderGrid();
}
