/* Final interactions with particles:
   - search + genre filter
   - IntersectionObserver reveal, tilt micro-interaction
   - modal details
   - canvas background blobs
   - particle canvas: soft falling/glowing dots behind hero (continuous ambient)
   - particle opacity fades as hero scrolls away
   - audio toggle (optional preview.mp3)
*/

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const searchInput = $('#searchInput');
const genreButtons = $$('.genre-btn');
const recordItems = $$('.record-item');
const exploreBtn = $('#exploreBtn');
const modalEl = document.getElementById('recordModal');
const modal = new bootstrap.Modal(modalEl);
const modalImage = $('#modalImage');
const modalMeta = $('#modalMeta');

const bgCanvas = $('#bgCanvas');
const particleCanvas = $('#particleCanvas');

const audioBtn = $('#audioBtn');
const previewAudio = $('#previewAudio');
const audioIcon = $('#audioIcon');

/* --- FILTERS --- */
function applyFilters(){
  const q = (searchInput.value || '').trim().toLowerCase();
  const active = document.querySelector('.genre-btn.active');
  const g = active ? active.dataset.genre : 'all';

  recordItems.forEach(item => {
    const title = (item.querySelector('.title')||{innerText:''}).innerText.toLowerCase();
    const meta = (item.querySelector('.meta')||{innerText:''}).innerText.toLowerCase();
    const tags = (item.dataset.tags || '').toLowerCase();
    const matchesQ = !q || title.includes(q) || meta.includes(q) || tags.includes(q);
    const matchesG = g === 'all' || item.dataset.genre === g;
    item.style.display = (matchesQ && matchesG) ? '' : 'none';
  });
  revealVisible();
}
searchInput.addEventListener('input', applyFilters);

/* genre buttons */
genreButtons.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    genreButtons.forEach(b=>b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });
});

/* --- CARD INTERACTIONS --- */
recordItems.forEach(item=>{
  const card = item.querySelector('.record-card');
  const info = item.querySelector('.icon.info');
  const play = item.querySelector('.icon.play');

  function openModal(){
    const img = item.querySelector('img').src;
    const title = item.querySelector('.title').innerText;
    const meta = item.querySelector('.meta').innerText;
    modalImage.src = img;
    modalMeta.innerHTML = `<strong>${title}</strong><div class="muted small">${meta}</div>`;
    modal.show();
  }

  if(info) info.addEventListener('click', e=>{ e.stopPropagation(); openModal(); });
  if(card) card.addEventListener('click', openModal);

  if(play) play.addEventListener('click', e=>{
    e.stopPropagation();
    play.animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}], {duration:360});
  });

  // tilt micro-interaction
  item.addEventListener('mousemove', e=>{
    const rect = item.getBoundingClientRect();
    const px = (e.clientX - rect.left)/rect.width - 0.5;
    const py = (e.clientY - rect.top)/rect.height - 0.5;
    const rx = (-py * 6).toFixed(2);
    const ry = (px * 8).toFixed(2);
    card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
  });
  item.addEventListener('mouseleave', ()=> card.style.transform = '');
});

/* explore scroll */
if(exploreBtn) exploreBtn.addEventListener('click', ()=> document.getElementById('records').scrollIntoView({behavior:'smooth'}));

/* IntersectionObserver reveal */
const observer = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('revealed');
    }
  });
}, { threshold: 0.12 });
recordItems.forEach(item => observer.observe(item));
function revealVisible(){
  const visible = recordItems.filter(i => i.style.display !== 'none');
  visible.forEach((it, idx) => {
    it.classList.remove('revealed');
    setTimeout(()=> it.classList.add('revealed'), idx * 70);
  });
}

/* Canvas: background blobs (ambient) */
function fitCanvas(c){
  if(!c) return;
  c.width = c.clientWidth;
  c.height = c.clientHeight;
}
window.addEventListener('resize', ()=>{ fitCanvas(bgCanvas); fitCanvas(particleCanvas); });

