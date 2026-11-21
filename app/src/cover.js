// Vice Cover Maker renderer: draws a multi-panel, GTA-poster-style cover onto a 2D canvas.
// Panels are slanted polygons filled with the maker's own photos (cover-fit, with a per-panel
// pan and zoom), graded with a Vice City sunset or neon wash, framed with heavy ink borders,
// and finished with arced, gradient-filled caption lettering. Pure canvas, no assets, no fonts
// shipped: lettering uses the reader's own system font stack.

export const EXPORT_SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

// Colour grades: photo filter, wash gradient (top to bottom), ink and accent colours, and the
// two-stop lettering gradient. Every grade is original CSS/canvas colour work.
export const GRADES = {
  sunset: {
    name: 'Vice Sunset',
    filter: 'saturate(1.3) contrast(1.07) brightness(1.02)',
    wash: [[0, 'rgba(64, 16, 96, 0.20)'], [0.45, 'rgba(255, 94, 58, 0.10)'], [0.78, 'rgba(255, 45, 120, 0.28)'], [1, 'rgba(120, 10, 70, 0.42)']],
    hi: 'rgba(255, 170, 60, 0.20)',
    ink: '#150722',
    accent: '#ffb03a',
    textA: '#fff7e0',
    textB: '#ff9a3c',
    textC: '#ff2e88',
  },
  neon: {
    name: 'Neon Nights',
    filter: 'saturate(1.35) contrast(1.12) brightness(0.98)',
    wash: [[0, 'rgba(6, 20, 64, 0.30)'], [0.5, 'rgba(0, 229, 255, 0.10)'], [0.8, 'rgba(150, 0, 255, 0.26)'], [1, 'rgba(30, 0, 60, 0.45)']],
    hi: 'rgba(0, 229, 255, 0.16)',
    ink: '#04050f',
    accent: '#00e5ff',
    textA: '#eaffff',
    textB: '#3ae2ff',
    textC: '#ff3ae0',
  },
  gold: {
    name: 'Golden Palms',
    filter: 'saturate(1.18) contrast(1.05) brightness(1.05) sepia(0.22)',
    wash: [[0, 'rgba(80, 40, 0, 0.14)'], [0.5, 'rgba(255, 160, 40, 0.10)'], [0.85, 'rgba(190, 70, 20, 0.26)'], [1, 'rgba(70, 16, 40, 0.38)']],
    hi: 'rgba(255, 220, 120, 0.22)',
    ink: '#1c0b02',
    accent: '#ffd23e',
    textA: '#fffbe8',
    textB: '#ffd23e',
    textC: '#ff6a2a',
  },
};

