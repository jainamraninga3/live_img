const viewport = document.getElementById("viewport");
const stage = document.getElementById("stage");
const img = document.getElementById("mapImg");
const loader = document.getElementById("loader");
const zoomLabel = document.getElementById("zoomLabel");
const coordLabel = document.getElementById("coordLabel");
const minimap = document.getElementById("minimap");
const miniView = document.getElementById("miniView");

const MAX_SCALE = 4;
let scale = 1, minScale = 0.05, x = 0, y = 0;
let imgW = 0, imgH = 0;

function clampPan() {
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const w = imgW * scale, h = imgH * scale;
  x = w <= vw ? (vw - w) / 2 : Math.min(0, Math.max(vw - w, x));
  y = h <= vh ? (vh - h) / 2 : Math.min(0, Math.max(vh - h, y));
}

function render() {
  clampPan();
  stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  zoomLabel.textContent = `${Math.round(scale * 100)}%`;
  updateMinimap();
}

function updateMinimap() {
  const k = minimap.clientWidth / imgW;
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const left = Math.max(0, -x / scale), top = Math.max(0, -y / scale);
  const w = Math.min(imgW, vw / scale), h = Math.min(imgH, vh / scale);
  Object.assign(miniView.style, {
    left: `${left * k}px`, top: `${top * k}px`,
    width: `${w * k}px`, height: `${h * k}px`,
  });
}

function fit() {
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  scale = minScale = Math.min(vw / imgW, vh / imgH) * 0.95;
  render();
}

// Zoom keeping the point (cx, cy) in viewport coords fixed
function zoomAt(factor, cx, cy) {
  const next = Math.min(MAX_SCALE, Math.max(minScale, scale * factor));
  const f = next / scale;
  x = cx - (cx - x) * f;
  y = cy - (cy - y) * f;
  scale = next;
  render();
}

function zoomCenter(factor) {
  zoomAt(factor, viewport.clientWidth / 2, viewport.clientHeight / 2);
}

img.addEventListener("load", () => {
  imgW = img.naturalWidth;
  imgH = img.naturalHeight;
  fit();
  loader.classList.add("hidden");
});
if (img.complete && img.naturalWidth) img.dispatchEvent(new Event("load"));

// Mouse wheel zoom
viewport.addEventListener("wheel", (e) => {
  e.preventDefault();
  const r = viewport.getBoundingClientRect();
  zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
}, { passive: false });

// Pointer drag + pinch
const pointers = new Map();
let lastPinch = 0;

viewport.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".controls, .minimap")) return;
  viewport.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  viewport.classList.add("dragging");
});

viewport.addEventListener("pointermove", (e) => {
  const r = viewport.getBoundingClientRect();
  const ix = (e.clientX - r.left - x) / scale;
  const iy = (e.clientY - r.top - y) / scale;
  coordLabel.textContent = ix >= 0 && iy >= 0 && ix <= imgW && iy <= imgH
    ? `x: ${Math.round(ix)}, y: ${Math.round(iy)}` : "x: –, y: –";

  if (!pointers.has(e.pointerId)) return;
  const prev = pointers.get(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (pointers.size === 1) {
    x += e.clientX - prev.x;
    y += e.clientY - prev.y;
    render();
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (lastPinch) {
      zoomAt(dist / lastPinch, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
    }
    lastPinch = dist;
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) lastPinch = 0;
  if (!pointers.size) viewport.classList.remove("dragging");
}
viewport.addEventListener("pointerup", endPointer);
viewport.addEventListener("pointercancel", endPointer);

// Double-click to zoom in
viewport.addEventListener("dblclick", (e) => {
  if (e.target.closest(".controls, .minimap")) return;
  const r = viewport.getBoundingClientRect();
  zoomAt(2, e.clientX - r.left, e.clientY - r.top);
});

// Minimap click to jump
minimap.addEventListener("click", (e) => {
  const r = minimap.getBoundingClientRect();
  const k = imgW / r.width;
  const ix = (e.clientX - r.left) * k, iy = (e.clientY - r.top) * k;
  x = viewport.clientWidth / 2 - ix * scale;
  y = viewport.clientHeight / 2 - iy * scale;
  render();
});

// Buttons
document.getElementById("zoomIn").onclick = () => zoomCenter(1.5);
document.getElementById("zoomOut").onclick = () => zoomCenter(1 / 1.5);
document.getElementById("fitBtn").onclick = fit;
document.getElementById("fullBtn").onclick = () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
};

// Keyboard
window.addEventListener("keydown", (e) => {
  const step = 80;
  switch (e.key) {
    case "+": case "=": zoomCenter(1.25); break;
    case "-": case "_": zoomCenter(1 / 1.25); break;
    case "0": fit(); break;
    case "f": case "F": document.getElementById("fullBtn").click(); break;
    case "ArrowLeft": x += step; render(); break;
    case "ArrowRight": x -= step; render(); break;
    case "ArrowUp": y += step; render(); break;
    case "ArrowDown": y -= step; render(); break;
  }
});

window.addEventListener("resize", () => {
  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  minScale = Math.min(vw / imgW, vh / imgH) * 0.95;
  if (scale < minScale) scale = minScale;
  render();
});
