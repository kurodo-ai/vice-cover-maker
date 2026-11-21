// Vice Cover Maker editor: wires the page to the renderer in ./cover.js. Photos are loaded from
// the maker's own machine (or the bundled samples), dropped into the layout's panels, dragged
// and zoomed in place, captioned, graded, and exported as a PNG at the picked post size.
// A `?shot=` query applies a fixed scene instead (./shots.js), for the maker's screenshots.
import { EXPORT_SIZES, GRADES, LAYOUTS, layoutById, renderCover } from './cover.js';
import { readShotScene, markShotReady } from './shots.js';

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

const state = {
  size: '1080x1080',
  layout: 'collage',
  grade: 'sunset',
  photos: [], // { img, name, thumb }
  panelsByLayout: new Map(),
  caption: 'Vice Heat',
  sub: 'One city · One legend',
  badge: 'New Edition',
  frame: true,
};
let selectedPhoto = 0;
let selectedPanel = 0;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function panelViews() {
  const layout = layoutById(state.layout);
  if (!state.panelsByLayout.has(layout.id)) {
    state.panelsByLayout.set(layout.id, layout.panels.map((_, i) => ({
      photo: state.photos.length ? i % state.photos.length : 0,
      dx: 0, dy: 0, zoom: 1,
    })));
  }
  return state.panelsByLayout.get(layout.id);
}

function renderState() {
  return {
    layout: state.layout,
    grade: state.grade,
    photos: state.photos.map((p) => p.img),
    panels: panelViews(),
    caption: state.caption,
    sub: state.sub,
    badge: state.badge,
    frame: state.frame,
  };
}

function redraw() {
  const [w, h] = EXPORT_SIZES[state.size];
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  renderCover(ctx, w, h, renderState(), scene?.kind === 'cover' ? -1 : selectedPanel);
  syncPanelChips();
}

// ---- photos -------------------------------------------------------------------------------

async function addPhoto(img, name, thumb) {
  state.photos.push({ img, name, thumb });
  selectedPhoto = state.photos.length - 1;
  drawThumbs();
  redraw();
  return state.photos.length - 1;
}

async function addSample(name) {
  const existing = state.photos.findIndex((p) => p.name === name);
  if (existing >= 0) { selectedPhoto = existing; drawThumbs(); assignPhotoToPanel(selectedPanel); return; }
  const img = await loadImage(`samples/${name}.jpg`);
  await addPhoto(img, name, `samples/${name}.jpg`);
  assignPhotoToPanel(selectedPanel);
}

function drawThumbs() {
  const box = document.getElementById('thumbs');
  box.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb' + (i === selectedPhoto ? ' picked' : '');
    b.title = photo.name;
    const im = document.createElement('img');
    im.src = photo.thumb;
    im.alt = photo.name;
    b.appendChild(im);
    b.addEventListener('click', () => { selectedPhoto = i; assignPhotoToPanel(selectedPanel); drawThumbs(); });
    box.appendChild(b);
  });
}

function assignPhotoToPanel(panelIndex) {
  if (!state.photos.length) return;
  panelViews()[panelIndex].photo = selectedPhoto;
  redraw();
}

// ---- layout and panel controls --------------------------------------------------------------

function drawLayoutChips() {
  const box = document.getElementById('layouts');
  box.innerHTML = '';
  LAYOUTS.forEach((layout) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = layout.name;
    b.className = 'chip' + (layout.id === state.layout ? ' on' : '');
    b.addEventListener('click', () => {
      state.layout = layout.id;
      selectedPanel = 0;
      panelViews();
      drawLayoutChips();
      redraw();
    });
    box.appendChild(b);
  });
}

function syncPanelChips() {
  const box = document.getElementById('panels');
  const views = panelViews();
  if (box.childElementCount !== views.length) {
    box.innerHTML = '';
    views.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `Panel ${i + 1}`;
      b.addEventListener('click', () => { selectedPanel = i; assignPhotoToPanel(i); syncZoom(); });
      box.appendChild(b);
    });
  }
  [...box.children].forEach((b, i) => { b.className = 'chip small' + (i === selectedPanel ? ' on' : ''); });
  void views;
}

function syncZoom() {
  document.getElementById('zoom').value = String(panelViews()[selectedPanel]?.zoom ?? 1);
}

// Dragging on the canvas moves the photo inside the panel under the pointer; the wheel zooms it.
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return [((e.clientX - r.left) / r.width) * canvas.width, ((e.clientY - r.top) / r.height) * canvas.height];
}

