// Pure camera math. No elapsed-time input and no reference to a world model.
export function createCamera(start, bounds, limits = { minZoom: 0.2, maxZoom: 3 }) {
  const state = { ...start };
  let size = { width: 1, height: 1 };
  const toScreen = (x, y) => ({ x: (x - state.x) * state.zoom + size.width / 2, y: (y - state.y) * state.zoom + size.height / 2 });
  const toWorld = (x, y) => ({ x: (x - size.width / 2) / state.zoom + state.x, y: (y - size.height / 2) / state.zoom + state.y });
  function clamp() { state.x = Math.min(bounds.width, Math.max(0, state.x)); state.y = Math.min(bounds.height, Math.max(0, state.y)); }
  return { state, toScreen, toWorld,
    resize(width, height) { size = { width, height }; },
    apply(container) { clamp(); container.scale.set(state.zoom); container.position.set(size.width / 2 - state.x * state.zoom, size.height / 2 - state.y * state.zoom); },
    zoomAt(x, y, zoom) { const before = toWorld(x, y); state.zoom = Math.min(limits.maxZoom, Math.max(limits.minZoom, zoom)); const after = toWorld(x, y); state.x += before.x - after.x; state.y += before.y - after.y; clamp(); },
  };
}