if(bgCanvas){
  fitCanvas(bgCanvas);
  const ctx = bgCanvas.getContext('2d');
  const cols = ['rgba(255,45,209,0.06)','rgba(138,52,255,0.05)','rgba(255,45,209,0.04)'];
  const blobs = Array.from({length:6}).map(()=>({
    x: Math.random()*bgCanvas.width,
    y: Math.random()*bgCanvas.height,
    r: 120 + Math.random()*260,
    vx: (Math.random()-0.5)*0.2,
    vy: (Math.random()-0.5)*0.2,
    col: cols[Math.floor(Math.random()*cols.length)]
  }));

  function draw(){
    ctx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
    blobs.forEach(b=>{
      b.x += b.vx; b.y += b.vy;
      if(b.x < -400) b.x = bgCanvas.width + 400;
      if(b.x > bgCanvas.width + 400) b.x = -400;
      if(b.y < -400) b.y = bgCanvas.height + 400;
      if(b.y > bgCanvas.height + 400) b.y = -400;
      const g = ctx.createRadialGradient(b.x,b.y,b.r*0.1,b.x,b.y,b.r);
      g.addColorStop(0, b.col);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0,0,bgCanvas.width,bgCanvas.height);
    });
    requestAnimationFrame(draw);
  }
  draw();
}

/* PARTICLE CANVAS: gentle falling/glowing dots behind hero */
if(particleCanvas){
  fitCanvas(particleCanvas);
  const ctx = particleCanvas.getContext('2d');
  let particles = [];
  const MAX = 60;

  function spawnParticle(){
    const w = particleCanvas.width;
    return {
      x: Math.random()*w,
      y: -10 - Math.random()*40,
      vx: (Math.random()-0.5) * 0.4,
      vy: 0.6 + Math.random()*1.2,
      size: 1 + Math.random()*3.5,
      life: 0,
      ttl: 160 + Math.random()*120,
      hue: 300 + Math.random()*80  // roughly magenta->purple->blue range
    };
  }

  for(let i=0;i<MAX;i++) particles.push(spawnParticle());

  function drawParticles(){
    fitCanvas(particleCanvas);
    ctx.clearRect(0,0,particleCanvas.width,particleCanvas.height);

    // global alpha scaled by hero visibility
    const hero = $('#hero');
    let heroVisible = 1;
    if(hero){
      const rect = hero.getBoundingClientRect();
      const h = rect.height;
      heroVisible = Math.max(0, Math.min(1, (h - Math.abs(rect.top))/h));
    }

    particles.forEach((p, i)=>{
      p.x += p.vx;
      p.y += p.vy * (1 + 0.1*Math.sin(p.life*0.05));
      p.vx += (Math.random()-0.5)*0.02;
      p.life++;

      // wrap or respawn
      if(p.y > particleCanvas.height + 40 || p.life > p.ttl){
        particles[i] = spawnParticle();
        particles[i].y = -20;
        return;
      }

      // color - map hue to rgb-ish via HSL
      const hue = p.hue;
      const alpha = 0.12 + (p.size/5)*0.18;
      ctx.beginPath();
      const g = ctx.createRadialGradient(p.x, p.y, p.size*0.2, p.x, p.y, p.size*5);
      // center bright magenta-ish, outer transparent
      g.addColorStop(0, `hsla(${hue},90%,65%,${alpha * heroVisible})`);
      g.addColorStop(0.4, `hsla(${hue-20},85%,52%,${(alpha*0.6) * heroVisible})`);
      g.addColorStop(1, `rgba(0,0,0,0)`);
      ctx.fillStyle = g;
      ctx.fillRect(p.x - p.size*6, p.y - p.size*6, p.size*12, p.size*12);
    });

    // ensure a minimum number
    while(particles.length < MAX) particles.push(spawnParticle());

    requestAnimationFrame(drawParticles);
  }
  drawParticles();
}

/* particle opacity fades as hero scrolls away (handled by particle drawing using heroVisible) */

/* audio toggle */
if(audioBtn && previewAudio){
  audioBtn.addEventListener('click', ()=>{
    if(previewAudio.paused){
      previewAudio.loop = true;
      previewAudio.play().catch(()=>{ /* some browsers require user gesture */ });
      audioIcon.className = 'bi bi-volume-mute';
    } else {
      previewAudio.pause();
      audioIcon.className = 'bi bi-volume-up';
    }
  });
}

/* ensure canvases sized & initial reveal */
window.addEventListener('load', ()=>{
  fitCanvas(bgCanvas);
  fitCanvas(particleCanvas);
  revealVisible();
  applyFilters(); // initial
});
