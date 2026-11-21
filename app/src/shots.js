// Screenshot scenes: a `?shot=` query describes one fixed scene so the maker can photograph the
// app deterministically (see shots.json in the repository root). readShotScene turns the query
// into a plain spec; main.js applies it. markShotReady tells the camera the paint has settled.

export function readShotScene(query) {
  const kind = query.get('shot');
  if (!kind) return null;
  const list = (value, fallback) => (value ? value.split(',').map((s) => s.trim()).filter(Boolean) : fallback);
  return {
    kind,
    size: query.get('size') ?? '1080x1080',
    layout: query.get('layout') ?? 'collage',
    grade: query.get('grade') ?? 'sunset',
    photos: list(query.get('photos'), ['pier', 'boulevard']),
    assign: list(query.get('assign'), null)?.map((n) => Number.parseInt(n, 10)) ?? null,
    views: list(query.get('views'), null)?.map((triple) => {
      const [dx, dy, zoom] = triple.split(':').map(Number);
      return { dx: dx || 0, dy: dy || 0, zoom: zoom || 1 };
    }) ?? null,
    caption: query.get('caption') ?? 'Vice Heat',
    sub: query.get('sub') ?? 'Vice Cover Maker',
    badge: query.get('badge') ?? 'New Edition',
    panel: Number.parseInt(query.get('panel') ?? '0', 10) || 0,
  };
}

export function markShotReady() {
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