// Panel layouts. Each panel is a polygon in fractions of the cover (x, y in 0..1); the panels
// tile the whole cover and the caption masthead is lettered over the top.
export const LAYOUTS = [
  {
    id: 'collage', name: 'Vice Collage',
    panels: [
      [[0, 0], [1, 0], [1, 0.55], [0, 0.63]],
      [[0, 0.63], [0.52, 0.565], [0.5, 1], [0, 1]],
      [[0.52, 0.565], [1, 0.55], [1, 1], [0.5, 1]],
    ],
  },
  {
    id: 'split', name: 'Split Screen',
    panels: [
      [[0, 0], [0.58, 0], [0.52, 1], [0, 1]],
      [[0.58, 0], [1, 0], [1, 0.5], [0.545, 0.5]],
      [[0.545, 0.5], [1, 0.5], [1, 1], [0.52, 1]],
    ],
  },
  {
    id: 'triptych', name: 'Triptych',
    panels: [
      [[0, 0], [0.36, 0], [0.3, 1], [0, 1]],
      [[0.36, 0], [0.68, 0], [0.64, 1], [0.3, 1]],
      [[0.68, 0], [1, 0], [1, 1], [0.64, 1]],
    ],
  },
  {
    id: 'hero', name: 'Hero + Inset',
    panels: [
      [[0, 0], [1, 0], [1, 1], [0, 1]],
      [[0.6, 0.58], [0.97, 0.58], [0.97, 0.94], [0.6, 0.94]],
    ],
  },
  {
    id: 'grid', name: 'Comic Grid',
    panels: [
      [[0, 0], [0.335, 0], [0.335, 0.5], [0, 0.5]],
      [[0.335, 0], [0.67, 0], [0.67, 0.5], [0.335, 0.5]],
      [[0.67, 0], [1, 0], [1, 0.5], [0.67, 0.5]],
      [[0, 0.5], [0.335, 0.5], [0.335, 1], [0, 1]],
      [[0.335, 0.5], [0.67, 0.5], [0.67, 1], [0.335, 1]],
      [[0.67, 0.5], [1, 0.5], [1, 1], [0.67, 1]],
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

function panelPath(ctx, poly, w, h, inset) {
  const cx = poly.reduce((s, p) => s + p[0], 0) / poly.length * w;
  const cy = poly.reduce((s, p) => s + p[1], 0) / poly.length * h;
  ctx.beginPath();
  poly.forEach(([px, py], i) => {
    let x = px * w;
    let y = py * h;
    if (inset > 0) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) || 1;
      x -= (dx / d) * inset;
      y -= (dy / d) * inset;
    }
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function panelBounds(poly, w, h) {
  const xs = poly.map((p) => p[0] * w);
  const ys = poly.map((p) => p[1] * h);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}

// A deterministic speckle pattern, drawn once and reused as a print-grain overlay.
let grainPattern = null;
function getGrain(ctx) {
  if (grainPattern) return grainPattern;
  const c = document.createElement('canvas');
  c.width = c.height = 180;
  const g = c.getContext('2d');
  const img = g.createImageData(180, 180);
  let seed = 1234567;
  for (let i = 0; i < img.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = 110 + (seed % 90);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(c, 'repeat');
  return grainPattern;
}

function drawPanelPhoto(ctx, img, bounds, view) {
  const zoom = view?.zoom ?? 1;
  const scale = Math.max(bounds.w / img.naturalWidth, bounds.h / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = bounds.x + (bounds.w - dw) / 2 + (view?.dx ?? 0) * bounds.w;
  const dy = bounds.y + (bounds.h - dh) / 2 + (view?.dy ?? 0) * bounds.h;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function drawPanelPlaceholder(ctx, bounds, grade, index) {
  const grad = ctx.createLinearGradient(bounds.x, bounds.y, bounds.x + bounds.w, bounds.y + bounds.h);
  grad.addColorStop(0, '#3a1454');
  grad.addColorStop(1, '#12041f');
  ctx.fillStyle = grad;
  ctx.fillRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = Math.max(6, bounds.w * 0.03);
  for (let x = -bounds.h; x < bounds.w; x += bounds.w * 0.09) {
    ctx.beginPath();
    ctx.moveTo(bounds.x + x, bounds.y + bounds.h);
    ctx.lineTo(bounds.x + x + bounds.h, bounds.y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `700 ${Math.round(bounds.h * 0.09)}px 'Arial Narrow', Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`PHOTO ${index + 1}`, bounds.x + bounds.w / 2, bounds.y + bounds.h / 2);
  ctx.restore();
  void grade;
}

const CAPTION_FONT = (size) => `900 ${size}px Impact, 'Arial Black', 'Franklin Gothic Medium', 'Arial Narrow', sans-serif`;

// Letters the caption along a shallow arc, each glyph ink-stroked, shadowed and filled with the
// grade's three-stop gradient, then tilted a couple of degrees for poster energy.
function drawArcCaption(ctx, text, cx, topY, maxWidth, baseSize, grade) {
  let size = baseSize;
  ctx.font = CAPTION_FONT(size);
  const tracking = () => size * 0.04;
  const widthOf = (s) => [...s].reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) + tracking() * (s.length - 1);
  while (widthOf(text) > maxWidth && size > 12) {
    size -= 2;
    ctx.font = CAPTION_FONT(size);
  }
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking() * (chars.length - 1);
  const radius = Math.max(total * 2.4, size * 6);
  const grad = ctx.createLinearGradient(0, topY - size * 0.15, 0, topY + size * 0.95);
  grad.addColorStop(0, grade.textA);
  grad.addColorStop(0.55, grade.textB);
  grad.addColorStop(1, grade.textC);
  ctx.save();
  ctx.translate(cx, topY);
  ctx.rotate(-0.018);
  ctx.translate(-cx, -topY);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  let cursor = -total / 2;
  chars.forEach((ch, i) => {
    const s = cursor + widths[i] / 2;
    const angle = s / radius;
    const x = cx + radius * Math.sin(angle);
    const y = topY + radius * (1 - Math.cos(angle));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.14;
    ctx.shadowOffsetY = size * 0.06;
    ctx.strokeStyle = grade.ink;
    ctx.lineWidth = size * 0.17;
    ctx.strokeText(ch, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = grad;
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    cursor += widths[i] + tracking();
  });
  ctx.restore();
}

function drawSpacedText(ctx, text, cx, y, size, color) {
  ctx.save();
  ctx.font = `700 ${size}px 'Arial Narrow', 'Helvetica Neue', Arial, sans-serif`;
  ctx.textAlign = 'center';
  try { ctx.letterSpacing = `${Math.round(size * 0.42)}px`; } catch { /* older engines: plain spacing */ }
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = size * 0.3;
  ctx.fillStyle = color;
  ctx.fillText(text, cx, y);
  ctx.restore();
}

// A rotated starburst sticker in the corner, an original poster device (no game's badge).
function drawBadge(ctx, text, w, h, grade) {
  const cx = w * 0.865;
  const cy = h * 0.845;
  const r = Math.min(w, h) * 0.085;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.21);
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * 0.8;
    const a = (i / (points * 2)) * Math.PI * 2;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
  grad.addColorStop(0, grade.textB);
  grad.addColorStop(1, grade.textC);
  ctx.fillStyle = grad;
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = r * 0.25;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = r * 0.07;
  ctx.strokeStyle = grade.ink;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  const words = text.split(' ');
  const size = r * (words.length > 1 ? 0.34 : 0.42);
  ctx.font = `900 ${size}px Impact, 'Arial Black', sans-serif`;
  if (words.length > 1) {
    ctx.fillText(words[0], 0, -r * 0.02);
    ctx.fillText(words.slice(1).join(' '), 0, size * 0.92);
  } else {
    ctx.fillText(text, 0, size * 0.35);
  }
  ctx.restore();
}

/**
 * Renders the whole cover. `state` carries the layout id, the loaded photos, one view per panel
 * ({photo, dx, dy, zoom}), caption, sub-caption, badge, grade id and whether the outer frame is
 * drawn. `highlight` (editor only) outlines one panel index on top of the finished cover.
 */
export function renderCover(ctx, w, h, state, highlight = -1) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const layout = layoutById(state.layout);
  ctx.save();
  ctx.fillStyle = grade.ink;
  ctx.fillRect(0, 0, w, h);
  const gap = Math.max(3, w * 0.005);

  layout.panels.forEach((poly, i) => {
    const bounds = panelBounds(poly, w, h);
    ctx.save();
    panelPath(ctx, poly, w, h, gap);
    ctx.clip();
    const view = state.panels[i];
    const img = view && state.photos[view.photo];
    if (img) {
      ctx.filter = grade.filter;
      drawPanelPhoto(ctx, img, bounds, view);
      ctx.filter = 'none';
    } else {
      drawPanelPlaceholder(ctx, bounds, grade, i);
    }
    const wash = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.h);
    grade.wash.forEach(([at, color]) => wash.addColorStop(at, color));
    ctx.fillStyle = wash;
    ctx.fillRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, bounds.h + 8);
    ctx.globalCompositeOperation = 'screen';
    const hiGrad = ctx.createLinearGradient(0, bounds.y, 0, bounds.y + bounds.h * 0.42);
    hiGrad.addColorStop(0, grade.hi);
    hiGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = hiGrad;
    ctx.fillRect(bounds.x - 4, bounds.y - 4, bounds.w + 8, (bounds.h + 8) * 0.42);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    panelPath(ctx, poly, w, h, gap);
    ctx.lineWidth = Math.max(3, w * 0.007);
    ctx.strokeStyle = grade.ink;
    ctx.stroke();
    panelPath(ctx, poly, w, h, gap + Math.max(2, w * 0.0035));
    ctx.lineWidth = Math.max(1.5, w * 0.0018);
    ctx.strokeStyle = grade.accent;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Print grain and a vignette over the panels, under the lettering.
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = getGrain(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(8,0,18,0)');
  vig.addColorStop(1, 'rgba(8,0,18,0.34)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Masthead scrim, then the caption itself.
  const scrimH = h * 0.30;
  const scrim = ctx.createLinearGradient(0, 0, 0, scrimH);
  scrim.addColorStop(0, 'rgba(6,1,14,0.78)');
  scrim.addColorStop(0.65, 'rgba(6,1,14,0.34)');
  scrim.addColorStop(1, 'rgba(6,1,14,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, w, scrimH);
  const caption = (state.caption ?? '').trim().toUpperCase();
  if (caption) drawArcCaption(ctx, caption, w / 2, h * 0.115, w * 0.92, h * 0.105, grade);

  const sub = (state.sub ?? '').trim().toUpperCase();
  if (sub) {
    const foot = ctx.createLinearGradient(0, h * 0.87, 0, h);
    foot.addColorStop(0, 'rgba(6,1,14,0)');
    foot.addColorStop(1, 'rgba(6,1,14,0.66)');
    ctx.fillStyle = foot;
    ctx.fillRect(0, h * 0.87, w, h * 0.13);
    drawSpacedText(ctx, sub, w / 2, h * 0.955, Math.max(15, h * 0.021), '#ffffff');
  }

  const badge = (state.badge ?? '').trim().toUpperCase();
  if (badge) drawBadge(ctx, badge, w, h, grade);

  if (state.frame) {
    const m = Math.min(w, h);
    ctx.lineWidth = Math.max(6, m * 0.011);
    ctx.strokeStyle = grade.ink;
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
    ctx.lineWidth = Math.max(2, m * 0.0028);
    ctx.strokeStyle = grade.accent;
    const inset = Math.max(8, m * 0.016);
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  }

  if (highlight >= 0 && layout.panels[highlight]) {
    panelPath(ctx, layout.panels[highlight], w, h, gap);
    ctx.setLineDash([14, 9]);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
