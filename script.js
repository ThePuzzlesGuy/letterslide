// script.js

const SIZE        = 4;
const TILE_SIZE   = 80;
const GAP         = 10;
const START_TILES = 2;
const ORB_TARGET  = 10;

// colors for exponent levels 0..11
const COLORS = [
  "#cdc1b4","#eee4da","#ede0c8","#f2b179",
  "#f59563","#f67c5f","#f65e3b","#edcf72",
  "#edcc61","#edc850","#edc53f","#edc22e"
];

let grid      = [];
let tileMap   = {};   // id → DOM element
let score     = 0;
let orbCount  = 0;
let orbSlots  = [];   // {x,y} centers

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("restart").onclick = setup;
  document.addEventListener("keydown", handleKey);
  setup();
});

function setup(){
  score = 0; updateScore();
  orbCount = 0;
  grid = Array.from({length:SIZE}, ()=>Array(SIZE).fill({v:0,id:null}));
  tileMap = {};
  initOrbsBar();
  for(let i=0;i<START_TILES;i++) addRandom();
  render();  
  document.getElementById("message").textContent = "";
}

function addRandom(){
  const empties = [];
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
    if(grid[r][c].v===0) empties.push({r,c});
  }
  if(!empties.length) return;
  const {r,c} = empties[Math.floor(Math.random()*empties.length)];
  grid[r][c] = {v: Math.random()<0.9?1:2, id: crypto.randomUUID()};
}

function render(){
  const gc = document.getElementById("grid-container");
  gc.style.width  = `${SIZE*TILE_SIZE + (SIZE-1)*GAP}px`;
  gc.style.height = gc.style.width;
  // track which ids remain
  const live = new Set();
  for(let r=0;r<SIZE;r++){
    for(let c=0;c<SIZE;c++){
      const cell = grid[r][c];
      if(cell.v===0) continue;
      live.add(cell.id);
      let el = tileMap[cell.id];
      if(!el){
        el = document.createElement("div");
        el.className = "tile";
        gc.appendChild(el);
        tileMap[cell.id] = el;
      }
      const left = c*(TILE_SIZE+GAP);
      const top  = r*(TILE_SIZE+GAP);
      el.style.left = left+"px";
      el.style.top  = top +"px";
      el.style.background = COLORS[cell.v];
    }
  }
  // remove old
  Object.keys(tileMap).forEach(id=>{
    if(!live.has(id)){
      tileMap[id].remove();
      delete tileMap[id];
    }
  });
}

// handle arrow keys
function handleKey(e){
  const moves = {
    ArrowUp:    {dr:-1, dc:0},
    ArrowDown:  {dr:1,  dc:0},
    ArrowLeft:  {dr:0,  dc:-1},
    ArrowRight: {dr:0,  dc:1}
  };
  if(!moves[e.key]) return;
  e.preventDefault();
  const {dr,dc} = moves[e.key];
  const result = slide(dr,dc);
  if(result.moved){
    // animate pops
    result.mergedIds.forEach(id=>{
      const el = tileMap[id];
      el.classList.add("pop");
      setTimeout(()=>el.classList.remove("pop"),200);
    });
    // after a tick, add random & rerender
    setTimeout(()=>{
      addRandom();
      render();
    },200);
    updateScore();
    // then spawn orb
    setTimeout(()=>spawnOrb(), 250);
    if(checkGameOver()){
      document.getElementById("message").textContent = "Game Over";
    }
  }
}

// slide/merge logic
function slide(dr,dc){
  let moved=false;
  const merged = Array(SIZE).fill().map(()=>Array(SIZE).fill(false));
  const mergedIds = [];
  const range = [...Array(SIZE).keys()];
  if(dr>0) range.reverse();
  if(dc>0) range.reverse();

  for(let r of range) for(let c of range){
    const t = grid[r][c];
    if(t.v===0) continue;
    let nr=r,nc=c;
    while(true){
      const tr=nr+dr, tc=nc+dc;
      if(tr<0||tr>=SIZE||tc<0||tc>=SIZE) break;
      const tgt = grid[tr][tc];
      if(tgt.v===0){
        grid[tr][tc] = t;
        grid[nr][nc] = {v:0,id:null};
        nr=tr; nc=tc; moved=true;
      } else if(tgt.v===t.v && !merged[tr][tc]){
        // merge
        tgt.v++;
        // keep id for animation
        merged[tr][tc]=true;
        mergedIds.push(tgt.id);
        grid[nr][nc] = {v:0,id:null};
        score += 2**tgt.v;
        moved=true;
        break;
      } else break;
    }
  }
  if(moved) render();
  return {moved, mergedIds};
}

function updateScore(){
  document.getElementById("score-value").textContent = score;
}

// orb bar
function initOrbsBar(){
  orbSlots = [];
  const bar = document.getElementById("orbs-bar");
  bar.innerHTML="";
  orbCount=0;
  for(let i=0;i<ORB_TARGET;i++){
    const s=document.createElement("div");
    s.className="orb-slot";
    bar.appendChild(s);
    const r=s.getBoundingClientRect();
    orbSlots.push({
      x: r.left + r.width/2 - 10,
      y: r.top  + r.height/2 - 10
    });
  }
}

// spawn one flying orb to next slot
function spawnOrb(){
  if(orbCount>=ORB_TARGET) return;
  // choose random existing tile as start
  const ids = Object.keys(tileMap);
  if(!ids.length) return;
  const startEl = tileMap[ids[0]]; // just pick first
  const r = startEl.getBoundingClientRect();
  const orb = document.createElement("div");
  orb.className = "floating-orb";
  document.body.appendChild(orb);
  orb.style.transform = `translate(${r.left + r.width/2 -10}px,${r.top + r.height/2 -10}px)`;
  const dest = orbSlots[orbCount++];
  requestAnimationFrame(()=>{
    orb.classList.add("fly");
    orb.style.transform = `translate(${dest.x}px,${dest.y}px)`;
  });
  orb.addEventListener("transitionend",()=>{
    orb.remove();
    const slot = document.querySelectorAll(".orb-slot")[orbCount-1];
    slot.appendChild(Object.assign(document.createElement("div"),{className:"orb"}));
    if(orbCount===ORB_TARGET){
      document.getElementById("message").textContent = "🎉 You Win! 🎉";
    }
  },{once:true});
}

// game over detection
function checkGameOver(){
  for(let r=0;r<SIZE;r++)for(let c=0;c<SIZE;c++){
    if(grid[r][c].v===0) return false;
    if(r<SIZE-1 && grid[r+1][c].v===grid[r][c].v) return false;
    if(c<SIZE-1 && grid[r][c+1].v===grid[r][c].v) return false;
  }
  return true;
}