function panelAt(x, y) {
  const layout = layoutById(state.layout);
  const nx = x / canvas.width;
  const ny = y / canvas.height;
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const poly = layout.panels[i];
    let inside = false;
    for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) {
      const [ax, ay] = poly[a];
      const [bx, by] = poly[b];
      if ((ay > ny) !== (by > ny) && nx < ((bx - ax) * (ny - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const [x, y] = canvasPoint(e);
  const panel = panelAt(x, y);
  if (panel < 0) return;
  selectedPanel = panel;
  syncZoom();
  drag = { x, y };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [x, y] = canvasPoint(e);
  const view = panelViews()[selectedPanel];
  const layout = layoutById(state.layout);
  const poly = layout.panels[selectedPanel];
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  view.dx += (x - drag.x) / ((Math.max(...xs) - Math.min(...xs)) * canvas.width);
  view.dy += (y - drag.y) / ((Math.max(...ys) - Math.min(...ys)) * canvas.height);
  drag = { x, y };
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const view = panelViews()[selectedPanel];
  view.zoom = Math.min(3, Math.max(0.5, view.zoom * (e.deltaY < 0 ? 1.07 : 0.93)));
  syncZoom();
  redraw();
}, { passive: false });

// ---- words, style, size ---------------------------------------------------------------------

function bindText(id, key) {
  const el = document.getElementById(id);
  el.addEventListener('input', () => { state[key] = el.value; redraw(); });
  return el;
}
const captionInput = bindText('caption', 'caption');
const subInput = bindText('sub', 'sub');
const badgeInput = bindText('badge', 'badge');

function drawGradeChips() {
  const box = document.getElementById('grades');
  box.innerHTML = '';
  Object.entries(GRADES).forEach(([id, grade]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = grade.name;
    b.className = 'chip' + (id === state.grade ? ' on' : '');
    b.addEventListener('click', () => { state.grade = id; drawGradeChips(); redraw(); });
    box.appendChild(b);
  });
}

function drawSizeChips() {
  const box = document.getElementById('sizes');
  box.innerHTML = '';
  Object.keys(EXPORT_SIZES).forEach((key) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = key.replace('x', ' × ');
    b.className = 'chip' + (key === state.size ? ' on' : '');
    b.addEventListener('click', () => { state.size = key; drawSizeChips(); redraw(); });
    box.appendChild(b);
  });
}

// ---- export -----------------------------------------------------------------------------------

function exportBlob() {
  return new Promise((resolve) => {
    const [w, h] = EXPORT_SIZES[state.size];
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    renderCover(off.getContext('2d'), w, h, renderState(), -1);
    off.toBlob(resolve, 'image/png');
  });
}

document.getElementById('export').addEventListener('click', async () => {
  const blob = await exportBlob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vice-cover-${state.size}.png`;
  a.click();
  status.textContent = `Saved vice-cover-${state.size}.png`;
});

// The same export the button runs, exposed so the maker can photograph a real exported cover.
window.__exportPNG = async () => {
  const blob = await exportBlob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

// ---- page wiring ------------------------------------------------------------------------------

document.getElementById('photo-files').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    await addPhoto(img, file.name, url);
  }
  if (state.photos.length) assignPhotoToPanel(selectedPanel);
});
document.getElementById('sample-pier').addEventListener('click', () => addSample('pier'));
document.getElementById('sample-boulevard').addEventListener('click', () => addSample('boulevard'));
document.getElementById('fill-all').addEventListener('click', () => {
  panelViews().forEach((view) => { view.photo = selectedPhoto; });
  redraw();
});
document.getElementById('zoom').addEventListener('input', (e) => {
  panelViews()[selectedPanel].zoom = Number(e.target.value);
  redraw();
});
document.getElementById('frame').addEventListener('change', (e) => { state.frame = e.target.checked; redraw(); });

// ---- scenes: a fixed screenshot scene, or the two samples as a starting point -------------------

const scene = readShotScene(new URLSearchParams(location.search));

async function applyScene(s) {
  state.size = EXPORT_SIZES[s.size] ? s.size : '1080x1080';
  state.layout = layoutById(s.layout).id;
  state.grade = GRADES[s.grade] ? s.grade : 'sunset';
  state.caption = s.caption;
  state.sub = s.sub;
  state.badge = s.badge;
  captionInput.value = s.caption;
  subInput.value = s.sub;
  badgeInput.value = s.badge;
  for (const name of s.photos) {
    const img = await loadImage(`samples/${name}.jpg`);
    state.photos.push({ img, name, thumb: `samples/${name}.jpg` });
  }
  const views = panelViews();
  views.forEach((view, i) => {
    view.photo = s.assign?.[i] ?? (state.photos.length ? i % state.photos.length : 0);
    if (s.views?.[i]) Object.assign(view, s.views[i]);
  });
  selectedPanel = Math.min(s.panel, views.length - 1);
  if (s.kind === 'cover') document.body.classList.add('shot-cover');
  drawLayoutChips();
  drawGradeChips();
  drawSizeChips();
  drawThumbs();
  syncZoom();
  redraw();
  markShotReady();
}

async function start() {
  if (scene) { await applyScene(scene); return; }
  drawLayoutChips();
  drawGradeChips();
  drawSizeChips();
  redraw();
  await addSample('pier');
  await addSample('boulevard');
  panelViews().forEach((view, i) => { view.photo = i % state.photos.length; });
  selectedPhoto = 0;
  selectedPanel = 0;
  syncZoom();
  redraw();
}

start();
